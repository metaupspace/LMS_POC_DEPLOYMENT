import mongoose, { Schema, type Model } from 'mongoose';
import type { IGamification } from '@/types';
import { BadgeTier } from '@/types/enums';

const badgeSchema = new Schema(
  {
    name: {
      type: String,
      enum: Object.values(BadgeTier),
      required: true,
    },
    threshold: {
      type: Number,
      required: true,
    },
    earnedAt: {
      type: Date,
      default: Date.now,
    },
    icon: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

const streakSchema = new Schema(
  {
    current: {
      type: Number,
      default: 0,
      min: 0,
    },
    longest: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastActivityDate: {
      type: Date,
    },
  },
  { _id: false }
);

const gamificationSchema = new Schema<IGamification>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    totalPoints: {
      type: Number,
      default: 0,
      min: 0,
    },
    badges: {
      type: [badgeSchema],
      default: [],
    },
    streak: {
      type: streakSchema,
      default: () => ({ current: 0, longest: 0 }),
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

const Gamification: Model<IGamification> =
  mongoose.models.Gamification ||
  mongoose.model<IGamification>('Gamification', gamificationSchema);

export default Gamification;
