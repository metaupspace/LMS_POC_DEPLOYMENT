import { z } from 'zod';

const quizOptionSchema = z.object({
  text: z.string().trim().min(1, 'Option text is required'),
  image: z.string().optional().default(''),
  isCorrect: z.boolean(),
});

const quizQuestionSchema = z.object({
  questionText: z.string().trim().min(1, 'Question text is required'),
  questionImage: z.string().optional().default(''),
  options: z
    .array(quizOptionSchema)
    .min(2, 'At least 2 options are required')
    .max(6, 'Maximum 6 options allowed')
    .refine(
      (options) => options.some((opt) => opt.isCorrect),
      { message: 'At least one option must be marked as correct' }
    ),
  points: z.number().int().positive().optional().default(1),
});

export const createQuizSchema = z.object({
  module: z.string({ required_error: 'Module ID is required' }),
  questions: z
    .array(quizQuestionSchema)
    .min(1, 'At least one question is required'),
  passingScore: z
    .number({ required_error: 'Passing score is required' })
    .min(0, 'Passing score must be at least 0')
    .max(100, 'Passing score cannot exceed 100'),
  maxAttempts: z.number().int().positive().optional().default(3),
});

const quizAttemptAnswerSchema = z.object({
  questionIndex: z.number().int().min(0),
  selectedOption: z.number().int().min(0),
});

export const quizAttemptSchema = z.object({
  answers: z
    .array(quizAttemptAnswerSchema)
    .min(1, 'At least one answer is required'),
});

export type CreateQuizInput = z.infer<typeof createQuizSchema>;
export type QuizAttemptInput = z.infer<typeof quizAttemptSchema>;
