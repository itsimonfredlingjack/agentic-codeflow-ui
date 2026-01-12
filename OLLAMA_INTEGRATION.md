# Ollama Integration Guide

## Översikt

Ollama-integrationen gör det möjligt för GPT 5.2 att interagera med lokala AI-modeller (som `qwen2.5-coder:3b`) via backend och frontend i projektet.

## Konfiguration

### Förutsättningar

1. **Ollama måste köra** på `http://localhost:11434` (standard)
2. **qwen2.5-coder:3b måste vara installerad**: `ollama pull qwen2.5-coder:3b`

### Miljövariabler

**Viktigt:** Konfigurera Ollama URL via miljövariabel för bättre portabilitet.

1. **Kopiera exempelfilen:**
   ```bash
   cp .env.example .env.local
   ```

2. **Redigera `.env.local`** (denna fil ignoreras av git):
   ```bash
   # Ollama Configuration
   OLLAMA_BASE_URL=http://localhost:11434
   ```

3. **För remote Ollama eller annan port:**
   ```bash
   # Exempel: Ollama på annan maskin
   OLLAMA_BASE_URL=http://192.168.1.100:11434
   
   # Exempel: Ollama på annan port
   OLLAMA_BASE_URL=http://localhost:8080
   ```

**Varför miljövariabel?**
- Gör koden flyttbar - byt port/maskin utan kodändringar
- Säkerhet - känslig konfiguration hålls utanför git
- Flexibilitet - olika inställningar för dev/prod

**Standard:** Om `OLLAMA_BASE_URL` inte är satt, används `http://localhost:11434`

## API Endpoints

### POST `/api/ollama`

Generera text eller chatta med Ollama-modeller.

**Generate (text generation):**
```json
{
  "action": "generate",
  "model": "qwen2.5-coder:3b",
  "prompt": "Write a Python function to calculate fibonacci",
  "options": {
    "temperature": 0.7,
    "num_predict": 100
  }
}
```

**Chat (konversation):**
```json
{
  "action": "chat",
  "model": "qwen2.5-coder:3b",
  "messages": [
    { "role": "user", "content": "Hello, can you help me write code?" }
  ],
  "options": {
    "temperature": 0.7
  }
}
```

### GET `/api/ollama`

**Lista modeller:**
```
GET /api/ollama?action=models
```

**Health check:**
```
GET /api/ollama?action=health
```

## Användning från Frontend

### Via Agency Client (Event-driven)

```typescript
import { agencyClient } from '@/lib/client';

// Generate text
await agencyClient.send({
  type: 'INTENT_OLLAMA_GENERATE',
  model: 'qwen2.5-coder:3b',
  prompt: 'Write a Python function to reverse a string',
  options: { temperature: 0.7 }
});

// Chat
await agencyClient.send({
  type: 'INTENT_OLLAMA_CHAT',
  model: 'qwen2.5-coder:3b',
  messages: [
    { role: 'user', content: 'Hello!' }
  ]
});
```

### Via Direct API Call

```typescript
import { callOllama, listOllamaModels, checkOllamaHealth } from '@/lib/ollamaClient';

// Generate
const response = await callOllama({
  action: 'generate',
  model: 'qwen2.5-coder:3b',
  prompt: 'Write a Python function',
});

// Chat
const chatResponse = await callOllama({
  action: 'chat',
  model: 'qwen2.5-coder:3b',
  messages: [
    { role: 'user', content: 'Hello!' }
  ],
});

// List models
const models = await listOllamaModels();

// Health check
const health = await checkOllamaHealth();
```

## Events

När du använder event-driven approach (via `agencyClient.send`), kommer du att få events via SSE stream:

**Success:**
```typescript
{
  type: 'OLLAMA_RESPONSE',
  header: { ... },
  model: 'qwen2.5-coder:3b',
  response: 'Generated code here...',
  metadata: {
    total_duration: 1234,
    eval_count: 50,
    ...
  }
}
```

**Error:**
```typescript
{
  type: 'OLLAMA_ERROR',
  header: { ... },
  error: 'Error message',
  model: 'starcoder2:3b'
}
```

## Standardmodell

Om ingen modell anges, används **qwen2.5-coder:3b** som standard (perfekt för 6GB VRAM).

## Exempel: Använda från React Component

```typescript
'use client';

import { useState } from 'react';
import { callOllama } from '@/lib/ollamaClient';

export function CodeGenerator() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const generateCode = async () => {
    setLoading(true);
    try {
      const response = await callOllama({
        action: 'generate',
  model: 'qwen2.5-coder:3b',
        prompt: 'Write a Python function to sort a list',
      });
      
      if (response.success && response.response) {
        setCode(response.response);
      }
    } catch (error) {
      console.error('Failed to generate code:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={generateCode} disabled={loading}>
        {loading ? 'Generating...' : 'Generate Code'}
      </button>
      <pre>{code}</pre>
    </div>
  );
}
```

## Felsökning

### Ollama inte tillgänglig

Kontrollera att Ollama kör:
```bash
curl http://localhost:11434/api/tags
```

### Modell inte hittad

Kontrollera att modellen är installerad:
```bash
ollama list
```

Om `qwen2.5-coder:3b` saknas:
```bash
ollama pull qwen2.5-coder:3b
```

### CORS-problem

Ollama API körs lokalt, så CORS bör inte vara ett problem. Om du ändå får problem, kontrollera att Ollama är konfigurerad att acceptera requests från din frontend.

## Ytterligare information

- Ollama API dokumentation: https://github.com/ollama/ollama/blob/main/docs/api.md
- qwen2.5-coder:3b är optimerad för kodgenerering och passar perfekt i 6GB VRAM
