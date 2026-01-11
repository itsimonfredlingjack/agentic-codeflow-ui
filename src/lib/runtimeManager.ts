// src/lib/runtimeManager.ts
import { ToolRuntime } from './runtime';

// Use a global to persist the runtime during development/HMR
const globalForRuntime = global as unknown as {
  runtime: ToolRuntime | undefined;
};

export function getRuntime(runId: string): ToolRuntime {
  if (!globalForRuntime.runtime) {
    globalForRuntime.runtime = new ToolRuntime(runId);
  }
  return globalForRuntime.runtime;
}

export const runtimeManager = {
  getRuntime
};
