import { NextRequest, NextResponse } from 'next/server';
import { ollamaClient, OllamaError, OllamaTimeoutError, OllamaConnectionError, OllamaHttpError } from '@/lib/ollama';
import type { OllamaChatMessage, OllamaChatRole } from '@/types';

export const dynamic = 'force-dynamic';

// Valid roles for chat messages
const VALID_ROLES: OllamaChatRole[] = ['system', 'user', 'assistant'];

/**
 * Type guard for OllamaHttpError with statusCode
 */
function isHttpErrorWithStatus(error: unknown): error is OllamaHttpError & { statusCode: number } {
  return error instanceof OllamaHttpError && typeof (error as OllamaHttpError).statusCode === 'number';
}

/**
 * Validate chat messages structure
 */
function validateMessages(messages: unknown): messages is OllamaChatMessage[] {
  if (!Array.isArray(messages) || messages.length === 0) {
    return false;
  }
  
  return messages.every((msg) => {
    if (typeof msg !== 'object' || msg === null) return false;
    const m = msg as Record<string, unknown>;
    return (
      typeof m.role === 'string' &&
      VALID_ROLES.includes(m.role as OllamaChatRole) &&
      typeof m.content === 'string'
    );
  });
}

/**
 * Validate model parameter
 */
function validateModel(model: unknown): model is string | undefined {
  return model === undefined || typeof model === 'string';
}

/**
 * Validate options parameter
 */
function validateOptions(options: unknown): options is Record<string, unknown> | undefined {
  return options === undefined || (typeof options === 'object' && options !== null && !Array.isArray(options));
}

/**
 * POST /api/ollama
 * Generate text or chat with Ollama models
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, model, prompt, messages, options } = body;

    // Validate model
    if (!validateModel(model)) {
      return NextResponse.json(
        { error: 'Invalid model parameter. Must be a string or undefined.' },
        { status: 400 }
      );
    }

    // Validate options
    if (!validateOptions(options)) {
      return NextResponse.json(
        { error: 'Invalid options parameter. Must be an object or undefined.' },
        { status: 400 }
      );
    }

    if (action === 'generate') {
      if (!prompt || typeof prompt !== 'string') {
        return NextResponse.json(
          { error: 'Missing or invalid prompt for generate action. Must be a non-empty string.' },
          { status: 400 }
        );
      }

      const response = await ollamaClient.generate({
        model,
        prompt,
        stream: false,
        options: options || {},
      });

      return NextResponse.json({
        success: true,
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
    }

    if (action === 'chat') {
      if (!validateMessages(messages)) {
        return NextResponse.json(
          { error: 'Missing or invalid messages for chat action. Must be a non-empty array of {role, content} objects with valid roles (system, user, assistant).' },
          { status: 400 }
        );
      }

      const response = await ollamaClient.chat({
        model,
        messages,
        stream: false,
        options: options || {},
      });

      return NextResponse.json({
        success: true,
        model: response.model,
        message: response.message,
        metadata: {
          total_duration: response.total_duration,
          load_duration: response.load_duration,
          prompt_eval_count: response.prompt_eval_count,
          eval_count: response.eval_count,
        },
      });
    }

     return NextResponse.json(
       { error: 'Invalid action. Use "generate" or "chat"' },
       { status: 400 }
     );
   } catch (error) {
     console.error('[Ollama API] Error:', error);

     if (error instanceof OllamaTimeoutError) {
       return NextResponse.json(
         { error: 'Request to Ollama timed out. Please try again.' },
         { status: 504 }
       );
     }

     if (error instanceof OllamaConnectionError) {
       return NextResponse.json(
         { error: 'Unable to connect to Ollama. Please check that Ollama is running.' },
         { status: 503 }
       );
     }

     if (isHttpErrorWithStatus(error)) {
       // Map HTTP errors to appropriate status codes
       const status = error.statusCode >= 400 && error.statusCode < 500 
         ? error.statusCode 
         : 502; // Bad Gateway for 5xx from Ollama
       return NextResponse.json(
         { error: 'Ollama service error. Please check your request.' },
         { status }
       );
     }

     if (error instanceof OllamaError) {
       return NextResponse.json(
         { error: 'Ollama service error. Please check your request.' },
         { status: 500 }
       );
     }

     return NextResponse.json(
       { error: 'An unexpected error occurred while communicating with Ollama.' },
       { status: 500 }
     );
   }
}

/**
 * GET /api/ollama
 * List available models or check health
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'models';

    if (action === 'models') {
      const models = await ollamaClient.listModels();
      return NextResponse.json({
        success: true,
        models: models.models,
      });
    }

    if (action === 'health') {
      const isHealthy = await ollamaClient.healthCheck();
      return NextResponse.json({
        success: true,
        healthy: isHealthy,
      });
    }

     return NextResponse.json(
       { error: 'Invalid action. Use "models" or "health"' },
       { status: 400 }
     );
   } catch (error) {
     console.error('[Ollama API] Error:', error);

     if (error instanceof OllamaTimeoutError) {
       return NextResponse.json(
         { error: 'Request to Ollama timed out. Please try again.' },
         { status: 504 }
       );
     }

     if (error instanceof OllamaConnectionError) {
       return NextResponse.json(
         { error: 'Unable to connect to Ollama. Please check that Ollama is running.' },
         { status: 503 }
       );
     }

     if (isHttpErrorWithStatus(error)) {
       // Map HTTP errors to appropriate status codes
       const status = error.statusCode >= 400 && error.statusCode < 500 
         ? error.statusCode 
         : 502; // Bad Gateway for 5xx from Ollama
       return NextResponse.json(
         { error: 'Ollama service error. Please check your request.' },
         { status }
       );
     }

     if (error instanceof OllamaError) {
       return NextResponse.json(
         { error: 'Ollama service error. Please check your request.' },
         { status: 500 }
       );
     }

     return NextResponse.json(
       { error: 'An unexpected error occurred while communicating with Ollama.' },
       { status: 500 }
     );
   }
}
