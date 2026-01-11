// src/lib/runtime.ts
import { Subject } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { AgentIntent, RuntimeEvent, MessageHeader, OllamaChatResponse } from '@/types';
import { ledger } from './ledger';
import { TerminalService } from './terminal';
import { ollamaClient } from './ollama';

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

    // 3. Ollama Integration
    if (intent.type === 'INTENT_OLLAMA_GENERATE') {
      this.handleOllamaGenerate(intent);
    }

    if (intent.type === 'INTENT_OLLAMA_CHAT') {
      this.handleOllamaChat(intent);
    }
  }

  private async handleOllamaGenerate(intent: Extract<AgentIntent, { type: 'INTENT_OLLAMA_GENERATE' }>) {
    try {
      const response = await ollamaClient.generate({
        model: intent.model, // Will use default from ollamaClient if undefined
        prompt: intent.prompt,
        stream: false,
        options: intent.options || {},
      });

      this.emit({
        type: 'OLLAMA_RESPONSE',
        header: intent.header,
        model: response.model,
        response: response.response,
        metadata: {
          total_duration: response.total_duration,
          load_duration: response.load_duration,
          prompt_eval_count: response.prompt_eval_count,
          eval_count: response.eval_count,
          eval_duration: response.eval_duration,
        },
      });
    } catch (error: any) {
      this.emit({
        type: 'OLLAMA_ERROR',
        header: intent.header,
        error: error.message || 'Failed to generate with Ollama',
        model: intent.model,
      });
    }
  }

  private async handleOllamaChat(intent: Extract<AgentIntent, { type: 'INTENT_OLLAMA_CHAT' }>) {
    const model = intent.model; // Will use default from ollamaClient if undefined
    
    // Emit started event
    this.emit({
      type: 'OLLAMA_CHAT_STARTED',
      header: intent.header,
      model,
    });

    try {
      const response = await ollamaClient.chat({
        model: intent.model, // Will use default from ollamaClient if undefined
        messages: intent.messages,
        stream: false,
        options: intent.options || {},
      });

      // Convert to OllamaChatResponse format
      const chatResponse: OllamaChatResponse = {
        model: response.model,
        created_at: response.created_at,
        message: response.message,
        done: response.done,
        total_duration: response.total_duration,
        load_duration: response.load_duration,
        prompt_eval_count: response.prompt_eval_count,
        eval_count: response.eval_count,
        eval_duration: response.eval_duration,
      };

      // Emit completed event
      this.emit({
        type: 'OLLAMA_CHAT_COMPLETED',
        header: intent.header,
        response: chatResponse,
      });
    } catch (error: any) {
      // Emit failed event
      this.emit({
        type: 'OLLAMA_CHAT_FAILED',
        header: intent.header,
        model,
        error: error.message || 'Failed to chat with Ollama',
      });
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