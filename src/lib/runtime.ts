// src/lib/runtime.ts
import { Subject } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { AgentIntent, RuntimeEvent, MessageHeader } from '@/types';
import { ledger } from './ledger';
import { TerminalService } from './terminal';

export class HostRuntime {
  private eventStream = new Subject<RuntimeEvent>();
  private terminal = new TerminalService();
  private activeRunId: string;

  constructor(runId: string) {
    this.activeRunId = runId;
    ledger.createRun(runId);
    this.emit({ type: 'SYS_READY', header: this.createHeader(), runId });
  }

  public get events$() {
    return this.eventStream.asObservable();
  }

  public dispatch(intent: AgentIntent) {
    // 1. Logging intent handled elsewhere or here
    console.log(`[Runtime] Dispatching: ${intent.type}`);

    // 2. Permission Gate / Middleware Logic (Simplified)
    if (intent.type === 'INTENT_EXEC_CMD') {
        const isRisky = intent.command.includes('rm -rf'); // Basic check
        if (isRisky) {
            const requestId = uuidv4();
            this.emit({ 
                type: 'PERMISSION_REQUESTED', 
                header: intent.header, 
                requestId, 
                command: intent.command, 
                riskLevel: 'high' 
            });
            // Here we would store the pending command in a Map and return
            return; 
        }

        // Execute if safe
        this.terminal.execute(intent.header, intent.command, (event) => this.emit(event));
    }
  }

  private emit(event: RuntimeEvent) {
    ledger.appendEvent(this.activeRunId, event);
    this.eventStream.next(event);
  }

  private createHeader(): MessageHeader {
      return {
          sessionId: this.activeRunId,
          correlationId: uuidv4(),
          timestamp: Date.now()
      };
  }
}