import mongoose, { Schema, type Model } from 'mongoose';
import type { IModule } from '@/types';
import { ContentType } from '@/types/enums';

const moduleContentSchema = new Schema(
  {
    type: {
      type: String,
      enum: Object.values(ContentType),
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    data: {
      type: String,
      required: true,
    },
    duration: {
      type: Number,
      default: 0,
      min: 0,
    },
    downloadable: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const moduleSchema = new Schema<IModule>(
  {
    title: {
      type: String,
      required: [true, 'Module title is required'],
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    course: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    order: {
      type: Number,
      required: true,
      min: 0,
    },
    contents: [moduleContentSchema],
    quiz: {
      type: Schema.Types.ObjectId,
      ref: 'Quiz',
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

const Module: Model<IModule> =
  mongoose.models.Module || mongoose.model<IModule>('Module', moduleSchema);

export default Module;
