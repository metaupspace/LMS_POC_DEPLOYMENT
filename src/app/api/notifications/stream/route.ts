import { type NextRequest } from 'next/server';
import { sseManager } from '@/lib/sse/sseManager';
import { verifyAccessToken } from '@/lib/auth/jwt';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  // Try cookie first, then query param (EventSource can't send headers)
  const token =
    req.cookies.get('token')?.value ||
    req.nextUrl.searchParams.get('token');

  if (!token) {
    return new Response('Unauthorized', { status: 401 });
  }

  let userId: string;
  try {
    const decoded = verifyAccessToken(token);
    const rawId = decoded.userId || (decoded as Record<string, unknown>).id || (decoded as Record<string, unknown>)._id;
    userId = rawId ? String(rawId) : '';
    if (!userId) throw new Error('No user ID in token');
  } catch (err) {
    console.error('[SSE] Token verification failed:', err instanceof Error ? err.message : err);
    return new Response('Invalid token', { status: 401 });
  }

  console.log('[SSE] Client connecting:', userId);

  const stream = new ReadableStream({
    start(controller) {
      sseManager.addClient(userId, controller);

      // Send initial heartbeat
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(`: heartbeat\n\n`));

      // Heartbeat every 30s to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          clearInterval(heartbeat);
          sseManager.removeClient(userId, controller);
        }
      }, 30000);

      // Cleanup on disconnect
      req.signal.addEventListener('abort', () => {
        console.log('[SSE] Client disconnected:', userId);
        clearInterval(heartbeat);
        sseManager.removeClient(userId, controller);
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
