---
name: subagent-driven-development
description: Core pattern for multi-agent development. Fresh subagent per task with two-stage review (spec compliance + code quality). Use when executing implementation plans.
source: obra/superpowers
---

# Subagent-Driven Development

## Core Pattern

```
Fresh subagent per task + two-stage review (spec then quality) = high quality, fast iteration
```

## When to Use

- You have a documented implementation plan
- Tasks are mostly independent (not tightly coupled)
- Work stays within current session
- Quality gates are important

## When NOT to Use

- Highly coupled tasks requiring shared context
- Exploratory work without clear spec
- Single small change (overkill)

## The Workflow

### Per Task Cycle

```
┌─────────────────┐
│  1. IMPLEMENT   │  Fresh subagent handles coding
│     Subagent    │  Asks clarifying questions upfront
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  2. SPEC REVIEW │  Does code match requirements?
│                 │  No more, no less
└────────┬────────┘
         │ Pass?
         ▼
┌─────────────────┐
│ 3. QUALITY      │  Code craftsmanship
│    REVIEW       │  Maintainability
└────────┬────────┘
         │ Pass?
         ▼
┌─────────────────┐
│  4. FIX LOOP    │  Same implementer fixes issues
│  (if needed)    │  Re-review until approved
└─────────────────┘
```

### Decision Flow

```
Has implementation plan?
├─ No → Create plan first (use planning skill)
└─ Yes → Tasks independent?
         ├─ Yes → Use subagent-driven-development
         └─ No → Consider sequential execution or refactor plan
```

## Critical Rules

1. **Never skip reviews** - Both spec and quality reviews are mandatory
2. **Spec before quality** - Don't assess craftsmanship until requirements pass
3. **Same implementer fixes** - The subagent that wrote it, fixes it
4. **Answer questions fully** - If subagent asks, answer completely before proceeding
5. **Issues = not done** - "Spec reviewer found issues = not done"

## Implementation

### Dispatching a Task

```markdown
Task: Implement user authentication endpoint

Context:
- Plan reference: Section 2.3 of implementation plan
- Dependencies: User model exists, JWT library installed
- Acceptance criteria:
  1. POST /api/auth/login accepts email/password
  2. Returns JWT token on success
  3. Returns 401 on invalid credentials
  4. Rate limited to 5 attempts per minute

Instructions:
- Ask clarifying questions before coding
- Write tests first (TDD)
- Implement minimal solution meeting criteria
- Signal when ready for review
```

### Spec Review Checklist

```markdown
## Spec Compliance Review

Task: [Task name]
Implementer: [Subagent ID]

### Requirements Check
- [ ] Criterion 1 met
- [ ] Criterion 2 met
- [ ] Criterion 3 met

### Scope Check
- [ ] No extra features added
- [ ] No requirements missed
- [ ] No gold-plating

### Verdict
- [ ] PASS - Proceed to quality review
- [ ] FAIL - Return to implementer with specific issues
```

### Quality Review Checklist

```markdown
## Code Quality Review

### Craftsmanship
- [ ] Clear naming conventions
- [ ] Appropriate abstraction level
- [ ] No code duplication
- [ ] Error handling present

### Maintainability
- [ ] Tests are meaningful
- [ ] Code is readable
- [ ] Dependencies are appropriate
- [ ] No obvious performance issues

### Verdict
- [ ] PASS - Task complete
- [ ] FAIL - Return to implementer with specific issues
```

## Integration with Glass Pipeline

### Mapping to XState Phases

```typescript
// Plan phase → Create implementation plan
// Build phase → Execute with subagent-driven-development

const buildPhaseWorkflow = {
  // For each task in plan:
  dispatch: "Fresh subagent for implementation",
  specReview: "Verify against acceptance criteria",
  qualityReview: "Assess code quality",
  fixLoop: "Same subagent addresses issues",
};
```

### Event Flow

```typescript
// Dispatch implementation subagent
{ type: 'INTENT_DISPATCH_SUBAGENT', task: taskSpec }

// Subagent signals completion
{ type: 'SUBAGENT_IMPLEMENTATION_COMPLETE', taskId }

// Trigger spec review
{ type: 'INTENT_SPEC_REVIEW', taskId }

// Review results
{ type: 'SPEC_REVIEW_PASSED', taskId }
// or
{ type: 'SPEC_REVIEW_FAILED', taskId, issues: [...] }
```

## Anti-Patterns

### DON'T: Skip to Quality Review

```markdown
❌ "Code looks clean, ship it"
✓ "First verify it meets spec, then assess quality"
```

### DON'T: Different Agent Fixes

```markdown
❌ Dispatch new subagent to fix issues
✓ Same implementer has context, they fix it
```

### DON'T: Proceed with Known Issues

```markdown
❌ "Minor issue, we'll fix later"
✓ "Issue found = fix now, then re-review"
```

## Batch Execution

For multiple independent tasks:

```markdown
Batch Strategy:
1. Dispatch subagents for tasks 1-3 in parallel
2. As each completes, run spec review
3. Quality review only after spec passes
4. Human checkpoint after batch completes
5. Proceed to next batch (tasks 4-6)
```

## Metrics

Track per task:
- Implementation time
- Review cycles needed
- Issues found (spec vs quality)
- Fix iteration count

Healthy targets:
- Most tasks pass spec review first try
- Quality issues < spec issues
- Average 1.2 review cycles per task
