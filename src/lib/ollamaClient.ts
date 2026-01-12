// src/lib/ollamaClient.ts
// Client-side helper for calling Ollama API

export interface OllamaRequest {
  action: 'generate' | 'chat';
  model?: string;
  prompt?: string;
  messages?: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    num_predict?: number;
  };
}

export interface OllamaResponse {
  success: boolean;
  model?: string;
  response?: string;
  message?: { role: string; content: string };
  metadata?: Record<string, unknown>;
  error?: string;
}

/**
 * Call Ollama API from client
 */
export async function callOllama(request: OllamaRequest): Promise<OllamaResponse> {
  const response = await fetch('/api/ollama', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    return {
      success: false,
      error: error.error || 'Failed to call Ollama API',
    };
  }

  return response.json();
}

/**
 * List available Ollama models
 */
export async function listOllamaModels(): Promise<{ success: boolean; models?: Array<{ name: string }>; error?: string }> {
  const response = await fetch('/api/ollama?action=models', {
    method: 'GET',
  });

  if (!response.ok) {
    const error = await response.json();
    return {
      success: false,
      error: error.error || 'Failed to list models',
    };
  }

  return response.json();
}

/**
 * Check Ollama health
 */
export async function checkOllamaHealth(): Promise<{ success: boolean; healthy?: boolean; error?: string }> {
  const response = await fetch('/api/ollama?action=health', {
    method: 'GET',
  });

  if (!response.ok) {
    return {
      success: false,
      healthy: false,
      error: 'Ollama not available',
    };
  }

  return response.json();
}
