// src/lib/ledger.ts
import Database from 'better-sqlite3';
import { RuntimeEvent } from './types';

class TaskLedger {
  private db: Database.Database;

  constructor() {
    this.db = new Database('task_ledger.db');
    this.db.pragma('journal_mode = WAL'); // Performance boost
    this.init();
  }

  private init() {
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
  }

  // Blixtsnabb insert (Fire-and-forget)
  public appendEvent(runId: string, event: RuntimeEvent) {
    const stmt = this.db.prepare(
      'INSERT INTO event_log (run_id, type, payload, timestamp) VALUES (?, ?, ?, ?)'
    );
    // Vi lagrar hela eventet som JSON för flexibilitet
    stmt.run(runId, event.type, JSON.stringify(event), Date.now());
  }

  public getRecentEvents(runId: string, limit = 100): RuntimeEvent[] {
    const stmt = this.db.prepare(
      'SELECT payload FROM event_log WHERE run_id = ? ORDER BY id DESC LIMIT ?'
    );
    const rows = stmt.all(runId, limit) as { payload: string }[];
    return rows.map(r => JSON.parse(r.payload)).reverse();
  }

  public saveSnapshot(runId: string, stateValue: string, context: any) {
    const stmt = this.db.prepare(
      'INSERT INTO snapshots (run_id, state_value, context, timestamp) VALUES (?, ?, ?, ?)'
    );
    stmt.run(runId, stateValue, JSON.stringify(context), Date.now());
  }

  public loadLatestSnapshot(runId: string) {
    const stmt = this.db.prepare(
      'SELECT state_value, context FROM snapshots WHERE run_id = ? ORDER BY id DESC LIMIT 1'
    );
    const row = stmt.get(runId) as { state_value: string; context: string } | undefined;
    if (!row) return null;
    return {
      stateValue: row.state_value,
      context: JSON.parse(row.context)
    };
  }

  public getLatestRunId(): string | null {
    const stmt = this.db.prepare('SELECT id FROM runs ORDER BY created_at DESC LIMIT 1');
    const row = stmt.get() as { id: string } | undefined;
    return row ? row.id : null;
  }

  public createRun(runId: string) {
      const stmt = this.db.prepare('INSERT OR IGNORE INTO runs (id) VALUES (?)');
      stmt.run(runId);
  }
}

export const ledger = new TaskLedger();