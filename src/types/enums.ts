export const UserRole = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  COACH: 'coach',
  STAFF: 'staff',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const UserStatus = {
  ACTIVE: 'active',
  OFFBOARDED: 'offboarded',
} as const;

export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export const CourseStatus = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  ARCHIVED: 'archived',
} as const;

export type CourseStatus = (typeof CourseStatus)[keyof typeof CourseStatus];

export const SessionStatus = {
  UPCOMING: 'upcoming',
  ONGOING: 'ongoing',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export type SessionStatus = (typeof SessionStatus)[keyof typeof SessionStatus];

export const SessionMode = {
  OFFLINE: 'offline',
  ONLINE: 'online',
} as const;

export type SessionMode = (typeof SessionMode)[keyof typeof SessionMode];

export const AttendanceStatus = {
  PRESENT: 'present',
  ABSENT: 'absent',
} as const;

export type AttendanceStatus = (typeof AttendanceStatus)[keyof typeof AttendanceStatus];

export const LearnerProgressStatus = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
} as const;

export type LearnerProgressStatus =
  (typeof LearnerProgressStatus)[keyof typeof LearnerProgressStatus];

export const ProofOfWorkStatus = {
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  REDO_REQUESTED: 'redo_requested',
} as const;

export type ProofOfWorkStatus = (typeof ProofOfWorkStatus)[keyof typeof ProofOfWorkStatus];

export const ContentType = {
  VIDEO: 'video',
  TEXT: 'text',
} as const;

export type ContentType = (typeof ContentType)[keyof typeof ContentType];

export const BadgeTier = {
  ROOKIE: 'rookie',
  SILVER: 'silver',
  GOLD: 'gold',
  PREMIUM: 'premium',
} as const;

export type BadgeTier = (typeof BadgeTier)[keyof typeof BadgeTier];

export const NotificationType = {
  ASSIGNMENT: 'assignment',
  SESSION_REMINDER: 'session_reminder',
  PROOF_UPDATE: 'proof_update',
  PROOF_SUBMITTED: 'proof_submitted',
  PROOF_APPROVED: 'proof_approved',
  PROOF_REJECTED: 'proof_rejected',
  BADGE_EARNED: 'badge_earned',
  STREAK: 'streak',
  GENERAL: 'general',
} as const;

export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];
