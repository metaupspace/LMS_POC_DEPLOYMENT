import mongoose, { Schema, type Model } from 'mongoose';
import type { ICertificationTest } from '@/types';
import { TestStatus } from '@/types/enums';

const testOptionSchema = new Schema(
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
      default: false,
    },
  },
  { _id: false }
);

const testQuestionSchema = new Schema(
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
      type: [testOptionSchema],
      validate: {
        validator: (opts: unknown[]) => opts.length >= 2,
        message: 'At least 2 options are required',
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

const certificationTestSchema = new Schema<ICertificationTest>(
  {
    title: {
      type: String,
      required: [true, 'Test title is required'],
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    domain: {
      type: String,
      trim: true,
      default: '',
    },
    certificationTitle: {
      type: String,
      required: [true, 'Certification title is required'],
      trim: true,
    },
    questions: {
      type: [testQuestionSchema],
      default: [],
    },
    passingScore: {
      type: Number,
      required: true,
      default: 70,
      min: 0,
      max: 100,
    },
    maxAttempts: {
      type: Number,
      default: 1,
      min: 1,
    },
    timeLimitMinutes: {
      type: Number,
      default: 60,
      min: 0,
    },
    shuffleQuestions: {
      type: Boolean,
      default: true,
    },
    shuffleOptions: {
      type: Boolean,
      default: false,
    },
    assignedStaff: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    status: {
      type: String,
      enum: Object.values(TestStatus),
      default: TestStatus.DRAFT,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
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

certificationTestSchema.index({ assignedStaff: 1 });

const CertificationTest: Model<ICertificationTest> =
  mongoose.models.CertificationTest ||
  mongoose.model<ICertificationTest>('CertificationTest', certificationTestSchema);

export default CertificationTest;
