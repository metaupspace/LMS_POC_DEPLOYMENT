import mongoose, { Schema, type Model } from 'mongoose';
import type { IProofOfWork } from '@/types';
import { ProofOfWorkStatus } from '@/types/enums';

const proofOfWorkSchema = new Schema<IProofOfWork>(
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
      index: true,
    },
    fileUrl: {
      type: String,
      required: [true, 'File URL is required'],
    },
    fileType: {
      type: String,
      required: [true, 'File type is required'],
    },
    fileSize: {
      type: Number,
      required: [true, 'File size is required'],
      min: 0,
    },
    status: {
      type: String,
      enum: Object.values(ProofOfWorkStatus),
      default: ProofOfWorkStatus.SUBMITTED,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewNote: {
      type: String,
      default: '',
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    reviewedAt: {
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

const ProofOfWork: Model<IProofOfWork> =
  mongoose.models.ProofOfWork ||
  mongoose.model<IProofOfWork>('ProofOfWork', proofOfWorkSchema);

export default ProofOfWork;
