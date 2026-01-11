// src/types.ts

export interface MessageHeader {
  sessionId: string;
  correlationId: string;
  timestamp: number;
}

// --- Ollama Chat Types ---
export type OllamaChatRole = 'system' | 'user' | 'assistant';

export interface OllamaChatMessage {
   role: OllamaChatRole;
   content: string;
}

export interface OllamaOptions {
   temperature?: number;
   top_p?: number;
   top_k?: number;
   num_predict?: number;
   [key: string]: unknown;
}

export interface OllamaChatRequest {
   model?: string;
   messages: OllamaChatMessage[];
   stream?: boolean;
   options?: OllamaOptions;
}

export interface OllamaChatResponse {
  model: string;
  created_at: string;
  message: OllamaChatMessage;
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
  eval_duration?: number;
}

// --- Agent Intents (UI -> Host) ---
export type AgentIntent =
  | { type: 'INTENT_START_BUILD'; header: MessageHeader; blueprint?: Record<string, unknown> }
  | { type: 'INTENT_EXEC_CMD'; header: MessageHeader; command: string }
  | { type: 'INTENT_CANCEL'; header: MessageHeader; targetCorrelationId: string }
  | { type: 'INTENT_GRANT_PERMISSION'; header: MessageHeader; requestId: string }
  | { type: 'INTENT_DENY_PERMISSION'; header: MessageHeader; requestId: string }
  | { type: 'INTENT_RESET'; header: MessageHeader }
  | { type: 'INTENT_OLLAMA_GENERATE'; header: MessageHeader; model?: string; prompt: string; options?: OllamaOptions }
  | { type: 'INTENT_OLLAMA_CHAT'; header: MessageHeader; messages: OllamaChatMessage[]; model?: string; options?: OllamaOptions };

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
  | { type: 'WORKFLOW_ERROR'; header: MessageHeader; error: string; severity: 'warn' | 'fatal' }
   | { type: 'OLLAMA_RESPONSE'; header: MessageHeader; model: string; response: string; metadata?: Record<string, unknown> }
  | { type: 'OLLAMA_ERROR'; header: MessageHeader; error: string; model?: string }
  | { type: 'OLLAMA_CHAT_STARTED'; header: MessageHeader; model?: string }
  | { type: 'OLLAMA_CHAT_COMPLETED'; header: MessageHeader; response: OllamaChatResponse }
  | { type: 'OLLAMA_CHAT_FAILED'; header: MessageHeader; model?: string; error: string };

// --- Semantic Events (For Card View Logic) ---
export type SemanticEvent = 
  | { type: 'PHASE_STATUS'; status: 'installing' | 'building' | 'testing' }
  | { type: 'PROGRESS_UPDATE'; percent: number }
  | { type: 'BUILD_COMPLETE'; durationMs: number; success: boolean };

// --- LEGACY UI TYPES (Restored) ---
export type ActionType = 
    | 'command' | 'log' | 'error' | 'success' | 'plan' 
    | 'plan_artifact' | 'build_status' | 'security_gate' 
    | 'code' | 'analysis' | 'result';

export interface ActionCardProps {
    id: string;
    runId: string;
    type: ActionType;
    title: string;
    content: string;
    timestamp: string;
    phase: string;
    agentId?: string;
     severity?: 'info' | 'warn' | 'error';
     payload?: Record<string, unknown>;
}
