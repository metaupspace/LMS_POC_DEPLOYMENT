import { z } from 'zod';

const testOptionSchema = z.object({
  text: z.string().trim().min(1, 'Option text is required'),
  image: z.string().optional().default(''),
  isCorrect: z.boolean(),
});

const testQuestionSchema = z.object({
  questionText: z.string().trim().min(1, 'Question text is required'),
  questionImage: z.string().optional().default(''),
  options: z
    .array(testOptionSchema)
    .min(2, 'At least 2 options are required')
    .max(6, 'Maximum 6 options allowed')
    .refine(
      (options) => options.some((opt) => opt.isCorrect),
      { message: 'At least one option must be marked as correct' }
    ),
  points: z.number().int().positive().optional().default(1),
});

export const createTestSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  description: z.string().trim().optional().default(''),
  domain: z.string().trim().optional().default(''),
  certificationTitle: z.string().trim().min(1, 'Certification title is required'),
  questions: z.array(testQuestionSchema).min(1, 'At least one question is required'),
  passingScore: z
    .number()
    .min(0, 'Passing score must be at least 0')
    .max(100, 'Passing score cannot exceed 100')
    .optional()
    .default(70),
  maxAttempts: z.number().int().positive().optional().default(1),
  timeLimitMinutes: z.number().int().min(0).optional().default(60),
  shuffleQuestions: z.boolean().optional().default(true),
  shuffleOptions: z.boolean().optional().default(false),
  status: z.enum(['draft', 'active', 'archived']).optional().default('draft'),
});

export const updateTestSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().optional(),
  domain: z.string().trim().optional(),
  certificationTitle: z.string().trim().min(1).optional(),
  questions: z.array(testQuestionSchema).min(1).optional(),
  passingScore: z.number().min(0).max(100).optional(),
  maxAttempts: z.number().int().positive().optional(),
  timeLimitMinutes: z.number().int().min(0).optional(),
  shuffleQuestions: z.boolean().optional(),
  shuffleOptions: z.boolean().optional(),
  status: z.enum(['draft', 'active', 'archived']).optional(),
});

export const assignTestSchema = z.object({
  staffIds: z.array(z.string()).min(1, 'At least one staff ID is required'),
});

const testAttemptAnswerSchema = z.object({
  questionIndex: z.number().int().min(0),
  selectedOption: z.number().int().min(-1),
});

export const submitTestSchema = z.object({
  attemptId: z.string({ required_error: 'Attempt ID is required' }),
  answers: z.array(testAttemptAnswerSchema),
  violations: z
    .array(
      z.object({
        type: z.enum(['tab_switch', 'minimize', 'copy_paste', 'screenshot', 'devtools', 'other']),
        details: z.string().optional().default(''),
        timestamp: z.string().optional(),
      })
    )
    .optional()
    .default([]),
  timeSpentSeconds: z.number().int().min(0).optional().default(0),
  wasOfflineSync: z.boolean().optional().default(false),
});

export const reportViolationSchema = z.object({
  attemptId: z.string({ required_error: 'Attempt ID is required' }),
  type: z.enum(['tab_switch', 'minimize', 'copy_paste', 'screenshot', 'devtools', 'other']),
  details: z.string().optional().default(''),
});

export type CreateTestInput = z.infer<typeof createTestSchema>;
export type UpdateTestInput = z.infer<typeof updateTestSchema>;
export type SubmitTestInput = z.infer<typeof submitTestSchema>;
