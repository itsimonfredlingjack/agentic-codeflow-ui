import { NextRequest, NextResponse } from 'next/server';
import { ollamaClient } from '@/lib/ollama';

export const dynamic = 'force-dynamic';

/**
 * POST /api/ollama
 * Generate text or chat with Ollama models
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, model, prompt, messages, options } = body;

    // Default to starcoder2:3b if no model specified
    const targetModel = model || 'starcoder2:3b';

    if (action === 'generate') {
      if (!prompt) {
        return NextResponse.json(
          { error: 'Missing prompt for generate action' },
          { status: 400 }
        );
      }

      const response = await ollamaClient.generate({
        model: targetModel,
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
      if (!messages || !Array.isArray(messages)) {
        return NextResponse.json(
          { error: 'Missing or invalid messages for chat action' },
          { status: 400 }
        );
      }

      const response = await ollamaClient.chat({
        model: targetModel,
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
  } catch (error: any) {
    console.error('[Ollama API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to communicate with Ollama' },
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
        baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "models" or "health"' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('[Ollama API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to communicate with Ollama' },
      { status: 500 }
    );
  }
}
