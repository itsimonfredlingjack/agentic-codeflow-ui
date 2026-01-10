# Glass Pipeline 💎

> **AgencyOS: Project Glass Pipeline**
> A futuristic, glassmorphism-based AI Agent Workspace.

![Glass Console](https://via.placeholder.com/800x400?text=Glass+Console+UI)
*Note: This is a UI concept. Connect your own backend agents to bring it to life.*

## Overview

The **Glass Pipeline** re-imagines the developer experience for the Agentic Era. It moves beyond simple text chat, offering a hybrid **Terminal/Desktop** interface where AI agents work alongside you in real-time.

### Key Features

- **🔮 Central Glass Console**: A unified workspace combining chat, terminal, and rich UI cards.
- **⚡ Phase-Adaptive UI**: The interface morphs based on the agent's mode:
    - **PLAN (Sapphire)**: Architecture and Blueprinting.
    - **BUILD (Emerald)**: Coding and Terminal execution.
    - **REVIEW (Amber)**: Security checks and Artifact hand-offs.
    - **DEPLOY (Amethyst)**: Release management.
- **🃏 Semantic Stream Cards**:
    - **BlueprintCard**: Visualizes architecture JSONs.
    - **BuildStatusCard**: Live progress bars for long-running tasks.
    - **SecurityGateCard**: Policy check visualizations.
    - **CodeBlockCard**: VS Code-style windows with syntax highlighting.
- **🤖 AI Avatar**: A living, geometric hologram that represents the agent's cognitive state.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **State Management**: XState (Federated Orchestrator)
- **Styling**: TailwindCSS + CSS Variables (Glassmorphism)
- **Animation**: Framer Motion

## Getting Started

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Run Development Server**
   ```bash
   npm run dev
   ```

3. **Open the Console**
   Navigate to `http://localhost:3000`.

## Architecture

The application uses an **Orchestrator-Worker** pattern. `MissionControl.tsx` serves as the orchestrator (UI), maintaining the state machine (`missionControlMachine.ts`). It simulates agent events via a seeded loop, pushing structured data to the `AgentWorkspace`.

## "The Masterpiece"

This project was built as a demonstration of "Creative AI UI". It focuses on aesthetics (Glass, Glow, Blur) and interaction density (Haptic feedback, Semantic cards) to create a premium feel.
