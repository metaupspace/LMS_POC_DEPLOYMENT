import { z } from 'zod';
import { UserRole, UserStatus } from '@/types/enums';

export const createUserSchema = z.object({
  empId: z
    .string({ required_error: 'Employee ID is required' })
    .trim()
    .min(1, 'Employee ID is required'),
  name: z
    .string({ required_error: 'Name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be at most 100 characters'),
  email: z
    .string({ required_error: 'Email is required' })
    .email('Invalid email address')
    .toLowerCase(),
  phone: z.string().trim().optional().default(''),
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters'),
  role: z.enum(
    [UserRole.ADMIN, UserRole.MANAGER, UserRole.COACH, UserRole.STAFF],
    { required_error: 'Role is required' }
  ),
  domain: z.string().trim().optional().default(''),
  location: z.string().trim().optional().default(''),
  preferredLanguage: z.string().optional().default('en'),
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  email: z.string().email('Invalid email address').toLowerCase().optional(),
  phone: z.string().trim().optional(),
  role: z
    .enum([UserRole.ADMIN, UserRole.MANAGER, UserRole.COACH, UserRole.STAFF])
    .optional(),
  domain: z.string().trim().optional(),
  location: z.string().trim().optional(),
  status: z
    .enum([UserStatus.ACTIVE, UserStatus.OFFBOARDED])
    .optional(),
  preferredLanguage: z.string().optional(),
  profileImage: z.string().optional(),
});

export const searchUserSchema = z.object({
  search: z.string().trim().optional(),
  role: z
    .enum([UserRole.ADMIN, UserRole.MANAGER, UserRole.COACH, UserRole.STAFF])
    .optional(),
  status: z
    .enum([UserStatus.ACTIVE, UserStatus.OFFBOARDED])
    .optional(),
  domain: z.string().trim().optional(),
  location: z.string().trim().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type SearchUserInput = z.infer<typeof searchUserSchema>;
