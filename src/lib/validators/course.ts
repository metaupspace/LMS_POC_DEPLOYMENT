import { z } from 'zod';

export const createCourseSchema = z.object({
  title: z
    .string({ required_error: 'Title is required' })
    .trim()
    .min(1, 'Title is required')
    .max(200, 'Title must be at most 200 characters'),
  description: z
    .string({ required_error: 'Description is required' })
    .trim()
    .min(1, 'Description is required'),
  domain: z.string().trim().optional().default(''),
  thumbnail: z.string().optional().default(''),
  coach: z.string().optional(),
  proofOfWorkEnabled: z.boolean().optional().default(false),
  proofOfWorkInstructions: z.string().optional().default(''),
  proofOfWorkMandatory: z.boolean().optional().default(false),
  downloadAllowed: z.boolean().optional().default(true),
  passingThreshold: z.number().min(0).max(100).optional().default(70),
  status: z.enum(['draft', 'active']).optional().default('draft'),
});

export const updateCourseSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().min(1).optional(),
  domain: z.string().trim().optional(),
  thumbnail: z.string().optional(),
  status: z.enum(['draft', 'active', 'archived']).optional(),
  coach: z.string().optional(),
  proofOfWorkEnabled: z.boolean().optional(),
  proofOfWorkInstructions: z.string().optional(),
  proofOfWorkMandatory: z.boolean().optional(),
  downloadAllowed: z.boolean().optional(),
  passingThreshold: z.number().min(0).max(100).optional(),
});

export const assignCourseSchema = z.object({
  staffIds: z
    .array(z.string(), { required_error: 'Staff IDs are required' })
    .min(1, 'At least one staff member must be assigned'),
});

export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
export type AssignCourseInput = z.infer<typeof assignCourseSchema>;
