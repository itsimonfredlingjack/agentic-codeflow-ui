// src/machines/agentMachine.ts
import { setup, assign } from 'xstate';

export const agentMachine = setup({
  types: {
    context: {} as { retries: number; error: string | null },
    events: {} as 
      | { type: 'START_PLANNING' }
      | { type: 'PLAN_COMPLETE' }
      | { type: 'BUILD_SUCCESS' }
      | { type: 'BUILD_ERROR'; message: string }
      | { type: 'APPROVE_DEPLOY' }
  }
}).createMachine({
  id: 'agentWorkflow',
  initial: 'idle',
  context: { retries: 0, error: null },
  states: {
    idle: {
      on: { START_PLANNING: 'planning' }
    },
    planning: {
      // Här anropar vi LLM för att generera arkitektur
      on: { PLAN_COMPLETE: 'building' }
    },
    building: {
      initial: 'executing',
      states: {
        executing: {
          on: {
            BUILD_SUCCESS: '#agentWorkflow.reviewing',
            BUILD_ERROR: {
              target: 'analyzing_error',
              actions: assign({ error: ({ event }) => event.message })
            }
          }
        },
        analyzing_error: {
          // AI-agenten tänker på hur felet ska lösas
          after: {
            1000: [
              { target: 'retrying', guard: ({ context }) => context.retries < 3 },
              { target: '#agentWorkflow.needs_assistance' }
            ]
          }
        },
        retrying: {
          entry: assign({ retries: ({ context }) => context.retries + 1 }),
          after: { 500: 'executing' } // Gå tillbaka och försök igen
        }
      }
    },
    reviewing: {
      on: { APPROVE_DEPLOY: 'deploying' }
    },
    needs_assistance: {
      // Pausat läge - väntar på mänsklig input
    },
    deploying: {
      type: 'final'
    }
  }
});