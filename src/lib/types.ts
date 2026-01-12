// src/lib/types.ts

export interface BaseMetadata {
  sessionId: string;
  correlationId: string;
  timestamp: number;
}

// --- 1. Agent Intents (UI -> Host) ---
export type AgentIntent = (
  | { type: 'INTENT_PLAN'; goal: string }
  | { type: 'INTENT_BUILD'; blueprint: Record<string, unknown> }
  | { type: 'INTENT_REVIEW_APPROVE' }
  | { type: 'INTENT_REVIEW_REJECT'; reason: string }
  | { type: 'INTENT_EXEC_CMD'; command: string }
  | { type: 'INTENT_STOP' }
  | { type: 'INTENT_PERMISSION_GRANT'; requestId: string }
  | { type: 'INTENT_PERMISSION_DENY'; requestId: string }
) & BaseMetadata;

// --- 2. Runtime Events (Host -> UI) ---
export type RuntimeEvent = (
  | { type: 'SYS_INIT'; runId: string }
  | { type: 'PHASE_CHANGED'; phase: 'plan' | 'build' | 'review' | 'deploy' }
  | { type: 'LOG_STDOUT'; content: string }
  | { type: 'LOG_STDERR'; content: string }
  | { type: 'AGENT_THOUGHT'; title: string; content: string }
  | { type: 'ARTIFACT_GENERATED'; name: string; content: string }
  | { type: 'PHASE_STATUS'; status: string }
  | { type: 'PROGRESS_UPDATE'; value: number }
  | { type: 'BUILD_SUCCESS' }
  | { type: 'PERMISSION_REQUEST'; requestId: string; command: string; reason: string }
  | { type: 'ERROR'; severity: 'warn' | 'fatal'; message: string }
) & BaseMetadata;
