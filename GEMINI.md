# Project Context: AgencyOS - Glass Pipeline

## Overview
**AgencyOS: Project Glass Pipeline** is a futuristic, glassmorphism-based AI Agent Workspace designed as a hybrid Terminal/Desktop interface. It re-imagines the developer experience for the Agentic Era by moving beyond simple chat to a robust, state-managed environment where AI agents (PLAN, BUILD, REVIEW, DEPLOY) collaborate with the user.

## Tech Stack
- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **State Management:** XState (Federated Orchestrator pattern)
- **Styling:** Tailwind CSS v4 + CSS Variables (Glassmorphism)
- **Animation:** Framer Motion
- **Icons:** Lucide React
- **Persistence:** Better SQLite3 (Task Ledger)

## Key Concepts & Architecture
The application uses an **Orchestrator-Worker** pattern:
- **Mission Control (`MissionControl.tsx`):** Acts as the UI orchestrator, maintaining the global state machine (`missionControlMachine.ts`).
- **Phases & Auras:**
  - **PLAN (Sapphire):** Architecture and Blueprinting.
  - **BUILD (Emerald):** Coding and Terminal execution.
  - **REVIEW (Amber):** Security checks and Artifact hand-offs.
  - **DEPLOY (Amethyst):** Release management.
- **Semantic Cards:** Visual representations of agent outputs (e.g., `BlueprintCard`, `BuildStatusCard`, `SecurityGateCard`).
- **Shadow Terminal:** A dual-mode view offering both a "Raw" terminal output and a "Card" view for structured data.

## Development Workflow

### Build & Run
- **Install Dependencies:** `npm install`
- **Development Server:** `npm run dev` (Runs on `http://localhost:3000`)
- **Build for Production:** `npm run build`
- **Start Production Server:** `npm run start`
- **Linting:** `npm run lint`

### Project Structure
- `src/app/`: Next.js App Router pages and layouts.
- `src/components/`: UI components (AgentControl, ShadowTerminal, SemanticCards, etc.).
- `src/machines/`: XState machine definitions (`missionControlMachine.ts`).
- `src/lib/`: Utilities and backend logic (`db.ts`, `sentinel.ts`).
- `FULL PLAN/`: Contains detailed architectural roadmaps and optimization strategies.

## Roadmap & Optimization Goals
Reference `FULL PLAN/AI Agentic Workflow Optimization Full Plan.txt` for the detailed architectural vision. Key goals include:
1.  **Strict State Management:** Migrating fully to persistent XState machines.
2.  **Local-First:** Using SQLite for a persistent "Task Ledger" to enable session recovery and "time travel".
3.  **Agent Roles:** Distinct cognitive architectures for PLAN (Divergent/Tree of Thoughts) and BUILD (Convergent/ReAct) agents.
4.  **Security:** Implementing a "Tint Layer" for permissions and a sandboxed execution model.
