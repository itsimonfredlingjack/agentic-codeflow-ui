---
name: systematic-debugging
description: Rigorous debugging methodology. NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST. Use when facing bugs, test failures, or unexpected behavior.
source: obra/superpowers
---

# Systematic Debugging

## Golden Rule

```
NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST
```

## The Four Phases

### Phase 1: Root Cause Investigation

**MANDATORY before any fix attempt.**

```markdown
## Investigation Checklist

### Error Analysis
- [ ] Read complete error message (not just first line)
- [ ] Check stack trace for origin point
- [ ] Note error type and context

### Reproduction
- [ ] Can reproduce consistently?
- [ ] Minimal reproduction case?
- [ ] What exact steps trigger it?

### Recent Changes
- [ ] What changed recently? (git log, git diff)
- [ ] When did it last work?
- [ ] What's different now?

### Data Flow
- [ ] Trace input through system
- [ ] Where does data transform?
- [ ] Where does it break?
```

### Phase 2: Pattern Analysis

Find working examples, compare to broken.

```markdown
## Working vs Broken Comparison

| Aspect | Working | Broken |
|--------|---------|--------|
| Input format | | |
| State before | | |
| Dependencies | | |
| Environment | | |
| Config | | |

Key Difference Found: _______________
```

### Phase 3: Hypothesis & Testing

```markdown
## Hypothesis

"The bug occurs because [specific cause] which leads to [observed behavior]"

## Evidence For
-
-

## Evidence Against
-
-

## Minimal Test
Change only ONE thing to validate hypothesis:
- [ ] Test designed
- [ ] Result: Confirmed / Refuted
```

### Phase 4: Implementation

Only after root cause is confirmed:

```markdown
## Fix Plan

1. Write failing test that reproduces bug
2. Apply single, minimal fix
3. Verify test passes
4. Check for regressions
5. Document root cause for future
```

## Red Flags → Return to Phase 1

Stop immediately and restart investigation if you catch yourself:

- "Just try changing X"
- "Maybe if we add a null check here"
- "Let's see what happens if..."
- "It worked before, so just revert"
- "Add more logging and try again"
- Third fix attempt failed

**Three failed fixes = architectural problem, not coding error**

## Multi-Component Debugging

For systems like Glass Pipeline with multiple layers:

```markdown
## Component Isolation

| Layer | Status | Evidence |
|-------|--------|----------|
| UI (AgentWorkspace) | ✓/✗/? | |
| State (XState) | ✓/✗/? | |
| API Routes | ✓/✗/? | |
| Runtime (HostRuntime) | ✓/✗/? | |
| Services (Terminal, Ollama) | ✓/✗/? | |
| Database (SQLite) | ✓/✗/? | |

Isolation Method:
- Mock upstream components
- Verify each layer independently
- Narrow down to single failing component
```

## Root Cause Tracing

Work backwards from symptom:

```
Symptom: Chat messages not appearing
    ↑
Why? AgentWorkspace not receiving events
    ↑
Why? SSE stream disconnected
    ↑
Why? /api/stream returning 500
    ↑
Why? runtime.events$ throwing error
    ↑
Why? SQLite connection closed unexpectedly
    ↑
ROOT CAUSE: Connection pool exhausted due to leak
```

## Project-Specific Debug Points

### SSE/Event Issues

```typescript
// Check event flow
console.log('Runtime dispatch:', intent.type);
console.log('Event emitted:', event.type);
console.log('SSE sent:', JSON.stringify(event));
console.log('Client received:', lastEvent);
```

### XState Issues

```typescript
// Log state transitions
const actor = createActor(machine, {
  inspect: (event) => {
    if (event.type === '@xstate.transition') {
      console.log('Transition:', event.source, '→', event.target);
    }
  }
});
```

### SQLite Issues

```typescript
// Check ledger operations
console.log('appendEvent:', runId, event.type);
console.log('getRecentEvents count:', events.length);
console.log('Snapshot saved:', stateValue);
```

## Evidence Collection Template

```markdown
## Bug Report: [Title]

### Observed Behavior
What actually happens:

### Expected Behavior
What should happen:

### Reproduction Steps
1.
2.
3.

### Environment
- Node version:
- Browser:
- OS:

### Error Output
```
[paste full error]
```

### Recent Changes
- Last working commit:
- Suspect commits:

### Investigation Notes
Phase 1 findings:
Phase 2 findings:
Phase 3 hypothesis:

### Root Cause
[Only fill after confirmed]

### Fix Applied
[Only fill after root cause known]
```

## Common Patterns in This Codebase

| Symptom | Common Root Cause |
|---------|-------------------|
| Events not arriving | SSE connection dropped, check `/api/stream` |
| State not persisting | Snapshot save failed, check `/api/run` |
| UI not updating | useEffect deps missing, check AgentWorkspace |
| Commands not executing | TerminalService process spawn failed |
| Ollama timeout | Model not loaded, check `OLLAMA_BASE_URL` |

## Remember

```
Slow is smooth, smooth is fast.

Time spent investigating > Time spent guessing.

If you're frustrated, you're guessing.
Step back. Phase 1. Evidence first.
```
