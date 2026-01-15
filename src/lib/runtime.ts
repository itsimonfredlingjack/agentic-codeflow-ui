// src/lib/runtime.ts
import { Subject } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import type { ParsedCommand } from '@/lib/safeCommand';
import { decideCommand } from '@/lib/safeCommand';
import { AgentIntent, RuntimeEvent, MessageHeader, OllamaChatMessage, OllamaChatResponse } from '@/types';
import { ledger } from './ledger';
import { TerminalService } from './terminal';
import { ollamaClient as ollamaService } from './ollama';

export class HostRuntime {
  private eventStream = new Subject<RuntimeEvent>();
  private terminal = new TerminalService();
  private activeRunId: string;
  private pendingCommands = new Map<string, { header: MessageHeader; command: ParsedCommand; timestamp: number }>();
  private pruneInterval: NodeJS.Timeout;

  constructor(runId: string) {
    this.activeRunId = runId;
    ledger.createRun(runId);
    this.emit({ type: 'SYS_READY', header: this.createHeader(), runId });

    // Check for expired pending commands every minute
    this.pruneInterval = setInterval(() => this.prunePendingCommands(), 60_000);
  }

  public destroy() {
    if (this.pruneInterval) {
      clearInterval(this.pruneInterval);
    }
  }

  private prunePendingCommands() {
    const now = Date.now();
    const TTL = 10 * 60 * 1000; // 10 minutes

    for (const [requestId, data] of this.pendingCommands.entries()) {
      if (now - data.timestamp > TTL) {
        this.pendingCommands.delete(requestId);
        this.emit({
          type: 'WORKFLOW_ERROR',
          header: data.header,
          error: `Permission request ${requestId} timed out (TTL expired)`,
          severity: 'warn',
        });

        // Also log as a security/permission event if useful
        this.emit({
          type: 'SECURITY_VIOLATION',
          header: data.header,
          policy: 'PERMISSION_TTL_EXPIRED',
          attemptedPath: data.command.original,
        });
      }
    }
  }

  /**
   * Update the active run ID - used when switching sessions
   * This ensures events are stored under the correct session
   */
  public setActiveRunId(runId: string) {
    if (this.activeRunId !== runId) {
      console.log(`[Runtime] Switching session: ${this.activeRunId} → ${runId}`);
      this.activeRunId = runId;
      this.pendingCommands.clear();
      ledger.createRun(runId);
    }
  }

  public get events$() {
    return this.eventStream.asObservable();
  }

  public dispatch(intent: AgentIntent) {
    // 1. Logging intent handled elsewhere or here
    console.log(`[Runtime] Dispatching: ${intent.type}`);

    switch (intent.type) {
      case 'INTENT_EXEC_CMD': {
        const decision = decideCommand(intent.command);

        if (decision.kind === 'deny') {
          this.emit({
            type: 'SECURITY_VIOLATION',
            header: intent.header,
            policy: 'COMMAND_DENIED',
            attemptedPath: intent.command,
          });
          this.emit({
            type: 'WORKFLOW_ERROR',
            header: intent.header,
            error: decision.reason,
            severity: 'warn',
          });
          return;
        }

        if (decision.kind === 'require_permission') {
          const requestId = uuidv4();
          this.pendingCommands.set(requestId, {
            header: intent.header,
            command: decision.parsed,
            timestamp: Date.now()
          });
          this.emit({
            type: 'PERMISSION_REQUESTED',
            header: intent.header,
            requestId,
            command: decision.parsed.original,
            riskLevel: 'high',
          });
          this.emit({
            type: 'WORKFLOW_ERROR',
            header: intent.header,
            error: `Permission required: ${decision.reason}`,
            severity: 'warn',
          });
          return;
        }

        this.terminal.executeParsed(
          intent.header,
          decision.parsed.program,
          decision.parsed.args,
          (event) => this.emit(event)
        );
        return;
      }

      case 'INTENT_GRANT_PERMISSION': {
        const pending = this.pendingCommands.get(intent.requestId);
        if (!pending) {
          this.emit({
            type: 'WORKFLOW_ERROR',
            header: intent.header,
            error: `No pending command for requestId=${intent.requestId}`,
            severity: 'warn',
          });
          return;
        }

        this.pendingCommands.delete(intent.requestId);
        this.terminal.executeParsed(
          pending.header,
          pending.command.program,
          pending.command.args,
          (event) => this.emit(event)
        );
        return;
      }

      case 'INTENT_DENY_PERMISSION': {
        const pending = this.pendingCommands.get(intent.requestId);
        this.pendingCommands.delete(intent.requestId);
        this.emit({
          type: 'WORKFLOW_ERROR',
          header: intent.header,
          error: pending ? `Permission denied: ${pending.command.original}` : 'Permission denied',
          severity: 'warn',
        });
        return;
      }

      case 'INTENT_CANCEL': {
        this.terminal.kill(intent.targetCorrelationId);
        this.emit({
          type: 'WORKFLOW_ERROR',
          header: intent.header,
          error: `Cancelled process: ${intent.targetCorrelationId}`,
          severity: 'warn',
        });
        return;
      }

      case 'INTENT_OLLAMA_GENERATE':
        void this.handleOllamaGenerate(intent);
        return;

      case 'INTENT_OLLAMA_CHAT':
        void this.handleOllamaChat(intent);
        return;

      case 'INTENT_START_BUILD':
      case 'INTENT_RESET':
        return;
    }
  }

