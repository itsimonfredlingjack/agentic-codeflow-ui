# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server on localhost:3000 (binds 0.0.0.0)
npm run build        # Production build
npm run serve        # Serve production build on 0.0.0.0:3001
npm run lint         # Run ESLint
```

Requires Ollama service running on localhost:11434 for LLM chat features.

## Environment Variables

```
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_DEFAULT_MODEL=qwen2.5-coder:3b
OLLAMA_TIMEOUT_MS=60000
```

## Architecture Overview

This is "Glass Pipeline" - a Next.js 16 AI agent workspace with glassmorphism UI. It implements an Orchestrator-Worker pattern using XState for state management and SSE for real-time event streaming.

### Core Pattern: Intent → Event Flow

```
User Input → AgentWorkspace.handleSend()
           → POST /api/command (AgentIntent)
           → HostRuntime.dispatch()
           → Terminal/Ollama execution
           → RuntimeEvent emitted via RxJS Subject
           → SSE /api/stream → AgencyClient
           → UI update
```

### Key Directories

- `/src/app/api/` - Backend API routes (run, events, stream, command, ollama)
- `/src/components/` - React components (MissionControl is main orchestrator)
- `/src/lib/` - Core services (runtime, ledger, terminal, ollama)
- `/src/machines/` - XState state machines

### State Machine Phases

The app uses phase-based UI with these states defined in `missionControlMachine.ts`:
- **plan** (Sapphire/blue) - Architecture and planning
- **build** (Emerald/green) - Code execution via terminal
- **review** (Amber/orange) - Security gates and approval
- **deploy** (Amethyst/purple) - Release management

### Critical Files

| File | Purpose |
|------|---------|
| `src/components/MissionControl.tsx` | Main orchestrator, XState machine, snapshot persistence |
| `src/components/AgentWorkspace.tsx` | Workspace UI, event subscription, chat handling |
| `src/machines/missionControlMachine.ts` | Primary XState orchestration machine |
| `src/lib/runtime.ts` | HostRuntime class - central event dispatcher |
| `src/lib/ledger.ts` | SQLite persistence (events, snapshots, runs) |
| `src/lib/terminal.ts` | TerminalService - subprocess execution |
| `src/lib/client.ts` | AgencyClient - browser-side SSE subscription |
| `src/types.ts` | Global types (AgentIntent, RuntimeEvent, etc.) |

### Type System

Key discriminated union types in `src/types.ts`:
- **AgentIntent** - Commands from UI to host (INTENT_EXEC_CMD, INTENT_OLLAMA_CHAT, etc.)
- **RuntimeEvent** - Events from host to UI (PROCESS_STARTED, STDOUT_CHUNK, etc.)
- **MessageHeader** - Metadata wrapper with sessionId, correlationId, timestamp

### Backend Services

- **HostRuntime** (`lib/runtime.ts`) - Singleton managing event dispatch and process execution
- **TaskLedger** (`lib/ledger.ts`) - SQLite-backed event log with in-memory fallback
- **TerminalService** (`lib/terminal.ts`) - Process spawning with tree-kill cleanup
- **OllamaClient** (`lib/ollama.ts`) - LLM API wrapper with connection/timeout error handling

### Input Mode Detection (AgentWorkspace)

User input is parsed for mode prefixes:
- `/llm <prompt>` or `/chat <prompt>` → Chat mode (INTENT_OLLAMA_CHAT)
- `/exec <cmd>` or `/cmd <cmd>` → Command mode (INTENT_EXEC_CMD)
- Bare text → Auto-routed based on current phase

### Persistence

- Sessions identified by `runId` (format: `RUN-xxx`)
- XState snapshots saved via `/api/run` with 1s debounce
- Event log stored in SQLite `event_log` table
- Auto-resume: loads latest run if no runId in query params

### Styling Conventions

Glassmorphism classes defined in `globals.css`:
- `.glass-panel` - Large backdrop-blur surfaces
- `.glass-card` - Smaller interactive cards
- Phase colors: Sapphire (plan), Emerald (build), Amber (review), Amethyst (deploy)
