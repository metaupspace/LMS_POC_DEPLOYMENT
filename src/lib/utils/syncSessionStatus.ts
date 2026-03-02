import TrainingSession from '@/lib/db/models/TrainingSession';

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
 * Only checks non-terminal statuses (upcoming, ongoing).
 */
export async function syncAllSessionStatuses(): Promise<number> {
  const sessions = await TrainingSession.find({
    status: { $in: ['upcoming', 'ongoing'] },
  })
    .select('date timeSlot duration status')
    .lean();

  let updatedCount = 0;

  for (const session of sessions) {
    const computed = computeSessionStatus(session);
    if (session.status !== computed) {
      await TrainingSession.findByIdAndUpdate(session._id, { status: computed });
      updatedCount++;
    }
  }

  return updatedCount;
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
