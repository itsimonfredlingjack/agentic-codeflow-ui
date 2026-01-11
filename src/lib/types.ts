// src/lib/types.ts

// --- 1. Agent Intents (UI -> Host) ---
// Detta är vad UI:t "vill" ska hända.
export type AgentIntent =
  | { type: 'INTENT_PLAN'; goal: string }
  | { type: 'INTENT_BUILD'; blueprint: any }
  | { type: 'INTENT_REVIEW_APPROVE' }
  | { type: 'INTENT_REVIEW_REJECT'; reason: string }
  | { type: 'INTENT_EXEC_CMD'; command: string }
  | { type: 'INTENT_STOP' };

// --- 2. Runtime Events (Host -> UI) ---
// Detta är vad som faktiskt hände. Sanningen.
export type RuntimeEvent =
  | { type: 'SYS_INIT'; runId: string }
  | { type: 'PHASE_CHANGED'; phase: 'plan' | 'build' | 'review' | 'deploy' }
  | { type: 'LOG_STDOUT'; content: string; timestamp: number }
  | { type: 'LOG_STDERR'; content: string; timestamp: number }
  | { type: 'AGENT_THOUGHT'; title: string; content: string }
  | { type: 'ARTIFACT_GENERATED'; name: string; content: string }
  | { type: 'ERROR'; severity: 'warn' | 'fatal'; message: string };