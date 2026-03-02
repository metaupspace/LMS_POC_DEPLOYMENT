import { connectDB } from '@/lib/db/connect';
import Gamification from '@/lib/db/models/Gamification';

/**
 * Update the daily activity streak for a user.
 * - Same-day calls are deduplicated (no double-counting).
 * - Consecutive days increment the streak; gaps reset to 1.
 * - Uses `markModified('streak')` so Mongoose detects nested changes.
 */
export async function updateStreak(userId: string): Promise<void> {
  if (!userId) return;

  try {
    await connectDB();

    let gam = await Gamification.findOne({ user: userId });

    if (!gam) {
      await Gamification.create({
        user: userId,
        totalPoints: 0,
        badges: [],
        streak: { current: 1, longest: 1, lastActivityDate: new Date() },
      });
      return;
    }

    // Normalize streak if somehow missing/corrupt
    if (!gam.streak || typeof gam.streak !== 'object') {
      gam.streak = { current: 0, longest: 0, lastActivityDate: new Date(0) };
    }

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const lastDate = gam.streak.lastActivityDate
      ? new Date(gam.streak.lastActivityDate)
      : null;
    const lastStr = lastDate ? lastDate.toISOString().split('T')[0] : null;

    // Already counted today — skip
    if (lastStr === todayStr) return;

    // Calculate yesterday's date string
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (lastStr === yesterdayStr) {
      // Consecutive day — increment
      gam.streak.current = (gam.streak.current || 0) + 1;
    } else {
      // Gap or first activity — reset to 1
      gam.streak.current = 1;
    }

    if (gam.streak.current > (gam.streak.longest || 0)) {
      gam.streak.longest = gam.streak.current;
    }

    gam.streak.lastActivityDate = now;

    // CRITICAL: Mongoose doesn't always detect nested sub-document changes
    gam.markModified('streak');
    await gam.save();
  } catch (err) {
    // Non-fatal — don't crash the parent request
    console.error('[updateStreak] Error:', err instanceof Error ? err.message : err);
  }
}
