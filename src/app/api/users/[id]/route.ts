import { type NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connect';
import User from '@/lib/db/models/User';
import Gamification from '@/lib/db/models/Gamification';
import { withAuth } from '@/lib/auth/rbac';
import { updateUserSchema } from '@/lib/validators/user';
import { hashPassword } from '@/lib/auth/password';
import { successResponse, errorResponse } from '@/lib/utils/apiResponse';
import { redisDel } from '@/lib/redis/client';
import { REDIS_PREFIXES } from '@/lib/constants';

// GET /api/users/[id]
export const GET = withAuth(
  async (request: NextRequest, context) => {
    try {
      await connectDB();
      const { id } = await context.params;
      const currentRole = request.headers.get('x-user-role');

      const user = await User.findById(id).populate('createdBy', 'name').lean();

      if (!user) {
        return errorResponse('User not found', 404);
      }

      // Manager cannot view admin/manager users (except their own profile)
      const currentUserId = request.headers.get('x-user-id');
      if (currentRole === 'manager' && (user.role === 'admin' || user.role === 'manager') && user._id.toString() !== currentUserId) {
        return errorResponse('Insufficient permissions', 403);
      }

      // For staff users, include gamification data
      let gamification = null;
      if (user.role === 'staff') {
        gamification = await Gamification.findOne({ user: id }).lean();
      }

      return successResponse(
        { ...user, gamification },
        'User retrieved successfully'
      );
    } catch (err) {
      console.error('[Users/GET/:id] Error:', err instanceof Error ? err.message : err);
      return errorResponse('Internal server error', 500);
    }
  },
  ['admin', 'manager']
);

// PATCH /api/users/[id]
export const PATCH = withAuth(
  async (request: NextRequest, context) => {
    try {
      const body: unknown = await request.json();
      const parsed = updateUserSchema.safeParse(body);
      if (!parsed.success) {
        const firstError = parsed.error.errors[0]?.message ?? 'Validation failed';
        return errorResponse(firstError, 400);
      }

      await connectDB();
      const { id } = await context.params;
      const currentRole = request.headers.get('x-user-role');

      const existingUser = await User.findById(id);
      if (!existingUser) {
        return errorResponse('User not found', 404);
      }

      // Manager cannot update admin/manager users
      if (currentRole === 'manager' && (existingUser.role === 'admin' || existingUser.role === 'manager')) {
        return errorResponse('Insufficient permissions', 403);
      }

      const updateData: Record<string, unknown> = { ...parsed.data };

      // If email is being changed, check for duplicates
      if (parsed.data.email && parsed.data.email !== existingUser.email) {
        const emailExists = await User.findOne({ email: parsed.data.email, _id: { $ne: id } });
        if (emailExists) {
          return errorResponse('Email already exists', 409);
        }
      }

      // If password is provided in update, hash it
      if ('password' in updateData && typeof updateData.password === 'string') {
        updateData.password = await hashPassword(updateData.password);
      }

      const updatedUser = await User.findByIdAndUpdate(id, updateData, { new: true }).lean();

      return successResponse(updatedUser, 'User updated successfully');
    } catch (err) {
      console.error('[Users/PATCH/:id] Error:', err instanceof Error ? err.message : err);
      return errorResponse('Internal server error', 500);
    }
  },
  ['admin']
);

// DELETE /api/users/[id] — hard delete
export const DELETE = withAuth(
  async (request: NextRequest, context) => {
    try {
      await connectDB();
      const { id } = await context.params;
      const currentRole = request.headers.get('x-user-role');

      const user = await User.findById(id);
      if (!user) {
        return errorResponse('User not found', 404);
      }

      // Manager cannot delete admin/manager users
      if (currentRole === 'manager' && (user.role === 'admin' || user.role === 'manager')) {
        return errorResponse('Insufficient permissions', 403);
      }

      // Hard delete user
      await User.findByIdAndDelete(id);

      // Clean up related data
      if (user.role === 'staff') {
        await Gamification.deleteMany({ user: id });
      }

      // Remove refresh token from Redis
      await redisDel(`${REDIS_PREFIXES.REFRESH_TOKEN}${id}`).catch(() => {});

      return successResponse(null, 'User deleted successfully');
    } catch (err) {
      console.error('[Users/DELETE/:id] Error:', err instanceof Error ? err.message : err);
      return errorResponse('Internal server error', 500);
    }
  },
  ['admin']
);
