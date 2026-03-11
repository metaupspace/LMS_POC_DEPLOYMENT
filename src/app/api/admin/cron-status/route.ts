import { redisGet } from '@/lib/redis/client';
import { withAuth } from '@/lib/auth/rbac';
import { successResponse } from '@/lib/utils/apiResponse';

export const GET = withAuth(async () => {
  const lastRun = await redisGet<{
    timestamp: string;
    checked: number;
    updated: number;
  }>('cron:session-sync:last-run');

  const isLocked = await redisGet<string>('cron:session-sync:lock');

  return successResponse({
    sessionSync: {
      lastRun: lastRun ?? 'Never',
      isRunning: !!isLocked,
      healthy: lastRun
        ? Date.now() - new Date(lastRun.timestamp).getTime() < 120_000
        : false,
    },
  });
}, ['admin']);
