import mongoose, { Schema, type Model } from 'mongoose';
import type { IQuiz } from '@/types';

const quizOptionSchema = new Schema(
  {
    text: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: String,
      default: '',
    },
    isCorrect: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  { _id: false }
);

const quizQuestionSchema = new Schema(
  {
    questionText: {
      type: String,
      required: true,
      trim: true,
    },
    questionImage: {
      type: String,
      default: '',
    },
    options: {
      type: [quizOptionSchema],
      validate: {
        validator: (v: unknown[]) => v.length >= 2,
        message: 'A question must have at least 2 options',
      },
    },
    points: {
      type: Number,
      default: 1,
      min: 1,
    },
  },
  { _id: false }
);

const quizSchema = new Schema<IQuiz>(
  {
    module: {
      type: Schema.Types.ObjectId,
      ref: 'Module',
      required: true,
      index: true,
    },
    questions: {
      type: [quizQuestionSchema],
      validate: {
        validator: (v: unknown[]) => v.length >= 1,
        message: 'A quiz must have at least 1 question',
      },
    },
    passingScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    maxAttempts: {
      type: Number,
      default: 3,
      min: 1,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc: unknown, ret: Record<string, unknown>) {
        ret.id = String(ret._id);
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

const Quiz: Model<IQuiz> = mongoose.models.Quiz || mongoose.model<IQuiz>('Quiz', quizSchema);

export default Quiz;
