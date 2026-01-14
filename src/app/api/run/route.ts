import { NextResponse } from 'next/server';
import { runtimeManager } from '@/lib/runtimeManager';
import { ledger } from '@/lib/ledger';

export const runtime = 'nodejs';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);

    // List sessions endpoint
    if (searchParams.get('list') === 'true') {
        const limit = parseInt(searchParams.get('limit') || '10', 10);
        const sessions = ledger.listRuns(limit);
        return NextResponse.json({ sessions });
    }

    let runId = searchParams.get('runId');
    let isNew = false;

    // Fresh session by default (no auto-resume)
    // Only resume if explicit runId is provided
    if (!runId) {
        runId = `RUN-${crypto.randomUUID()}`;
        isNew = true;
    }

    // Load State (Snapshot) - only if resuming existing session
    const snapshot = runId && !isNew ? ledger.loadLatestSnapshot(runId) : null;

    // Ensure Runtime is Active (Idempotent)
    runtimeManager.getRuntime(runId!);

    if (isNew) {
        ledger.createRun(runId!);
    }

    return NextResponse.json({
        id: runId,
        snapshot: snapshot ? snapshot.context : null,
        isResumed: !!snapshot
    });
}

export async function POST(request: Request) {
    const body = await request.json();
    const { id, snapshot, context, status } = body;

    if (!id) {
        return NextResponse.json({ error: 'Missing id in body' }, { status: 400 });
    }

    // Initialize/Get runtime
    runtimeManager.getRuntime(id);
    
    // Ensure run exists in ledger
    ledger.createRun(id);

    // If the UI is explicitly saving a snapshot (persistence loop)
    const snapshotPayload = snapshot ?? context;
    if (snapshotPayload && status) {
        ledger.saveSnapshot(
            id,
            typeof status === 'string' ? status : JSON.stringify(status),
            snapshotPayload
        );
    }

    return NextResponse.json({ success: true, id });
}
