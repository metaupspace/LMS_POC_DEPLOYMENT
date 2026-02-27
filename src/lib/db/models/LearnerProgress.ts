import mongoose, { Schema, type Model } from 'mongoose';
import type { ILearnerProgress } from '@/types';
import { LearnerProgressStatus } from '@/types/enums';

const quizAttemptAnswerSchema = new Schema(
  {
    questionIndex: {
      type: Number,
      required: true,
    },
    selectedOption: {
      type: Number,
      required: true,
    },
  },
  { _id: false }
);

const quizAttemptSchema = new Schema(
  {
    score: {
      type: Number,
      required: true,
      min: 0,
    },
    passed: {
      type: Boolean,
      required: true,
    },
    answers: [quizAttemptAnswerSchema],
    attemptedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const learnerProgressSchema = new Schema<ILearnerProgress>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    course: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    module: {
      type: Schema.Types.ObjectId,
      ref: 'Module',
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(LearnerProgressStatus),
      default: LearnerProgressStatus.NOT_STARTED,
    },
    completedContents: {
      type: [Number],
      default: [],
    },
    videoCompleted: {
      type: Boolean,
      default: false,
    },
    videoPoints: {
      type: Number,
      default: 0,
      min: 0,
      max: 30,
    },
    quizAttempts: {
      type: [quizAttemptSchema],
      default: [],
    },
    quizPassed: {
      type: Boolean,
      default: false,
    },
    quizPoints: {
      type: Number,
      default: 0,
      min: 0,
      max: 30,
    },
    proofOfWorkPoints: {
      type: Number,
      default: 0,
      min: 0,
      max: 30,
    },
    totalModulePoints: {
      type: Number,
      default: 0,
      min: 0,
      max: 90,
    },
    completedAt: {
      type: Date,
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

// Unique compound index: one progress record per user per module per course
learnerProgressSchema.index({ user: 1, course: 1, module: 1 }, { unique: true });

const LearnerProgress: Model<ILearnerProgress> =
  mongoose.models.LearnerProgress ||
  mongoose.model<ILearnerProgress>('LearnerProgress', learnerProgressSchema);

export default LearnerProgress;
