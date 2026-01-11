// src/lib/runtime.ts
import { Subject } from 'rxjs';
import { AgentIntent, RuntimeEvent } from './types';
import { ledger } from './ledger';
import { TerminalRunner, SecurityViolationError } from './terminal';
import { parseLogLine } from './logParser';
import { executeWithAutoFix } from './autonomy';

export class ToolRuntime {
  private eventStream = new Subject<RuntimeEvent>();
  private activeRunId: string;
  private terminal: TerminalRunner;
  private pendingPermissions = new Map<string, { resolve: () => void; reject: (reason: any) => void }>();

  constructor(runId: string) {
    this.activeRunId = runId;
    this.terminal = new TerminalRunner();
  }

  // UI prenumererar på denna stream
  public get events$() {
    return this.eventStream.asObservable();
  }

  // Den enda vägen in för UI:t
  public dispatch(intent: AgentIntent) {
    console.log(`[Runtime] Received Intent: ${intent.type}`);
    
    // Hantera logik
    switch (intent.type) {
      case 'INTENT_EXEC_CMD':
        this.executeSafeCommand(intent.command, intent.correlationId);
        break;
      case 'INTENT_PERMISSION_GRANT':
        this.handlePermissionResolution(intent.requestId, true, intent.correlationId);
        break;
      case 'INTENT_PERMISSION_DENY':
        this.handlePermissionResolution(intent.requestId, false, intent.correlationId);
        break;
      // ... hantera andra intents
    }
  }

  private emit(eventData: Omit<RuntimeEvent, keyof BaseMetadata>, correlationId?: string) {
    const event: RuntimeEvent = {
      ...eventData,
      sessionId: this.activeRunId,
      correlationId: correlationId || 'SYS-' + Date.now(),
      timestamp: Date.now()
    } as RuntimeEvent;

    // 1. Skicka till UI (Realtid)
    this.eventStream.next(event);
    
    // 2. Spara till Disk (Persistens)
    ledger.appendEvent(this.activeRunId, event);
  }

  private handlePermissionResolution(requestId: string, granted: boolean, correlationId: string) {
    const pending = this.pendingPermissions.get(requestId);
    if (pending) {
      if (granted) {
        pending.resolve();
        this.emit({ type: 'LOG_STDOUT', content: `\n> Permission GRANTED for ${requestId}.\n` }, correlationId);
      } else {
        pending.reject(new Error('User denied permission'));
        this.emit({ type: 'ERROR', severity: 'warn', message: 'Permission denied by user.' }, correlationId);
      }
      this.pendingPermissions.delete(requestId);
    }
  }

  private checkPermission(command: string, correlationId: string): Promise<void> {
    const highRiskPatterns = ['rm -rf', 'git push', 'sudo', 'npm publish'];
    const isRisk = highRiskPatterns.some(p => command.includes(p));

    if (!isRisk) return Promise.resolve();

    const requestId = `req-${Date.now()}`;
    this.emit({ 
      type: 'PERMISSION_REQUEST', 
      requestId, 
      command, 
      reason: 'High-risk command detected' 
    }, correlationId);

    return new Promise((resolve, reject) => {
      this.pendingPermissions.set(requestId, { resolve, reject });
    });
  }

  // "Sandbox Light" - En säker terminal-runner
  private async executeSafeCommand(command: string, correlationId: string) {
    try {
      await this.checkPermission(command, correlationId);

      this.emit({ type: 'LOG_STDOUT', content: `$ ${command}\n` }, correlationId);

      // Use the autonomous loop for better reliability
      await executeWithAutoFix(this.terminal, command, (type, data) => {
        if (type === 'stdout') {
          this.emit({ type: 'LOG_STDOUT', content: data }, correlationId);
           const semanticEvent = parseLogLine(data);
           if (semanticEvent) this.emit(semanticEvent as any, correlationId);
        } else {
          this.emit({ type: 'LOG_STDERR', content: data }, correlationId);
           const semanticEvent = parseLogLine(data);
           if (semanticEvent) this.emit(semanticEvent as any, correlationId);
        }
      });

      this.emit({ type: 'LOG_STDOUT', content: `\n> Command completed successfully.\n` }, correlationId);

    } catch (error) {
      if (error instanceof SecurityViolationError) {
        this.emit({ 
          type: 'ERROR', 
          severity: 'warn', 
          message: error.message 
        }, correlationId);
      } else {
        this.emit({ 
          type: 'ERROR', 
          severity: 'fatal', 
          message: error instanceof Error ? error.message : 'Unknown execution error' 
        }, correlationId);
      }
    }
  }
}