
export const AVAILABLE_MODELS = [
    { id: 'claude-3-5-sonnet-20240620', label: 'Claude 3.5 Sonnet', provider: 'Anthropic' },
    { id: 'gpt-4o', label: 'GPT-4o', provider: 'OpenAI' },
    { id: 'qwen2.5-coder:32b', label: 'Qwen 2.5 Coder', provider: 'Ollama' },
    { id: 'llama3.1:70b', label: 'Llama 3.1 70B', provider: 'Ollama' },
    { id: 'deepseek-coder-v2', label: 'DeepSeek V2', provider: 'DeepSeek' }
];

export const DEFAULT_MODEL_ASSIGNMENTS = {
    PLAN: 'claude-3-5-sonnet-20240620',
    BUILD: 'qwen2.5-coder:32b',
    REVIEW: 'gpt-4o',
    DEPLOY: 'claude-3-5-sonnet-20240620'
};
