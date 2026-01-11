import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import path from 'path';

export class SecurityViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecurityViolationError';
  }
}

export class TerminalRunner {
  private currentProcess: ChildProcessWithoutNullStreams | null = null;
  private projectRoot: string;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = path.resolve(projectRoot);
  }

  /**
   * Validates that the command does not attempt path traversal
   * and runs within the project root.
   */
  private validateCommand(command: string) {
    // Check for path traversal attempts
    if (command.includes('..') || command.includes('~')) {
        throw new SecurityViolationError('Path traversal detected. Command blocked.');
    }
    
    // Additional blocklist could go here
    const blockList = [/rm\s+-rf/, /sudo/, /:(){ :|:& };:/];
    if (blockList.some(regex => regex.test(command))) {
        throw new SecurityViolationError('Dangerous command detected. Blocked.');
    }
  }

  public execute(
    command: string, 
    callbacks: {
      onStdout: (data: string) => void;
      onStderr: (data: string) => void;
      onExit: (code: number | null) => void;
    },
    timeoutMs: number = 300000 // 5 minutes default
  ): number | undefined {
    this.validateCommand(command);

    // Spawn process in its own group to allow killing the entire tree
    this.currentProcess = spawn(command, {
      cwd: this.projectRoot,
      shell: true,
      detached: true, // Needed for process group management
      env: { ...process.env, FORCE_COLOR: '1' }
    });

    const pid = this.currentProcess.pid;
    if (!pid) {
        throw new Error('Failed to spawn process');
    }

    const timer = setTimeout(() => {
        if (this.currentProcess) {
            callbacks.onStderr('\n[Terminal] 🛑 Command timed out.');
            this.kill();
        }
    }, timeoutMs);

    // Stream listeners
    this.currentProcess.stdout.on('data', (data) => {
      callbacks.onStdout(data.toString());
    });

    this.currentProcess.stderr.on('data', (data) => {
      callbacks.onStderr(data.toString());
    });

    this.currentProcess.on('close', (code) => {
      clearTimeout(timer);
      this.currentProcess = null;
      callbacks.onExit(code);
    });

    return pid;
  }

  public kill() {
    if (this.currentProcess && this.currentProcess.pid) {
      try {
        // Kill the process group (negative PID) to kill the tree
        process.kill(-this.currentProcess.pid, 'SIGTERM');
      } catch (e) {
        // Fallback to standard kill if group kill fails
        this.currentProcess.kill();
      }
      this.currentProcess = null;
    }
  }
}
