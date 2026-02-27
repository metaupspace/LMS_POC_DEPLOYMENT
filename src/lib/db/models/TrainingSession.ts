import mongoose, { Schema, type Model } from 'mongoose';
import type { ITrainingSession } from '@/types';
import { SessionStatus, AttendanceStatus } from '@/types/enums';

const attendanceRecordSchema = new Schema(
  {
    staff: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    markedAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: Object.values(AttendanceStatus),
      required: true,
    },
  },
  { _id: false }
);

const trainingSessionSchema = new Schema<ITrainingSession>(
  {
    title: {
      type: String,
      required: [true, 'Session title is required'],
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
    location: {
      type: String,
      trim: true,
      default: '',
    },
    date: {
      type: Date,
      required: [true, 'Session date is required'],
      index: true,
    },
    timeSlot: {
      type: String,
      required: [true, 'Time slot is required'],
      trim: true,
    },
    duration: {
      type: Number,
      required: [true, 'Duration is required'],
      min: 1,
    },
    thumbnail: {
      type: String,
      default: '',
    },
    instructor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    enrolledStaff: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    attendanceCode: {
      type: String,
      default: '',
    },
    attendanceCodeExpiresAt: {
      type: Date,
    },
    attendance: [attendanceRecordSchema],
    status: {
      type: String,
      enum: Object.values(SessionStatus),
      default: SessionStatus.UPCOMING,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
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

const TrainingSession: Model<ITrainingSession> =
  mongoose.models.TrainingSession ||
  mongoose.model<ITrainingSession>('TrainingSession', trainingSessionSchema);

export default TrainingSession;
