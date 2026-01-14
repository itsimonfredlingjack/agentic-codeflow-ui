# Glass Pipeline

An AI agent workspace built with Next.js 16, featuring an industrial retro UI with glassmorphism design. Uses an Orchestrator-Worker pattern with XState for state management and SSE for real-time event streaming.

## Features

- **Phase-Based Workflow** - Four distinct phases: Plan (Sapphire), Build (Emerald), Review (Amber), Deploy (Amethyst)
- **Real-Time Streaming** - SSE-based event streaming for live updates
- **LLM Integration** - Ollama chat integration for local AI models
- **Terminal Execution** - Execute shell commands with process management
- **Session Persistence** - SQLite event log with auto-resume capability
- **Security Gates** - Permission requests for risky operations

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **State Management:** XState 5
- **Streaming:** RxJS + Server-Sent Events
- **Database:** better-sqlite3
- **Styling:** Tailwind CSS + Glassmorphism
- **Animation:** Framer Motion

## Getting Started

### Prerequisites

- Node.js 18+
- Ollama running on `localhost:11434`

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Production

```bash
npm run build
npm run serve  # Serves on port 3001
```

## Environment Variables

```env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_DEFAULT_MODEL=qwen2.5-coder:3b
OLLAMA_TIMEOUT_MS=60000
```

## Architecture

### Intent → Event Flow

```
User Input → POST /api/command → HostRuntime → Terminal/Ollama
                                      ↓
                              RuntimeEvent (RxJS)
                                      ↓
                              SSE /api/stream → UI
```

### Project Structure

```
src/
├── app/api/          # API routes (command, stream, ollama, run)
├── components/       # React components
│   ├── MissionControl.tsx   # Main orchestrator
│   └── AgentWorkspace.tsx   # Chat UI & event handling
├── machines/         # XState state machines
├── lib/              # Core services
│   ├── runtime.ts    # Event dispatcher
│   ├── ledger.ts     # SQLite persistence
│   ├── terminal.ts   # Process execution
│   └── ollama.ts     # LLM client
└── types.ts          # Shared types
```

### Input Modes

- `/llm <prompt>` or `/chat <prompt>` - Chat with LLM
- `/exec <cmd>` or `/cmd <cmd>` - Execute shell command
- Bare text - Auto-routed based on current phase

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (port 3000) |
| `npm run build` | Production build |
| `npm run serve` | Serve production build (port 3001) |
| `npm run lint` | Run ESLint |

## License

MIT
