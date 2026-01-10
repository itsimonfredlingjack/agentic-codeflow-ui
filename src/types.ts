export type ActionType = 'command' | 'log' | 'analysis' | 'result' | 'error' | 'success' | 'plan' | 'plan_artifact' | 'build_status' | 'security_gate' | 'code';

export interface AgentEvent {
    id: string;
    runId: string; // Traceability
    timestamp: string;
    type: ActionType;
    title: string;
    content: string;

    // Context metadata
    phase: 'plan' | 'build' | 'review' | 'deploy';
    agentId: string;

    // Standardized Fields
    source?: string; // e.g. "Architect", "Builder"
    payload?: Record<string, unknown>;   // Flexible payload for richer events

    // Refinement: Severity for filtering
    severity: 'info' | 'warn' | 'error';

    // Optional artifacts
    artifacts?: {
        name: string;
        path: string;
    }[];
}

// For UI compatibility
export type ActionCardProps = AgentEvent;
