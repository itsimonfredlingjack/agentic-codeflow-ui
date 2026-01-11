// src/types.ts

export interface MessageHeader {
  sessionId: string;
  correlationId: string;
  timestamp: number;
}

// --- Agent Intents (UI -> Host) ---
export type AgentIntent =
  | { type: 'INTENT_START_BUILD'; header: MessageHeader; blueprint?: any }
  | { type: 'INTENT_EXEC_CMD'; header: MessageHeader; command: string }
  | { type: 'INTENT_CANCEL'; header: MessageHeader; targetCorrelationId: string }
  | { type: 'INTENT_GRANT_PERMISSION'; header: MessageHeader; requestId: string }
  | { type: 'INTENT_DENY_PERMISSION'; header: MessageHeader; requestId: string }
  | { type: 'INTENT_RESET'; header: MessageHeader };

// --- Runtime Events (Host -> UI) ---
export type RuntimeEvent =
  | { type: 'SYS_READY'; header: MessageHeader; runId: string }
  | { type: 'PROCESS_STARTED'; header: MessageHeader; pid: number; command: string }
  | { type: 'STDOUT_CHUNK'; header: MessageHeader; content: string }
  | { type: 'STDERR_CHUNK'; header: MessageHeader; content: string }
  | { type: 'PROCESS_EXITED'; header: MessageHeader; code: number }
  | { type: 'SECURITY_VIOLATION'; header: MessageHeader; policy: string; attemptedPath: string }
  | { type: 'PERMISSION_REQUESTED'; header: MessageHeader; requestId: string; command: string; riskLevel: 'high' }
  | { type: 'STATE_SNAPSHOT_SAVED'; header: MessageHeader; stateValue: string }
  | { type: 'WORKFLOW_ERROR'; header: MessageHeader; error: string; severity: 'warn' | 'fatal' };

// --- Semantic Events (For Card View Logic) ---
export type SemanticEvent = 
  | { type: 'PHASE_STATUS'; status: 'installing' | 'building' | 'testing' }
  | { type: 'PROGRESS_UPDATE'; percent: number }
  | { type: 'BUILD_COMPLETE'; durationMs: number; success: boolean };
