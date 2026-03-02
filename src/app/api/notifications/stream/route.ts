import { type NextRequest } from 'next/server';
import { sseManager } from '@/lib/sse/sseManager';
import { verifyAccessToken } from '@/lib/auth/jwt';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  // Authenticate from query param
  const token = req.nextUrl.searchParams.get('token');

  if (!token) {
    return new Response('Unauthorized', { status: 401 });
  }

  let userId: string;
  try {
    const decoded = verifyAccessToken(token);
    userId = decoded.userId;
  } catch {
    return new Response('Invalid token', { status: 401 });
  }

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
