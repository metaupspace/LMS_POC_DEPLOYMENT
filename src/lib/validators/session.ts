import { z } from 'zod';

export const createSessionSchema = z.object({
  title: z
    .string({ required_error: 'Title is required' })
    .trim()
    .min(1, 'Title is required')
    .max(200, 'Title must be at most 200 characters'),
  description: z.string().trim().optional().default(''),
  domain: z.string().trim().optional().default(''),
  location: z.string().trim().optional().default(''),
  date: z.coerce.date({ required_error: 'Date is required' }),
  timeSlot: z
    .string({ required_error: 'Time slot is required' })
    .trim()
    .min(1, 'Time slot is required'),
  duration: z
    .number({ required_error: 'Duration is required' })
    .int()
    .positive('Duration must be positive'),
  mode: z.enum(['offline', 'online']).optional().default('offline'),
  meetingLink: z.string().trim().optional().default(''),
  thumbnail: z.string().optional().default(''),
  instructor: z.string({ required_error: 'Instructor is required' }),
  enrolledStaff: z.array(z.string()).optional().default([]),
});

export const updateSessionSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().optional(),
  domain: z.string().trim().optional(),
  location: z.string().trim().optional(),
  date: z.coerce.date().optional(),
  timeSlot: z.string().trim().optional(),
  duration: z.number().int().positive().optional(),
  mode: z.enum(['offline', 'online']).optional(),
  meetingLink: z.string().trim().optional(),
  thumbnail: z.string().optional(),
  instructor: z.string().optional(),
  status: z.enum(['upcoming', 'ongoing', 'completed', 'cancelled']).optional(),
  enrolledStaff: z.array(z.string()).optional(),
});

export const markAttendanceSchema = z.object({
  attendanceCode: z
    .string({ required_error: 'Attendance code is required' })
    .trim()
    .min(1, 'Attendance code is required'),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type UpdateSessionInput = z.infer<typeof updateSessionSchema>;
export type MarkAttendanceInput = z.infer<typeof markAttendanceSchema>;
