// src/lib/ollama.ts
// Model-agnostic Ollama service with proper error handling and streaming support

import type { OllamaChatRequest, OllamaChatResponse, OllamaOptions } from '@/types';

// Configuration from environment variables
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_DEFAULT_MODEL = process.env.OLLAMA_DEFAULT_MODEL || 'starcoder2:3b';
const OLLAMA_TIMEOUT_MS = parseInt(process.env.OLLAMA_TIMEOUT_MS || '60000', 10);

// ============================================================================
// Error Classes
// ============================================================================

export class OllamaError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'OllamaError';
  }
}

export class OllamaConnectionError extends OllamaError {
  constructor(message = 'Unable to connect to Ollama service') {
    super(message);
    this.name = 'OllamaConnectionError';
  }
}

export class OllamaTimeoutError extends OllamaError {
  constructor(message = `Request to Ollama timed out after ${OLLAMA_TIMEOUT_MS}ms`) {
    super(message);
    this.name = 'OllamaTimeoutError';
  }
}

export class OllamaHttpError extends OllamaError {
  constructor(message: string, statusCode: number, public responseBody?: string) {
    super(message, statusCode);
    this.name = 'OllamaHttpError';
  }
}

// ============================================================================
// Generate Interfaces (not in types.ts)
// ============================================================================

export interface OllamaGenerateRequest {
  model?: string;
  prompt: string;
  stream?: boolean;
  options?: OllamaOptions;
}

export interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

// ============================================================================
// Ollama Client
// ============================================================================

export class OllamaClient {
  private baseUrl: string;
  private defaultModel: string;
  private timeoutMs: number;

  constructor(
    baseUrl: string = OLLAMA_BASE_URL,
    defaultModel: string = OLLAMA_DEFAULT_MODEL,
    timeoutMs: number = OLLAMA_TIMEOUT_MS
  ) {
    this.baseUrl = baseUrl;
    this.defaultModel = defaultModel;
    this.timeoutMs = timeoutMs;
  }

  /**
   * Make HTTP request with timeout and proper error handling
   */
  private async fetchWithTimeout(
    url: string,
    options: RequestInit
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new OllamaTimeoutError();
      }
      
      // Network/connection errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new OllamaConnectionError(`Failed to connect to ${this.baseUrl}`);
      }
      
      throw new OllamaConnectionError(
        `Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Handle HTTP error responses
   */
  private async handleHttpError(response: Response): Promise<never> {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new OllamaHttpError(
      `Ollama API error: ${response.status} ${response.statusText}`,
      response.status,
      errorText
    );
  }

  /**
   * Generate text (non-streaming)
   */
  async generate(request: OllamaGenerateRequest): Promise<OllamaGenerateResponse> {
    const response = await this.fetchWithTimeout(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: request.model || this.defaultModel,
        prompt: request.prompt,
        stream: false,
        options: request.options || {},
      }),
    });

    if (!response.ok) {
      await this.handleHttpError(response);
    }

    return response.json();
  }

  /**
   * Generate text (streaming)
   * Returns a ReadableStream of partial responses
   */
  async generateStream(
    request: OllamaGenerateRequest
  ): Promise<ReadableStream<OllamaGenerateResponse>> {
    const response = await this.fetchWithTimeout(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: request.model || this.defaultModel,
        prompt: request.prompt,
        stream: true,
        options: request.options || {},
      }),
    });

    if (!response.ok) {
      await this.handleHttpError(response);
    }

    if (!response.body) {
      throw new OllamaError('Response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = ''; // Buffer for incomplete lines across chunks

    return new ReadableStream({
      async pull(controller) {
        try {
          const { done, value } = await reader.read();
          
          if (done) {
            // Process any remaining buffer
            if (buffer.trim()) {
              try {
                const parsed = JSON.parse(buffer.trim()) as OllamaGenerateResponse;
                controller.enqueue(parsed);
              } catch (e) {
                // Ignore incomplete final line
              }
            }
            controller.close();
            return;
          }

          // Decode chunk and append to buffer
          buffer += decoder.decode(value, { stream: true });
          
          // Split on newlines, keeping incomplete line in buffer
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep last (potentially incomplete) line in buffer

          // Parse complete lines
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            
            try {
              const parsed = JSON.parse(trimmed) as OllamaGenerateResponse;
              controller.enqueue(parsed);
            } catch (e) {
              // Skip invalid JSON (shouldn't happen with proper Ollama responses)
              console.warn('[Ollama] Failed to parse stream line:', trimmed);
            }
          }
        } catch (error) {
          controller.error(
            error instanceof Error
              ? error
              : new OllamaError('Stream read error')
          );
        }
      },
      cancel() {
        reader.cancel();
      },
    });
  }

  /**
   * Chat (non-streaming)
   */
  async chat(request: OllamaChatRequest): Promise<OllamaChatResponse> {
    const response = await this.fetchWithTimeout(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: request.model || this.defaultModel,
        messages: request.messages,
        stream: false,
        options: request.options || {},
      }),
    });

    if (!response.ok) {
      await this.handleHttpError(response);
    }

    return response.json();
  }

  /**
   * Chat (streaming)
   * Returns a ReadableStream of partial chat responses
   */
  async chatStream(
    request: OllamaChatRequest
  ): Promise<ReadableStream<OllamaChatResponse>> {
    const response = await this.fetchWithTimeout(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: request.model || this.defaultModel,
        messages: request.messages,
        stream: true,
        options: request.options || {},
      }),
    });

    if (!response.ok) {
      await this.handleHttpError(response);
    }

    if (!response.body) {
      throw new OllamaError('Response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = ''; // Buffer for incomplete lines across chunks

    return new ReadableStream({
      async pull(controller) {
        try {
          const { done, value } = await reader.read();
          
          if (done) {
            // Process any remaining buffer
            if (buffer.trim()) {
              try {
                const parsed = JSON.parse(buffer.trim()) as OllamaChatResponse;
                controller.enqueue(parsed);
              } catch (e) {
                // Ignore incomplete final line
              }
            }
            controller.close();
            return;
          }

          // Decode chunk and append to buffer
          buffer += decoder.decode(value, { stream: true });
          
          // Split on newlines, keeping incomplete line in buffer
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep last (potentially incomplete) line in buffer

          // Parse complete lines
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            
            try {
              const parsed = JSON.parse(trimmed) as OllamaChatResponse;
              controller.enqueue(parsed);
            } catch (e) {
              // Skip invalid JSON (shouldn't happen with proper Ollama responses)
              console.warn('[Ollama] Failed to parse stream line:', trimmed);
            }
          }
        } catch (error) {
          controller.error(
            error instanceof Error
              ? error
              : new OllamaError('Stream read error')
          );
        }
      },
      cancel() {
        reader.cancel();
      },
    });
  }

  /**
   * List available models
   */
  async listModels(): Promise<{
    models: Array<{ name: string; size: number; modified_at: string }>;
  }> {
    const response = await this.fetchWithTimeout(`${this.baseUrl}/api/tags`, {
      method: 'GET',
    });

    if (!response.ok) {
      await this.handleHttpError(response);
    }

    return response.json();
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.listModels();
      return true;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const ollamaClient = new OllamaClient();
