import mongoose, { Schema, type Model } from 'mongoose';
import type { ICourse } from '@/types';
import { CourseStatus } from '@/types/enums';

const courseSchema = new Schema<ICourse>(
  {
    title: {
      type: String,
      required: [true, 'Course title is required'],
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: [true, 'Course description is required'],
      trim: true,
    },
    domain: {
      type: String,
      trim: true,
      default: '',
    },
    thumbnail: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: Object.values(CourseStatus),
      default: CourseStatus.DRAFT,
      index: true,
    },
    coach: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    assignedStaff: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    modules: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Module',
      },
    ],
    proofOfWorkEnabled: {
      type: Boolean,
      default: false,
    },
    proofOfWorkInstructions: {
      type: String,
      default: '',
    },
    proofOfWorkMandatory: {
      type: Boolean,
      default: false,
    },
    passingThreshold: {
      type: Number,
      default: 70,
      min: 0,
      max: 100,
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

const Course: Model<ICourse> =
  mongoose.models.Course || mongoose.model<ICourse>('Course', courseSchema);

export default Course;
