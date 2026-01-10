import { NextResponse } from 'next/server';
import db from '@/lib/db';

interface RunRow {
    id: string;
    start_time: string;
    context: string;
    status: string;
}

export async function GET() {
    // Get the most recent run
    const run = db.prepare('SELECT * FROM runs ORDER BY start_time DESC LIMIT 1').get() as RunRow | undefined;

    if (!run) {
        return NextResponse.json(null);
    }

    return NextResponse.json({
        id: run.id,
        context: JSON.parse(run.context),
        status: run.status,
        startTime: run.start_time
    });
}

export async function POST(request: Request) {
    const body = await request.json();
    const { id, context, status } = body;

    const stmt = db.prepare(`
        INSERT INTO runs (id, start_time, context, status)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            context = excluded.context,
            status = excluded.status
    `);

    stmt.run(
        id,
        new Date().toISOString(),
        JSON.stringify(context),
        status
    );

    return NextResponse.json({ success: true });
}
