import { BadgeTier } from '@/types/enums';

export const BADGE_TIERS = [
  { name: BadgeTier.ROOKIE, threshold: 1000, icon: '\u{1F949}' },
  { name: BadgeTier.SILVER, threshold: 2000, icon: '\u{1F948}' },
  { name: BadgeTier.GOLD, threshold: 3000, icon: '\u{1F947}' },
  { name: BadgeTier.PREMIUM, threshold: 5000, icon: '\u{1F48E}' },
] as const;

export const POINTS = {
  VIDEO_COMPLETION: 30,
  QUIZ_PASS: 30,
  PROOF_OF_WORK_APPROVED: 30,
  MODULE_COMPLETION_MIN: 60,
  SESSION_ATTENDANCE: 30,
} as const;

export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  COACH: 'coach',
  STAFF: 'staff',
} as const;

export const USER_STATUSES = {
  ACTIVE: 'active',
  OFFBOARDED: 'offboarded',
} as const;

export const COURSE_STATUSES = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  ARCHIVED: 'archived',
} as const;

export const SESSION_STATUSES = {
  UPCOMING: 'upcoming',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export const QUEUE_NAMES = {
  EMAIL: 'email_queue',
  NOTIFICATION: 'notification_queue',
} as const;

export const REDIS_PREFIXES = {
  REFRESH_TOKEN: 'refresh:',
  SESSION: 'session:',
  USER_CACHE: 'user:',
} as const;

export const REDIS_TTL = {
  REFRESH_TOKEN: 7 * 24 * 60 * 60, // 7 days in seconds
  SESSION: 15 * 60, // 15 minutes
  USER_CACHE: 60 * 60, // 1 hour
} as const;

export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  LIMIT: 10,
  MAX_LIMIT: 100,
} as const;
