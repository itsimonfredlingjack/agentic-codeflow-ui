import Database from 'better-sqlite3';

const db = new Database('task_ledger.db');

// Initialize Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS runs (
    id TEXT PRIMARY KEY,
    start_time TEXT,
    context TEXT,
    status TEXT
  );

  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    run_id TEXT,
    type TEXT,
    title TEXT,
    content TEXT,
    timestamp TEXT,
    phase TEXT,
    agent_id TEXT,
    severity TEXT,
    FOREIGN KEY(run_id) REFERENCES runs(id)
  );
`);

export default db;
