import { NextResponse } from 'next/server';
import { ledger } from '@/lib/ledger';
import { runtimeManager } from '@/lib/runtimeManager';
import { AgentIntent } from '@/types';

export const runtime = 'nodejs';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const runId = searchParams.get('runId') || 'INIT';
    
    // Fetch events from the new ledger
    const events = ledger.getRecentEvents(runId, 100);

    return NextResponse.json(events);
}

export async function POST(request: Request) {
    const body: { runId: string; intent: AgentIntent } = await request.json();
    const { runId, intent } = body;

    if (!runId || !intent) {
        return NextResponse.json({ error: 'Missing runId or intent' }, { status: 400 });
    }

    // Accept intent with or without header; if missing header, create it server-side
    const fullIntent: AgentIntent = intent.header 
        ? intent 
        : {
            ...intent,
            header: {
                sessionId: runId,
                correlationId: crypto.randomUUID(),
                timestamp: Date.now()
            }
        };

    // Dispatch full intent to the runtime
    const runtime = runtimeManager.getRuntime(runId);
    runtime.dispatch(fullIntent);

    return NextResponse.json({ success: true });
}
