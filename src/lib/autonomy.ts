import { TerminalRunner } from './terminal';
import { parseLogLine } from './logParser';

export class MaxRetriesExceededError extends Error {
  constructor(command: string) {
    super(`Max retries exceeded for command: ${command}`);
    this.name = 'MaxRetriesExceededError';
  }
}

// Mock AI Fixer - In a real scenario, this would call an LLM
function getAiFix(errorLog: string): string | null {
  if (errorLog.includes('sh: 1: command not found') || errorLog.includes('not recognized')) {
      return null; // Can't fix missing binaries easily
  }
  if (errorLog.includes('missing script: build')) {
      return 'npm install && npm run build'; // Common fix
  }
  return null;
}

export async function executeWithAutoFix(
  runner: TerminalRunner,
  command: string,
  onLog: (type: 'stdout' | 'stderr', data: string) => void,
  maxRetries = 3
): Promise<void> {
  let attempt = 0;
  let currentCommand = command;

  while (attempt <= maxRetries) {
    try {
      await executeSingle(runner, currentCommand, onLog);
      return; // Success!
    } catch (error: any) {
      if (attempt === maxRetries) {
        throw new MaxRetriesExceededError(command);
      }

      const errorLog = error.message || '';
      const fix = getAiFix(errorLog);

      if (fix) {
        onLog('stdout', `\n[Autonomy] 🔧 Auto-fixing detected error. Retrying with: ${fix}\n`);
        currentCommand = fix;
      } else {
        onLog('stderr', `\n[Autonomy] ⚠️ No auto-fix available. Retrying original command (${attempt + 1}/${maxRetries})...\n`);
        // If no fix, just retry original (maybe network flake?)
      }
      
      attempt++;
    }
  }
}

function executeSingle(
  runner: TerminalRunner, 
  command: string, 
  onLog: (type: 'stdout' | 'stderr', data: string) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    let stderrBuffer = '';

    runner.execute(command, {
      onStdout: (data) => onLog('stdout', data),
      onStderr: (data) => {
        onLog('stderr', data);
        stderrBuffer += data;
        // Keep buffer size manageable (last 20 lines approx)
        if (stderrBuffer.length > 2000) {
            stderrBuffer = stderrBuffer.slice(-2000);
        }
      },
      onExit: (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(stderrBuffer));
        }
      }
    });
  });
}
