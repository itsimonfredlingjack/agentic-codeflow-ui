import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { AgentEvent } from '@/types';
import { checkCommand } from '@/lib/sentinel';

export async function GET(request: Request) {
    const events = db.prepare('SELECT * FROM events ORDER BY timestamp DESC LIMIT 50').all();

    const formattedEvents = events.map((e: any) => ({
        id: e.id,
        runId: e.run_id,
        type: e.type,
        title: e.title,
        content: e.content,
        timestamp: e.timestamp,
        phase: e.phase,
        agentId: e.agent_id,
        severity: e.severity
    })).reverse();

    return NextResponse.json(formattedEvents);
}

export async function POST(request: Request) {
    const body: AgentEvent = await request.json();

    // --- SENTINEL SECURITY CHECK ---
    if (body.type === 'command') {
        const policy = checkCommand(body.content);
        if (!policy.allowed) {
            // Log the VIOLATION instead of the command
            const violationStmt = db.prepare(`
                INSERT INTO events (id, run_id, type, title, content, timestamp, phase, agent_id, severity)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            violationStmt.run(
                body.id + '-violation',
                body.runId,
                'error',
                'SECURITY INTERCEPTION',
                policy.reason,
                new Date().toLocaleTimeString(),
                body.phase,
                'SENTINEL-01',
                'error'
            );

            return NextResponse.json({ success: false, error: policy.reason }, { status: 403 });
        }
    }
    // -------------------------------

    const stmt = db.prepare(`
        INSERT INTO events (id, run_id, type, title, content, timestamp, phase, agent_id, severity)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
        body.id,
        body.runId,
        body.type,
        body.title,
        body.content,
        body.timestamp,
        body.phase,
        body.agentId,
        body.severity
    );

    return NextResponse.json({ success: true });
}
