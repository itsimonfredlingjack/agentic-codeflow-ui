---
name: parallel-agents
description: Coordinate multiple simultaneous agents for independent tasks. Use when facing multiple unrelated problems that can be investigated concurrently.
source: obra/superpowers
---

# Dispatching Parallel Agents

## When to Use

- Multiple unrelated failures across different components
- Issues that don't share dependencies or state
- Clear problem boundaries (different test files, subsystems, API routes)
- Tasks that won't interfere with each other's changes

## When NOT to Use

- Failures are related (fixing one might fix others)
- Agents would modify shared state or same files
- Dependencies between tasks exist
- Sequential investigation needed to understand root cause

## The Pattern

### 1. Identify Independent Domains

Group problems by what's broken:

```
Example: 6 test failures
├── API route tests (3 failures) → Agent 1
├── Component tests (2 failures) → Agent 2
└── Integration test (1 failure) → Agent 3
```

### 2. Create Focused Tasks

Each agent prompt must be:
- **Focused** - One clear problem domain
- **Self-contained** - All necessary context included
- **Specific** - Clear expected outputs

```markdown
Agent 1 Task:
"Fix the 3 failing API route tests in src/app/api/__tests__/.
The failures are related to SSE stream handling.
Expected: All tests pass, no changes to other files."
```

### 3. Dispatch in Parallel

Launch agents simultaneously using Task tool:

```typescript
// Dispatch multiple agents in single message
<Task prompt="Fix API route tests..." />
<Task prompt="Fix component tests..." />
<Task prompt="Fix integration test..." />
```

### 4. Review and Integrate

Before merging agent work:
- Verify fixes don't conflict
- Check no overlapping file changes
- Run full test suite
- Review each agent's changes independently

## Project-Specific Application

For Glass Pipeline's architecture:

| Domain | Scope | Example Task |
|--------|-------|--------------|
| State Machines | `src/machines/` | "Fix missionControlMachine transition bug" |
| API Routes | `src/app/api/` | "Debug /api/stream SSE disconnection" |
| UI Components | `src/components/` | "Fix AgentWorkspace re-render issue" |
| Core Services | `src/lib/` | "Optimize TerminalService process cleanup" |

## Success Criteria

- Each agent has single, clear domain
- No shared file modifications
- All agents complete independently
- Combined changes pass full test suite
- No merge conflicts between agent outputs

## Real-World Example

```
Problem: Build broken with 6 test failures

Analysis:
- 3 failures in ledger.test.ts (SQLite mocking)
- 2 failures in runtime.test.ts (event dispatch)
- 1 failure in client.test.ts (SSE parsing)

Dispatch:
- Agent 1: Fix ledger tests (isolated DB logic)
- Agent 2: Fix runtime tests (isolated dispatch logic)
- Agent 3: Fix client tests (isolated browser logic)

Result: All 3 agents work concurrently, ~3x faster than sequential
```

## Integration with XState

When orchestrating parallel work in this project:

```typescript
// The missionControlMachine could dispatch parallel agents per phase
// Each agent handles independent subsystem

// Plan phase: Dispatch analysis agents
// - Agent 1: Analyze API requirements
// - Agent 2: Analyze UI requirements
// - Agent 3: Analyze data model

// Build phase: Dispatch implementation agents
// - Agent 1: Build API routes
// - Agent 2: Build UI components
// - Agent 3: Build services
```
