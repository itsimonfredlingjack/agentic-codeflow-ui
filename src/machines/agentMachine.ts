// src/machines/agentMachine.ts
import { setup, assign } from 'xstate';
import { ledger } from '@/lib/ledger';

export const agentMachine = setup({
  types: {
    context: {} as { runId: string; retries: number; error: string | null },
    events: {} as 
      | { type: 'START_PLANNING' }
      | { type: 'PLAN_COMPLETE' }
      | { type: 'START_BUILD' }
      | { type: 'BUILD_SUCCESS' }
      | { type: 'BUILD_ERROR'; message: string }
      | { type: 'APPROVE_DEPLOY' }
      | { type: 'RETRY' }
  },
  actions: {
      persistState: ({ context, event }) => {
         // Mock runId for now, ideally passed in context
         ledger.saveSnapshot(context.runId || 'default', event.type, context);
      }
  }
}).createMachine({
  id: 'agentWorkflow',
  initial: 'idle',
  context: { runId: 'init', retries: 0, error: null },
  states: {
    idle: {
      on: { START_PLANNING: 'planning' }
    },
    planning: {
      entry: 'persistState',
      on: { PLAN_COMPLETE: 'building' }
    },
    building: {
      entry: 'persistState',
      initial: 'executing',
      states: {
        executing: {
          on: {
            START_BUILD: 'executing',
            BUILD_SUCCESS: '#agentWorkflow.reviewing',
            BUILD_ERROR: {
              target: 'analyzing_error',
              actions: assign({ error: ({ event }) => event.message })
            }
          }
        },
        analyzing_error: {
          after: {
            1000: [
              { target: 'retrying', guard: ({ context }) => context.retries < 3 },
              { target: '#agentWorkflow.needs_assistance' }
            ]
          }
        },
        retrying: {
          entry: assign({ retries: ({ context }) => context.retries + 1 }),
          after: { 500: 'executing' }
        }
      }
    },
    reviewing: {
      entry: 'persistState',
      on: { APPROVE_DEPLOY: 'deploying' }
    },
    needs_assistance: {
      entry: 'persistState',
      on: { RETRY: 'building.retrying' }
    },
    deploying: {
      type: 'final'
    }
  }
});
