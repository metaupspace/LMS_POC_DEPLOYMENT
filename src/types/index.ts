import type { Types, Document } from 'mongoose';
import type {
  UserRole,
  UserStatus,
  CourseStatus,
  SessionStatus,
  SessionMode,
  AttendanceStatus,
  LearnerProgressStatus,
  ProofOfWorkStatus,
  ContentType,
  BadgeTier,
  NotificationType,
} from './enums';

// ─── User ────────────────────────────────────────────────

export interface IUser extends Document {
  _id: Types.ObjectId;
  empId: string;
  name: string;
  email: string;
  phone: string;
  password: string;
  role: UserRole;
  domain: string;
  location: string;
  status: UserStatus;
  profileImage: string;
  preferredLanguage: string;
  firstLogin: boolean;
  refreshToken: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  // eslint-disable-next-line no-unused-vars
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// ─── Course ──────────────────────────────────────────────

export interface IModuleContent {
  type: ContentType;
  title: string;
  data: string;
  duration: number;
  downloadable: boolean;
}

export interface ICourse extends Document {
  _id: Types.ObjectId;
  title: string;
  description: string;
  domain: string;
  thumbnail: string;
  status: CourseStatus;
  coach: Types.ObjectId;
  assignedStaff: Types.ObjectId[];
  modules: Types.ObjectId[];
  proofOfWorkEnabled: boolean;
  proofOfWorkInstructions: string;
  proofOfWorkMandatory: boolean;
  passingThreshold: number;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Module ──────────────────────────────────────────────

export interface IModule extends Document {
  _id: Types.ObjectId;
  title: string;
  description: string;
  course: Types.ObjectId;
  order: number;
  contents: IModuleContent[];
  quiz: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Quiz ────────────────────────────────────────────────

export interface IQuizOption {
  text: string;
  image: string;
  isCorrect: boolean;
}

export interface IQuizQuestion {
  questionText: string;
  questionImage: string;
  options: IQuizOption[];
  points: number;
}

export interface IQuiz extends Document {
  _id: Types.ObjectId;
  module: Types.ObjectId;
  questions: IQuizQuestion[];
  passingScore: number;
  maxAttempts: number;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Training Session ────────────────────────────────────

export interface IAttendanceRecord {
  staff: Types.ObjectId;
  markedAt: Date;
  status: AttendanceStatus;
}

export interface ITrainingSession extends Document {
  _id: Types.ObjectId;
  title: string;
  description: string;
  domain: string;
  location: string;
  date: Date;
  timeSlot: string;
  duration: number;
  thumbnail: string;
  instructor: Types.ObjectId;
  enrolledStaff: Types.ObjectId[];
  attendanceCode: string;
  attendanceCodeExpiresAt: Date;
  attendance: IAttendanceRecord[];
  mode: SessionMode;
  meetingLink: string;
  status: SessionStatus;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Learner Progress ────────────────────────────────────

export interface IQuizAttemptAnswer {
  questionIndex: number;
  selectedOption: number;
}

export interface IQuizAttempt {
  score: number;
  passed: boolean;
  answers: IQuizAttemptAnswer[];
  attemptedAt: Date;
}

export interface ILearnerProgress extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  course: Types.ObjectId;
  module: Types.ObjectId;
  status: LearnerProgressStatus;
  completedContents: number[];
  videoCompleted: boolean;
  videoPoints: number;
  quizAttempts: IQuizAttempt[];
  quizPassed: boolean;
  quizPoints: number;
  proofOfWorkPoints: number;
  totalModulePoints: number;
  completedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Proof of Work ───────────────────────────────────────

export interface IProofOfWork extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  course: Types.ObjectId;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  status: ProofOfWorkStatus;
  reviewedBy: Types.ObjectId;
  reviewNote: string;
  submittedAt: Date;
  reviewedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Gamification ────────────────────────────────────────

export interface IBadge {
  name: BadgeTier;
  threshold: number;
  earnedAt: Date;
  icon: string;
}

export interface IStreak {
  current: number;
  longest: number;
  lastActivityDate: Date;
}

export interface IGamification extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  totalPoints: number;
  badges: IBadge[];
  streak: IStreak;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Notification ────────────────────────────────────────

export interface INotification extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Re-exports ──────────────────────────────────────────

export type {
  UserRole,
  UserStatus,
  CourseStatus,
  SessionStatus,
  AttendanceStatus,
  LearnerProgressStatus,
  ProofOfWorkStatus,
  ContentType,
  BadgeTier,
  NotificationType,
} from './enums';

export type {
  ApiResponse,
  PaginatedResponse,
  PaginationMeta,
  PaginationQuery,
  JwtPayload,
  AuthenticatedRequest,
  LoginResponse,
  TokenResponse,
} from './api';
