import { connectDB } from '@/lib/db/connect';
import { syncAllSessionStatuses } from '@/lib/utils/syncSessionStatus';

let cronStarted = false;
let intervalId: ReturnType<typeof setInterval> | null = null;
let consecutiveFailures = 0;
const MAX_FAILURES = 5;
const INTERVAL_MS = 60_000;
const BACKOFF_MS = 5 * 60_000; // 5 minutes

/**
 * Start all cron jobs. Safe to call multiple times — only starts once.
 */
export function startCronJobs(): void {
  if (cronStarted) return;
  cronStarted = true;

  console.info('[Cron] Starting cron jobs...');

  const runSessionSync = async () => {
    try {
      await connectDB();
      const result = await syncAllSessionStatuses();

      if (!result.skipped) {
        consecutiveFailures = 0;
        if (result.updated > 0) {
          console.info(
            `[Cron] Session status sync: ${result.updated}/${result.checked} updated`
          );
        }
      }
    } catch (err) {
      consecutiveFailures++;
      console.error(
        `[Cron] Session sync failed (${consecutiveFailures}/${MAX_FAILURES}):`,
        err instanceof Error ? err.message : err
      );

      // Too many consecutive failures — back off to avoid flooding logs
      if (consecutiveFailures >= MAX_FAILURES) {
        console.error('[Cron] Too many failures, backing off for 5 minutes');
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
        setTimeout(() => {
          consecutiveFailures = 0;
          intervalId = setInterval(runSessionSync, INTERVAL_MS);
          console.info('[Cron] Resumed after backoff');
        }, BACKOFF_MS);
      }
    }
  };

  // Session status sync — every 60 seconds
  intervalId = setInterval(runSessionSync, INTERVAL_MS);

  // Run immediately on startup (5s delay for DB/Redis to be ready)
  setTimeout(runSessionSync, 5_000);

  console.info('[Cron] Session status sync: every 60s');
}

/**
 * Stop all cron jobs (for graceful shutdown).
 */
export function stopCronJobs(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  cronStarted = false;
  console.info('[Cron] Cron jobs stopped');
}
