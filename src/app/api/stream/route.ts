import { NextRequest, NextResponse } from 'next/server';
import { runtimeManager } from '@/lib/runtimeManager';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const runId = searchParams.get('runId');

  if (!runId) {
    return NextResponse.json({ error: 'Missing runId' }, { status: 400 });
  }

  const runtime = runtimeManager.getRuntime(runId);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // 1. Subscribe to Runtime Events
      const subscription = runtime.events$.subscribe((event) => {
        const data = JSON.stringify(event);
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      });

      // 2. Heartbeat (Keep-Alive)
      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(': ping\n\n'));
      }, 15000);

      // 3. Cleanup on Close
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        subscription.unsubscribe();
        controller.close();
      });
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}