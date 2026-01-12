---
name: prompt-engineering
description: Prompt engineering patterns for LLM applications. Use when working with Ollama integration, designing system prompts, or optimizing LLM interactions.
---

# Prompt Engineering Patterns

## When to Use

- Designing prompts for the Ollama integration (`lib/ollama.ts`)
- Optimizing chat interactions in AgentWorkspace
- Implementing structured reasoning (chain-of-thought)
- Building few-shot learning with dynamic examples
- Creating system prompts for agent personas

## Core Patterns

### Instruction Hierarchy

```
[System Context] → [Task Instruction] → [Examples] → [Input Data] → [Output Format]
```

### Few-Shot Learning

```typescript
const messages: OllamaChatMessage[] = [
  { role: 'system', content: 'You are a code review assistant.' },
  // Few-shot examples
  { role: 'user', content: 'Review: const x = 1' },
  { role: 'assistant', content: 'Simple assignment. Consider using descriptive name.' },
  { role: 'user', content: 'Review: let data = any' },
  { role: 'assistant', content: 'Avoid `any` type. Define proper interface.' },
  // Actual request
  { role: 'user', content: `Review: ${userCode}` }
];
```

### Chain-of-Thought

```typescript
const systemPrompt = `You are an expert developer.
When analyzing code:
1. First identify the primary purpose
2. Then examine the data flow
3. Check for potential issues
4. Provide actionable recommendations

Think step by step before responding.`;
```

### Progressive Disclosure

Start simple, add complexity only when needed:

1. **Level 1**: Direct instruction
   - "Explain this function"

2. **Level 2**: Add constraints
   - "Explain this function in 2 sentences, focus on the return value"

3. **Level 3**: Add reasoning
   - "Read this function, identify its purpose, then explain in 2 sentences"

4. **Level 4**: Add examples
   - Include example explanations for reference

### System Prompt Design for Agent Phases

```typescript
// Plan phase (Sapphire)
const planSystemPrompt = `You are an architect agent in PLAN phase.
Focus on: Requirements analysis, system design, task breakdown.
Output: Structured plans with clear milestones.
Constraints: Do not write implementation code yet.`;

// Build phase (Emerald)
const buildSystemPrompt = `You are an engineer agent in BUILD phase.
Focus on: Implementation, code generation, command execution.
Output: Working code with clear explanations.
Constraints: Follow the approved plan.`;

// Review phase (Amber)
const reviewSystemPrompt = `You are a critic agent in REVIEW phase.
Focus on: Security analysis, code quality, edge cases.
Output: Actionable feedback with severity ratings.
Constraints: Be thorough but constructive.`;
```

### Error Recovery Pattern

```typescript
const robustPrompt = `${mainInstruction}

If you cannot complete the task:
- State what information is missing
- Provide partial results if possible
- Suggest alternative approaches
- Rate your confidence (low/medium/high)`;
```

## Integration with RAG

```typescript
const ragPrompt = `Given the following context:
${retrievedContext}

Question: ${userQuestion}

Instructions:
- Answer based solely on the provided context
- Cite specific sources when possible
- If context is insufficient, state what's missing
- Do not hallucinate information`;
```

## Token Efficiency

- Remove redundant phrases
- Use consistent abbreviations after first definition
- Move stable content to system prompts
- Consolidate similar instructions

```typescript
// Before (verbose)
const prompt = `I would like you to please analyze the following code
and tell me what you think about it and if there are any issues...`;

// After (efficient)
const prompt = `Analyze this code. List issues found:`;
```

## Best Practices

1. **Be Specific**: Vague prompts produce inconsistent results
2. **Show, Don't Tell**: Examples > descriptions
3. **Test Extensively**: Evaluate on diverse inputs
4. **Iterate Rapidly**: Small changes have large impacts
5. **Version Control**: Treat prompts as code
6. **Document Intent**: Explain why prompts are structured

## Common Pitfalls

- Over-engineering before testing simple approaches
- Using examples that don't match target task
- Exceeding context limits with excessive examples
- Leaving room for multiple interpretations
- Not testing edge cases and unusual inputs

## Metrics to Track

- **Accuracy**: Correctness of outputs
- **Consistency**: Reproducibility across similar inputs
- **Latency**: Response time
- **Token Usage**: Cost efficiency
- **Success Rate**: Valid output percentage
