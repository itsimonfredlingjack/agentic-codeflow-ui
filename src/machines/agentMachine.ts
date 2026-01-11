// src/machines/agentMachine.ts
import { setup, assign } from 'xstate';
import { ledger } from '@/lib/ledger';

export const agentMachine = setup({
  types: {
    context: {} as { runId: string; retries: number; error: string | null; pendingRequestId?: string },
    events: {} as 
      | { type: 'START_PLANNING' }
      | { type: 'PLAN_COMPLETE' }
      | { type: 'EDIT_PLAN' }
      | { type: 'BUILD_SUCCESS' }
      | { type: 'BUILD_ERROR'; message: string }
      | { type: 'APPROVE_DEPLOY' }
      | { type: 'PERMISSION_REQUIRED'; requestId: string }
      | { type: 'PERMISSION_GRANTED' }
      | { type: 'PERMISSION_DENIED' }
  },
  actions: {
    saveSnapshot: ({ context, event, self }) => {
      const state = self.getSnapshot();
      ledger.saveSnapshot(context.runId, state.value as string, context);
    }
  }
}).createMachine({
  id: 'agentWorkflow',
  initial: 'idle',
  context: ({ input }) => ({ 
    runId: (input as any)?.runId || 'INIT',
    retries: 0, 
    error: null 
  }),
  entry: ['saveSnapshot'],
  states: {
    idle: {
      on: { START_PLANNING: 'planning' }
    },
    planning: {
      on: { 
        PLAN_COMPLETE: 'plan_edit',
        EDIT_PLAN: 'plan_edit'
      }
    },
    plan_edit: {
      on: { 
        PLAN_COMPLETE: 'building'
      }
    },
    building: {
      initial: 'executing',
      entry: ['saveSnapshot'],
      on: {
         PERMISSION_REQUIRED: {
           target: '.waiting_for_permission',
           actions: [
             assign({ pendingRequestId: ({ event }) => (event as any).requestId }),
             'saveSnapshot'
           ]
         }
      },
      states: {
        executing: {
          on: {
            BUILD_SUCCESS: '#agentWorkflow.reviewing',
            BUILD_ERROR: {
              target: 'analyzing_error',
              actions: [
                assign({ error: ({ event }) => (event as any).message }),
                'saveSnapshot'
              ]
            }
          }
        },
        waiting_for_permission: {
          on: {
            PERMISSION_GRANTED: 'executing',
            PERMISSION_DENIED: '#agentWorkflow.needs_assistance'
          }
        },
        analyzing_error: {
          after: {
            1000: [
              { target: 'auto_fixing', guard: ({ context }) => context.retries < 3 },
              { target: '#agentWorkflow.needs_assistance' }
            ]
          }
        },
        auto_fixing: {
          entry: [
            assign({ retries: ({ context }) => context.retries + 1 }),
            'saveSnapshot'
          ],
          after: { 500: 'executing' } 
        }
      }
    },
    reviewing: {
      on: { APPROVE_DEPLOY: 'gate_ready' }
    },
    gate_ready: {
      on: { APPROVE_DEPLOY: 'deploying' }
    },
    needs_assistance: {
      entry: ['saveSnapshot']
    },
    deploying: {
      type: 'final',
      entry: ['saveSnapshot']
    }
  }
});