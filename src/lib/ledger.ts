// src/lib/ledger.ts
import { createRequire } from 'node:module';
import { RuntimeEvent } from '@/types';

interface InMemoryEvent {
  runId: string;
  type: string;
  payload: RuntimeEvent;
  timestamp: number;
}

interface InMemorySnapshot {
  runId: string;
  stateValue: string;
  context: unknown;
  timestamp: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BetterSqlite3Database = any; // Dynamic require prevents proper typing

class TaskLedger {
  private db: BetterSqlite3Database;
  private useInMemory: boolean;
  private events: InMemoryEvent[] = [];
  private snapshots: InMemorySnapshot[] = [];
  private runs: Map<string, number> = new Map();

  constructor() {
    this.useInMemory = false;
    try {
      const require = createRequire(import.meta.url);
      const Database = require('better-sqlite3');
      this.db = new Database('task_ledger.db');
      this.db.pragma('journal_mode = WAL'); 
      this.init();
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn('better-sqlite3 not available, using in-memory fallback:', msg);
      this.useInMemory = true;
      console.log('Running in in-memory mode - data will be lost on restart');
    }
  }

  private init() {
    if (this.useInMemory) {
      return; // In-memory mode doesn't need initialization
    }
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS runs (
        id TEXT PRIMARY KEY,
        created_at INTEGER DEFAULT (unixepoch())
      );
      
      CREATE TABLE IF NOT EXISTS event_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        run_id TEXT,
        type TEXT,
        payload JSON,
        timestamp INTEGER,
        FOREIGN KEY(run_id) REFERENCES runs(id)
      );

      CREATE TABLE IF NOT EXISTS snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        run_id TEXT,
        state_value TEXT,
        context JSON,
        timestamp INTEGER
      );
    `);

    const runColumns = this.db.prepare('PRAGMA table_info(runs)').all() as { name: string }[];
    const hasCreatedAt = runColumns.some(column => column.name === 'created_at');
    if (!hasCreatedAt) {
      this.db.exec('ALTER TABLE runs ADD COLUMN created_at INTEGER');
      this.db.exec('UPDATE runs SET created_at = unixepoch() WHERE created_at IS NULL');
    }
  }

  public appendEvent(runId: string, event: RuntimeEvent) {
    if (this.useInMemory) {
      this.events.push({
        runId,
        type: event.type,
        payload: event,
        timestamp: Date.now()
      });
      return;
    }
    const stmt = this.db.prepare(
      'INSERT INTO event_log (run_id, type, payload, timestamp) VALUES (?, ?, ?, ?)'
    );
    stmt.run(runId, event.type, JSON.stringify(event), Date.now());
  }

  public saveSnapshot(runId: string, stateValue: string, context: unknown) {
    if (this.useInMemory) {
      this.snapshots.push({
        runId,
        stateValue,
        context,
        timestamp: Date.now()
      });
      return;
    }
    const stmt = this.db.prepare(
      'INSERT INTO snapshots (run_id, state_value, context, timestamp) VALUES (?, ?, ?, ?)'
    );
    stmt.run(runId, stateValue, JSON.stringify(context), Date.now());
  }

  public getRecentEvents(runId: string, limit = 100): RuntimeEvent[] {
    if (this.useInMemory) {
      return this.events
        .filter(e => e.runId === runId)
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit)
        .map(e => e.payload)
        .reverse();
    }
    const stmt = this.db.prepare(
      'SELECT payload FROM event_log WHERE run_id = ? ORDER BY id DESC LIMIT ?'
    );
    const rows = stmt.all(runId, limit) as { payload: string }[];
    return rows.map(r => JSON.parse(r.payload)).reverse();
  }

  public createRun(runId: string) {
    if (this.useInMemory) {
      if (!this.runs.has(runId)) {
        this.runs.set(runId, Date.now());
      }
      return;
    }
    const stmt = this.db.prepare('INSERT OR IGNORE INTO runs (id, created_at) VALUES (?, ?)');
    stmt.run(runId, Math.floor(Date.now() / 1000));
  }

  public getLatestRunId(): string | null {
    if (this.useInMemory) {
      let latestRunId: string | null = null;
      let latestTimestamp = -1;
      for (const [runId, createdAt] of this.runs.entries()) {
        if (createdAt > latestTimestamp) {
          latestTimestamp = createdAt;
          latestRunId = runId;
        }
      }
      return latestRunId;
    }
    const stmt = this.db.prepare('SELECT id FROM runs ORDER BY created_at DESC LIMIT 1');
    const row = stmt.get() as { id: string } | undefined;
    return row?.id || null;
  }

  public loadLatestSnapshot(runId: string): { stateValue: string; context: unknown } | null {
    if (this.useInMemory) {
      const latest = this.snapshots
        .filter(snapshot => snapshot.runId === runId)
        .sort((a, b) => b.timestamp - a.timestamp)[0];
      if (!latest) return null;
      return {
        stateValue: latest.stateValue,
        context: latest.context
      };
    }
    const stmt = this.db.prepare('SELECT state_value, context FROM snapshots WHERE run_id = ? ORDER BY timestamp DESC LIMIT 1');
    const row = stmt.get(runId) as { state_value: string; context: string } | undefined;
    if (!row) return null;
    
    try {
      return {
        stateValue: row.state_value,
        context: JSON.parse(row.context)
      };
    } catch (error) {
      return {
        stateValue: row.state_value,
        context: null
      };
    }
  }
}

export const ledger = new TaskLedger();
