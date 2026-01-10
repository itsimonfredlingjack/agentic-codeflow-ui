export type ActionType = 'command' | 'log' | 'error' | 'success' | 'plan' | 'plan_artifact' | 'build_status' | 'security_gate' | 'code';

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

    // Refinement: Severity for filtering
    severity: 'info' | 'warn' | 'error';

    // Optional artifacts
    artifacts?: {
        name: string;
        path: string;
    }[];
}

// For UI compatibility
export interface ActionCardProps extends AgentEvent { }
