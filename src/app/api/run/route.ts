import { NextResponse } from 'next/server';
import { runtimeManager } from '@/lib/runtimeManager';
import { ledger } from '@/lib/ledger';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    let runId = searchParams.get('runId');
    let isNew = false;

    // 1. Auto-Resume Logic
    if (!runId) {
        const latest = ledger.getLatestRunId();
        if (latest) {
            runId = latest;
        } else {
            runId = `RUN-${crypto.randomUUID()}`;
            isNew = true;
        }
    }

    // 2. Load State (Snapshot)
    // Even if it's "new" in this request, it might exist in DB if passed via param.
    // So we always try to load snapshot.
    const snapshot = ledger.loadLatestSnapshot(runId!);
    
    // 3. Ensure Runtime is Active (Idempotent)
    // If the server restarted, the in-memory runtimeManager is empty.
    // We strictly use the manager to get (or re-create) the runtime instance.
    // This does NOT trigger side effects, just ensures the object exists.
    runtimeManager.getRuntime(runId!);

    if (isNew) {
        ledger.createRun(runId!);
    }

    return NextResponse.json({ 
        id: runId, 
        context: snapshot ? { 
            value: snapshot.stateValue, 
            context: snapshot.context 
        } : null,
        isResumed: !!snapshot
    });
}

export async function POST(request: Request) {
    const body = await request.json();
    const { id, context, status } = body;

    if (!id) {
        return NextResponse.json({ error: 'Missing id in body' }, { status: 400 });
    }

    // Initialize/Get runtime
    runtimeManager.getRuntime(id);
    
    // Ensure run exists in ledger
    ledger.createRun(id);

    // If the UI is explicitly saving a snapshot (persistence loop)
    if (context && status) {
        ledger.saveSnapshot(id, typeof status === 'string' ? status : JSON.stringify(status), context);
    }

    return NextResponse.json({ success: true, id });
}
