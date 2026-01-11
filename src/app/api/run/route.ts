import { NextResponse } from 'next/server';
import { runtimeManager } from '@/lib/runtimeManager';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const runId = searchParams.get('runId');

    if (!runId) {
        return NextResponse.json({ error: 'Missing runId' }, { status: 400 });
    }

    // Check if runtime exists/is active
    // For now, we just acknowledge it.
    return NextResponse.json({ id: runId, status: 'active' });
}

export async function POST(request: Request) {
    const body = await request.json();
    const { id } = body;

    if (!id) {
        return NextResponse.json({ error: 'Missing id in body' }, { status: 400 });
    }

    // Initialize the runtime for this run ID
    // This ensures the ToolRuntime instance is created (and the Subject, etc.)
    const runtime = runtimeManager.getRuntime(id);
    
    // Optional: Dispatch a system init event
    // runtime.dispatch({ type: 'INTENT_EXEC_CMD', command: 'echo "System initialized"' }); 

    return NextResponse.json({ success: true, id });
}