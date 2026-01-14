// src/lib/runtimeManager.ts
import { HostRuntime } from './runtime';

// Use a global to persist the runtime during development/HMR
const globalForRuntime = global as unknown as {
  runtime: HostRuntime | undefined;
};

export function getRuntime(runId: string): HostRuntime {
  if (!globalForRuntime.runtime) {
    globalForRuntime.runtime = new HostRuntime(runId);
  } else {
    // Update the active runId if different - ensures events are stored under correct session
    globalForRuntime.runtime.setActiveRunId(runId);
  }
  return globalForRuntime.runtime;
}

export const runtimeManager = {
  getRuntime
};
