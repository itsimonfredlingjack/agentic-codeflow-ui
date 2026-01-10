import { setup, assign } from 'xstate';

export type MissionContext = {
    runId: string;
    agentId: string | null;
    error: string | null;
};

export type MissionEvent =
    | { type: 'NEXT' }
    | { type: 'PREV' }
    | { type: 'SET_STAGE'; stage: 'plan' | 'build' | 'review' | 'deploy' }
    | { type: 'UNLOCK_GATE' }
    | { type: 'ERROR'; message: string }
    | { type: 'SECURITY_VIOLATION'; policy: string }
    | { type: 'RESET_RUN' }
    | { type: 'RETRY' };

export const missionControlMachine = setup({
    types: {
        context: {} as MissionContext,
        events: {} as MissionEvent,
    },
    actions: {
        clearError: assign({ error: null }),
        setRunId: assign({ runId: () => `RUN-${Math.floor(Math.random() * 10000)}` }),
    },
}).createMachine({
    id: 'missionControl',
    initial: 'idle',
    context: {
        runId: 'INIT',
        agentId: null,
        error: null,
    },
    states: {
        idle: {
            entry: 'setRunId',
            on: {
                NEXT: { target: '#plan_phase' },
            },
        },
        security_lockdown: {
            id: 'security_lockdown',
            on: {
                RETRY: { target: '#plan_phase', actions: 'clearError' }
            }
        },
        plan: {
            id: 'plan_phase',
            initial: 'analyzing',
            on: {
                NEXT: { target: '#build_phase' }
            },
            states: {
                analyzing: {
                    on: { NEXT: 'drafting' }
                },
                drafting: {
                    on: { NEXT: 'reviewing_plan' }
                },
                reviewing_plan: {
                    // Breakpoint: waiting for user approval
                    on: { NEXT: 'approved' }
                },
                approved: {
                }
            }
        },
        build: {
            id: 'build_phase',
            on: {
                NEXT: { target: '#review_phase' },
                ERROR: { target: '#build_failure', actions: assign({ error: ({ event }) => event.message }) }
            },
            initial: 'scaffolding',
            states: {
                scaffolding: { on: { NEXT: 'codegen' } },
                codegen: { on: { NEXT: 'verifying' } },
                verifying: { on: { NEXT: 'complete' } },
                complete: {},
                failure: {
                    id: 'build_failure',
                    on: { RETRY: 'scaffolding' }
                }
            }
        },
        review: {
            id: 'review_phase',
            initial: 'locked',
            on: {
                NEXT: { target: '#deploy_phase' }
            },
            states: {
                locked: {
                    on: { UNLOCK_GATE: 'unlocked' }
                },
                unlocked: {
                    // Ready to proceed
                }
            }
        },
        deploy: {
            id: 'deploy_phase',
        },
        // Helper state for explicit jumps (SET_STAGE) handling
        active: {
            id: 'active_state',
        }
    },
    // Global transitions for prototype navigation
    on: {
        RESET_RUN: { target: '.idle', actions: 'setRunId' },
        SECURITY_VIOLATION: {
            target: '#security_lockdown',
            actions: assign({ error: ({ event }) => `VIOLATION: ${event.policy}` })
        },
        SET_STAGE: [
            { guard: ({ event }) => event.stage === 'plan', target: '#plan_phase' },
            { guard: ({ event }) => event.stage === 'build', target: '#build_phase' },
            { guard: ({ event }) => event.stage === 'review', target: '#review_phase' },
            { guard: ({ event }) => event.stage === 'deploy', target: '#deploy_phase' },
        ]
    }
});
