// src/lib/runtime.ts
import { Subject } from 'rxjs';
import { AgentIntent, RuntimeEvent } from './types';
import { ledger } from './ledger';

export class ToolRuntime {
  private eventStream = new Subject<RuntimeEvent>();
  private activeRunId: string;

  constructor(runId: string) {
    this.activeRunId = runId;
  }

  // UI prenumererar på denna stream
  public get events$() {
    return this.eventStream.asObservable();
  }

  // Den enda vägen in för UI:t
  public dispatch(intent: AgentIntent) {
    console.log(`[Runtime] Received Intent: ${intent.type}`);
    
    // 1. Logga intent till Ledger? Kanske som ett 'USER_ACTION' event.
    
    // 2. Hantera logik
    switch (intent.type) {
      case 'INTENT_EXEC_CMD':
        this.executeSafeCommand(intent.command);
        break;
      // ... hantera andra intents
    }
  }

  private emit(event: RuntimeEvent) {
    // 1. Skicka till UI (Realtid)
    this.eventStream.next(event);
    
    // 2. Spara till Disk (Persistens)
    ledger.appendEvent(this.activeRunId, event);
  }

  // "Sandbox Light" - En säker terminal-runner
  private executeSafeCommand(command: string) {
    // Säkerhetskoll (som i din sentinel.ts)
    if (command.includes('rm -rf') || command.includes('..')) {
      this.emit({ 
        type: 'ERROR', 
        severity: 'warn', 
        message: `Security Violation: Command '${command}' blocked.` 
      });
      return;
    }

    this.emit({ type: 'LOG_STDOUT', content: `$ ${command}`, timestamp: Date.now() });

    // Här skulle vi använda node-pty eller spawn
    // Mock implementation för demo:
    setTimeout(() => {
        this.emit({ type: 'LOG_STDOUT', content: `> Executing ${command}...`, timestamp: Date.now() });
        this.emit({ type: 'LOG_STDOUT', content: `> Done.`, timestamp: Date.now() });
    }, 500);
  }
}