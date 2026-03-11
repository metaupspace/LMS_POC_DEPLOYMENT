import TrainingSession from '@/lib/db/models/TrainingSession';
import { redisGet, redisSet, redisDel } from '@/lib/redis/client';
import type { SessionStatus } from '@/types/enums';

const LOCK_KEY = 'cron:session-sync:lock';
const LOCK_TTL = 55; // seconds — less than 60s interval to prevent overlap
const LAST_RUN_KEY = 'cron:session-sync:last-run';

/**
 * Compute the correct status for a session based on current time.
 * Mirrors the frontend getDisplayStatus() logic exactly.
 */
export function computeSessionStatus(session: {
  date: string | Date;
  timeSlot: string;
  duration?: number;
  status?: string;
}): 'upcoming' | 'ongoing' | 'completed' | 'cancelled' {
  if (session.status === 'cancelled') return 'cancelled';

  const sessionDate = new Date(session.date);
  const parts = (session.timeSlot || '00:00').split(':');
  const hours = Number(parts[0]);
  const mins = Number(parts[1]);

  if (!isNaN(hours) && !isNaN(mins)) {
    sessionDate.setHours(hours, mins, 0, 0);
  }

  const now = Date.now();
  const startTime = sessionDate.getTime();
  const endTime = startTime + (session.duration || 30) * 60 * 1000;

  if (now >= endTime) return 'completed';
  if (now >= startTime) return 'ongoing';
  return 'upcoming';
}

/**
 * Bulk sync: update all sessions whose stored status is stale.
 * Uses a Redis distributed lock to prevent duplicate execution across instances.
 * Falls back to lockless execution if Redis is unavailable.
 */
export async function syncAllSessionStatuses(): Promise<{
  updated: number;
  checked: number;
  skipped: boolean;
}> {
  let lockAcquired = false;

  try {
    // Attempt distributed lock — prevents duplicate execution across instances
    const existingLock = await redisGet<string>(LOCK_KEY);
    if (existingLock) {
      return { updated: 0, checked: 0, skipped: true };
    }
    await redisSet(LOCK_KEY, `running:${Date.now()}`, LOCK_TTL);
    lockAcquired = true;
  } catch {
    // Redis unavailable — proceed without lock (single-instance fallback)
  }

  try {
    const sessions = await TrainingSession.find({
      status: { $in: ['upcoming', 'ongoing'] },
    })
      .select('date timeSlot duration status')
      .lean();

    let updated = 0;
    const bulkOps: {
      updateOne: { filter: { _id: unknown }; update: { $set: { status: SessionStatus } } };
    }[] = [];

    for (const session of sessions) {
      const computed = computeSessionStatus(session);
      if (session.status !== computed) {
        bulkOps.push({
          updateOne: {
            filter: { _id: session._id },
            update: { $set: { status: computed } },
          },
        });
        updated++;
      }
    }

    // Bulk update — single DB call instead of N calls
    if (bulkOps.length > 0) {
      await TrainingSession.bulkWrite(bulkOps);
    }

    // Track last successful run in Redis
    try {
      await redisSet(
        LAST_RUN_KEY,
        { timestamp: new Date().toISOString(), checked: sessions.length, updated },
        3600
      );
    } catch {
      // Non-critical — skip if Redis unavailable
    }

    return { updated, checked: sessions.length, skipped: false };
  } catch (err) {
    // Release lock on error so next run can retry
    if (lockAcquired) {
      try {
        await redisDel(LOCK_KEY);
      } catch {
        // Lock will auto-expire via TTL
      }
    }
    throw err;
  }
}

/**
 * Sync status for a single session. Returns the computed status.
 */
export async function syncSessionStatus(session: {
  _id: unknown;
  date: string | Date;
  timeSlot: string;
  duration?: number;
  status?: string;
}): Promise<string> {
  const computed = computeSessionStatus(session);

  if (session.status !== computed) {
    await TrainingSession.findByIdAndUpdate(session._id, { status: computed });
  }

  return computed;
}
