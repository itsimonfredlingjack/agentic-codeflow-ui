# Glass Pipeline

An AI agent workspace built with Next.js 16, featuring an industrial retro UI with glassmorphism design. Uses an Orchestrator-Worker pattern with XState for state management and SSE for real-time event streaming.

## Features

- **Phase-Based Workflow** - Four distinct phases: Plan (Sapphire), Build (Emerald), Review (Amber), Deploy (Amethyst)
- **Real-Time Streaming** - SSE-based event streaming for live updates
- **LLM Integration** - Ollama chat integration for local AI models
- **Terminal Execution** - Execute shell commands with process management
- **Session Persistence** - SQLite event log with auto-resume capability
- **Security Gates** - Permission requests for risky operations
- **Rate Limiting** - Configurable request throttling per endpoint
- **Audit Logging** - Security event logging for command execution

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **State Management:** XState 5
- **Streaming:** RxJS + Server-Sent Events
- **Database:** better-sqlite3
- **Validation:** Zod
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
# Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_DEFAULT_MODEL=qwen2.5-coder:3b
OLLAMA_TIMEOUT_MS=60000

# Data Storage (optional)
DB_PATH=/custom/path/ledger.db       # Override database location
AUDIT_LOG_PATH=/custom/audit.log     # Override audit log location
DISABLE_AUDIT_LOG=true               # Disable audit logging
```

## Data Storage

Application data is stored securely outside the web root:

```
~/.glass-pipeline/
├── task_ledger.db    # SQLite database
└── audit.log         # Security audit log (JSON lines)
```

## Security

### Features

- **Command Validation** - Zod schema validation on all API inputs
- **Rate Limiting** - In-memory rate limiter with configurable limits
- **Audit Logging** - All commands logged to `~/.glass-pipeline/audit.log`
- **CSP Headers** - Content Security Policy and security headers via Next.js
- **Symlink Protection** - Path traversal and symlink bypass prevention
- **Environment Sanitization** - Sensitive env vars stripped from spawned processes
- **Permission System** - Dangerous commands require explicit approval

### Command Security

Commands are categorized into three tiers:

| Tier | Description | Examples |
|------|-------------|----------|
| **Allowed** | Safe, runs immediately | `ls`, `cat`, `git status`, `npm test` |
| **Permission Required** | Needs user approval | `npm install`, `docker`, `chmod` |
| **Denied** | Blocked entirely | `rm -rf`, `sudo`, `curl \| sh`, `mkfs` |

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
├── app/api/          # API routes (command, stream, ollama, run, apply)
├── components/       # React components
│   ├── MissionControl.tsx   # Main orchestrator
│   └── AgentWorkspace.tsx   # Chat UI & event handling
├── machines/         # XState state machines
├── lib/              # Core services
│   ├── runtime.ts         # Event dispatcher
│   ├── runtimeManager.ts  # Process cleanup (SIGTERM/SIGINT/HMR)
│   ├── ledger.ts          # SQLite persistence with indexes
│   ├── terminal.ts        # Process execution with PID validation
│   ├── ollama.ts          # LLM client
│   ├── securityConfig.ts  # Command allow/deny lists
│   ├── rateLimit.ts       # Request rate limiting
│   └── auditLog.ts        # Security audit logging
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
