import mongoose, { Schema, type Model } from 'mongoose';
import type { ITestAttempt } from '@/types';
import { TestAttemptStatus, ViolationType } from '@/types/enums';

const testAnswerSchema = new Schema(
  {
    questionIndex: {
      type: Number,
      required: true,
    },
    selectedOption: {
      type: Number,
      default: -1,
    },
  },
  { _id: false }
);

const violationSchema = new Schema(
  {
    type: {
      type: String,
      enum: Object.values(ViolationType),
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    details: {
      type: String,
      default: '',
    },
  },
  { _id: false }
);

const testAttemptSchema = new Schema<ITestAttempt>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    test: {
      type: Schema.Types.ObjectId,
      ref: 'CertificationTest',
      required: true,
    },
    answers: [testAnswerSchema],
    score: {
      type: Number,
      default: 0,
    },
    correctCount: {
      type: Number,
      default: 0,
    },
    totalQuestions: {
      type: Number,
      required: true,
    },
    passed: {
      type: Boolean,
      default: false,
    },
    pointsEarned: {
      type: Number,
      default: 0,
    },
    totalPoints: {
      type: Number,
      default: 0,
    },
    violations: [violationSchema],
    totalViolations: {
      type: Number,
      default: 0,
    },
    startedAt: {
      type: Date,
      required: true,
    },
    submittedAt: {
      type: Date,
      default: null,
    },
    timeSpentSeconds: {
      type: Number,
      default: 0,
    },
    wasOfflineSync: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: Object.values(TestAttemptStatus),
      default: TestAttemptStatus.IN_PROGRESS,
    },
    attemptNumber: {
      type: Number,
      required: true,
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

testAttemptSchema.index({ user: 1, test: 1 });

const TestAttempt: Model<ITestAttempt> =
  mongoose.models.TestAttempt ||
  mongoose.model<ITestAttempt>('TestAttempt', testAttemptSchema);

export default TestAttempt;