  private async handleOllamaGenerate(intent: Extract<AgentIntent, { type: 'INTENT_OLLAMA_GENERATE' }>) {
    try {
      const response = await ollamaService.generate({
        model: intent.model, // Will use default from ollamaService if undefined
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
    } catch (error) {
      this.emit({
        type: 'OLLAMA_ERROR',
        header: intent.header,
        error: error instanceof Error ? error.message : 'Failed to generate with Ollama',
        model: intent.model,
      });
    }
  }

  private async handleOllamaChat(intent: Extract<AgentIntent, { type: 'INTENT_OLLAMA_CHAT' }>) {
    const model = intent.model; // Will use default from ollamaService if undefined

    // Emit started event
    this.emit({
      type: 'OLLAMA_CHAT_STARTED',
      header: intent.header,
      model,
    });

    try {
      const stream = await ollamaService.chatStream({
        model: intent.model, // Will use default from ollamaService if undefined
        messages: intent.messages,
        stream: true,
        options: intent.options || {},
      });

      const reader = stream.getReader();
      let aggregatedContent = '';
      let lastChunk: OllamaChatResponse | null = null;
      let streamError: Error | null = null;

      // Batching: collect tokens and emit every 150ms
      let tokenBuffer = '';
      let lastEmitTime = Date.now();
      const BATCH_INTERVAL_MS = 150;

      const flushBuffer = () => {
        if (tokenBuffer) {
          this.emit({
            type: 'OLLAMA_BIT',
            header: intent.header,
            kind: 'chat',
            model: lastChunk?.model || model,
            delta: tokenBuffer,
            done: false,
          });
          tokenBuffer = '';
          lastEmitTime = Date.now();
        }
      };

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (!value) continue;

          lastChunk = value;
          const delta = value.message?.content ?? '';
          if (delta) {
            aggregatedContent += delta;
            tokenBuffer += delta;
          }

          // Emit batched tokens every BATCH_INTERVAL_MS
          const now = Date.now();
          if (now - lastEmitTime >= BATCH_INTERVAL_MS) {
            flushBuffer();
          }

          if (value.done) {
            flushBuffer(); // Flush remaining
            break;
          }
        }
        flushBuffer(); // Final flush
      } catch (error) {
        streamError = error instanceof Error ? error : new Error('Stream read error');
        flushBuffer(); // Flush on error too
      } finally {
        await reader.cancel().catch(() => undefined);
      }

      if (streamError && aggregatedContent.trim()) {
        this.emit({
          type: 'OLLAMA_CHAT_COMPLETED',
          header: intent.header,
          response: this.buildChatResponse(model, lastChunk, aggregatedContent),
        });
        return;
      }

      if (streamError) {
        throw streamError;
      }

      if (!lastChunk) {
        this.emit({
          type: 'OLLAMA_CHAT_FAILED',
          header: intent.header,
          model,
          error: 'No response from Ollama',
        });
        return;
      }

      if (!aggregatedContent.trim()) {
        const fallbackPrompt = this.buildChatPrompt(intent.messages);
        const fallbackResponse = await ollamaService.generate({
          model: intent.model,
          prompt: fallbackPrompt,
          stream: false,
          options: intent.options || {},
        });

        this.emit({
          type: 'OLLAMA_CHAT_COMPLETED',
          header: intent.header,
          response: {
            model: fallbackResponse.model,
            created_at: fallbackResponse.created_at,
            message: { role: 'assistant', content: fallbackResponse.response },
            done: true,
            total_duration: fallbackResponse.total_duration,
            load_duration: fallbackResponse.load_duration,
            prompt_eval_count: fallbackResponse.prompt_eval_count,
            eval_count: fallbackResponse.eval_count,
            eval_duration: fallbackResponse.eval_duration,
          },
        });
        return;
      }

      this.emit({
        type: 'OLLAMA_CHAT_COMPLETED',
        header: intent.header,
        response: this.buildChatResponse(model, lastChunk, aggregatedContent),
      });
    } catch (error) {
      // Emit failed event
      this.emit({
        type: 'OLLAMA_CHAT_FAILED',
        header: intent.header,
        model,
        error: error instanceof Error ? error.message : 'Failed to chat with Ollama',
      });
    }
  }

  private emit(event: RuntimeEvent) {
    if (event.type !== 'OLLAMA_BIT') {
      ledger.createRun(event.header.sessionId);
      ledger.appendEvent(event.header.sessionId, event);
    }
    this.eventStream.next(event);
  }

  private buildChatResponse(
    model: string | undefined,
    lastChunk: OllamaChatResponse | null,
    aggregatedContent: string
  ): OllamaChatResponse {
    const safeModel = lastChunk?.model || model || 'unknown';
    const safeMessage = lastChunk?.message ?? { role: 'assistant', content: '' };

    return {
      model: safeModel,
      created_at: lastChunk?.created_at || new Date().toISOString(),
      message: {
        ...safeMessage,
        content: aggregatedContent || safeMessage.content || '',
      },
      done: true,
      total_duration: lastChunk?.total_duration,
      load_duration: lastChunk?.load_duration,
      prompt_eval_count: lastChunk?.prompt_eval_count,
      eval_count: lastChunk?.eval_count,
      eval_duration: lastChunk?.eval_duration,
    };
  }

  private buildChatPrompt(messages: OllamaChatMessage[]): string {
    const parts = messages.map((message) => {
      const label = message.role === 'system' ? 'System' : message.role === 'user' ? 'User' : 'Assistant';
      return `${label}: ${message.content}`;
    });

    let prompt = parts.join('\n\n');
    if (!prompt.trim()) {
      return 'Assistant:';
    }

    const last = messages[messages.length - 1];
    if (!last || last.role !== 'assistant') {
      prompt += '\n\nAssistant:';
    }

    return prompt;
  }

  private createHeader(): MessageHeader {
      return {
          sessionId: this.activeRunId,
          correlationId: uuidv4(),
          timestamp: Date.now()
      };
  }
}
