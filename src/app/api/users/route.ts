import { type NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connect';
import User from '@/lib/db/models/User';
import Gamification from '@/lib/db/models/Gamification';
import { withAuth } from '@/lib/auth/rbac';
import { createUserSchema } from '@/lib/validators/user';
import { successResponse, errorResponse, paginatedResponse } from '@/lib/utils/apiResponse';
import { getPaginationParams, buildPaginationMeta } from '@/lib/utils/pagination';
import { publishToQueue } from '@/lib/rabbitmq/producer';
import { QUEUE_NAMES } from '@/lib/rabbitmq/connection';
import type { FilterQuery } from 'mongoose';
import type { IUser } from '@/types';

// GET /api/users
export const GET = withAuth(
  async (request: NextRequest) => {
    try {
      await connectDB();

      const { searchParams } = new URL(request.url);
      const { page, limit, search, sortBy, sortOrder } = getPaginationParams(searchParams);
      const role = request.headers.get('x-user-role');

      const filter: FilterQuery<IUser> = {};

      // Manager can only see coaches and staff
      if (role === 'manager') {
        filter.role = { $in: ['coach', 'staff'] };
      }

      // Apply role filter from query
      const roleFilter = searchParams.get('role');
      if (roleFilter) {
        if (role === 'manager' && (roleFilter === 'admin' || roleFilter === 'manager')) {
          return errorResponse('Insufficient permissions to view this role', 403);
        }
        filter.role = roleFilter;
      }

      // Apply status filter
      const statusFilter = searchParams.get('status');
      if (statusFilter) {
        filter.status = statusFilter;
      }

      // Apply search
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { empId: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ];
      }

      const sortField = sortBy ?? 'createdAt';
      const sortDir = sortOrder === 'asc' ? 1 : -1;
      const skip = (page - 1) * limit;

      const [users, total] = await Promise.all([
        User.find(filter)
          .populate('createdBy', 'name')
          .sort({ [sortField]: sortDir })
          .skip(skip)
          .limit(limit)
          .lean(),
        User.countDocuments(filter),
      ]);

      const pagination = buildPaginationMeta(total, page, limit);
      return paginatedResponse(users, pagination, 'Users retrieved successfully');
    } catch (err) {
      console.error('[Users/GET] Error:', err instanceof Error ? err.message : err);
      return errorResponse('Internal server error', 500);
    }
  },
  ['admin', 'manager']
);

// POST /api/users
export const POST = withAuth(
  async (request: NextRequest) => {
    try {
      const body: unknown = await request.json();

      const parsed = createUserSchema.safeParse(body);
      if (!parsed.success) {
        const firstError = parsed.error.errors[0]?.message ?? 'Validation failed';
        return errorResponse(firstError, 400);
      }

      const data = parsed.data;
      const currentRole = request.headers.get('x-user-role');
      const currentUserId = request.headers.get('x-user-id');

      // Manager cannot create admin or manager users
      if (currentRole === 'manager' && (data.role === 'admin' || data.role === 'manager')) {
        return errorResponse('Managers can only create coach and staff users', 403);
      }

      await connectDB();

      // Check for duplicate empId or email
      const existing = await User.findOne({
        $or: [{ empId: data.empId }, { email: data.email }],
      });
      if (existing) {
        const field = existing.empId === data.empId ? 'Employee ID' : 'Email';
        return errorResponse(`${field} already exists`, 409);
      }

      const user = await User.create({
        ...data,
        createdBy: currentUserId,
      });

      // Create Gamification record for staff users
      if (data.role === 'staff') {
        await Gamification.create({
          user: user._id,
          totalPoints: 0,
          badges: [],
          streak: { current: 0, longest: 0 },
        });
      }

      // Publish welcome notification
      await publishToQueue(QUEUE_NAMES.NOTIFICATION, {
        type: 'welcome',
        payload: {
          userId: user._id.toString(),
          name: user.name,
          role: user.role,
        },
        timestamp: new Date().toISOString(),
      }).catch((err) => {
        console.error('[Users/POST] Failed to publish notification:', err);
      });

      return successResponse(user.toJSON(), 'User created successfully', 201);
    } catch (err) {
      console.error('[Users/POST] Error:', err instanceof Error ? err.message : err);
      return errorResponse('Internal server error', 500);
    }
  },
  ['admin']
);
