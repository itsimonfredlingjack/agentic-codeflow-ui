---
name: typescript-patterns
description: Advanced TypeScript patterns for type-safe development. Use when working with generics, conditional types, mapped types, or building type-safe APIs.
---

# TypeScript Advanced Patterns

## When to Use

- Building type-safe APIs and libraries
- Creating reusable generic components
- Implementing complex type inference
- Working with discriminated unions (like AgentIntent/RuntimeEvent)
- Designing builder patterns with type safety

## Core Patterns

### Generics with Constraints

```typescript
// Constrained generic for event handlers
type EventHandler<T extends RuntimeEvent> = (event: T) => void;

// Multiple type parameters
function createDispatcher<TIntent extends AgentIntent, TEvent extends RuntimeEvent>(
  handler: (intent: TIntent) => TEvent
): Dispatcher<TIntent, TEvent> { ... }
```

### Conditional Types

```typescript
// Extract payload type based on event type
type PayloadOf<T extends RuntimeEvent> =
  T extends { payload: infer P } ? P : never;

// Distributive conditional
type ExtractChunkEvents<T> = T extends { type: 'STDOUT_CHUNK' | 'STDERR_CHUNK' } ? T : never;
```

### Mapped Types

```typescript
// Make all properties optional and nullable
type PartialNullable<T> = {
  [K in keyof T]?: T[K] | null;
};

// Create event handlers for all event types
type EventHandlers = {
  [K in RuntimeEvent['type']]?: (event: Extract<RuntimeEvent, { type: K }>) => void;
};
```

### Template Literal Types

```typescript
// Type-safe event type strings
type PhaseEvent = `PHASE_${Uppercase<'plan' | 'build' | 'review' | 'deploy'>}`;
// Result: "PHASE_PLAN" | "PHASE_BUILD" | "PHASE_REVIEW" | "PHASE_DEPLOY"

// API route patterns
type APIRoute = `/api/${string}`;
```

### Discriminated Unions (Project Pattern)

```typescript
// This project uses discriminated unions extensively
type AgentIntent =
  | { type: 'INTENT_EXEC_CMD'; header: MessageHeader; command: string }
  | { type: 'INTENT_OLLAMA_CHAT'; header: MessageHeader; messages: OllamaChatMessage[] }
  | { type: 'INTENT_CANCEL'; header: MessageHeader };

// Type guard
function isExecIntent(intent: AgentIntent): intent is Extract<AgentIntent, { type: 'INTENT_EXEC_CMD' }> {
  return intent.type === 'INTENT_EXEC_CMD';
}
```

### Builder Pattern with Type Safety

```typescript
class EventBuilder<T extends Partial<RuntimeEvent> = {}> {
  private event: T = {} as T;

  withHeader(header: MessageHeader): EventBuilder<T & { header: MessageHeader }> {
    return Object.assign(new EventBuilder(), { event: { ...this.event, header } });
  }

  withType<TType extends RuntimeEvent['type']>(type: TType): EventBuilder<T & { type: TType }> {
    return Object.assign(new EventBuilder(), { event: { ...this.event, type } });
  }

  build(): T extends RuntimeEvent ? T : never {
    return this.event as any;
  }
}
```

## Utility Types Reference

```typescript
// Built-in utilities
Partial<T>      // All properties optional
Required<T>     // All properties required
Pick<T, K>      // Select specific properties
Omit<T, K>      // Exclude specific properties
Record<K, V>    // Object with keys K and values V
Extract<T, U>   // Extract types assignable to U
Exclude<T, U>   // Exclude types assignable to U
ReturnType<F>   // Get function return type
Parameters<F>   // Get function parameter types
Awaited<T>      // Unwrap Promise type
```

## Best Practices

1. Prefer `unknown` over `any` - force explicit type narrowing
2. Use `interface` for objects that will be extended, `type` for unions/intersections
3. Leverage `const` assertions for literal types: `as const`
4. Use type predicates for custom type guards
5. Avoid deep generic nesting (max 3 levels)
6. Test complex types with conditional type checks

## Common Pitfalls

- Using `any` to silence errors instead of fixing types
- Forgetting distributive behavior in conditional types
- Creating circular type references
- Over-engineering types for simple use cases
- Not using `strictNullChecks` (this project has it enabled)
