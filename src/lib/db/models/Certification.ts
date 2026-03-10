import mongoose, { Schema, type Model } from 'mongoose';
import type { ICertification } from '@/types';

const certificationSchema = new Schema<ICertification>(
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
    title: {
      type: String,
      required: true,
    },
    earnedAt: {
      type: Date,
      default: Date.now,
    },
    score: {
      type: Number,
      required: true,
    },
    attemptId: {
      type: Schema.Types.ObjectId,
      ref: 'TestAttempt',
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

certificationSchema.index({ user: 1, test: 1 }, { unique: true });

const Certification: Model<ICertification> =
  mongoose.models.Certification ||
  mongoose.model<ICertification>('Certification', certificationSchema);

export default Certification;
