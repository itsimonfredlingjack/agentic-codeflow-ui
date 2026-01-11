import { NextResponse } from 'next/server';
import { runtimeManager } from '@/lib/runtimeManager';
import { AgentIntent } from '@/types';

export const runtime = 'nodejs';

export async function POST(request: Request) {
    const body = await request.json();
    const { runId, intent } = body as { runId: string, intent: AgentIntent };

    if (!runId || !intent) {
        return NextResponse.json({ error: 'Missing runId or intent' }, { status: 400 });
    }

    const runtime = runtimeManager.getRuntime(runId);
    runtime.dispatch(intent);

    return NextResponse.json({ success: true });
}