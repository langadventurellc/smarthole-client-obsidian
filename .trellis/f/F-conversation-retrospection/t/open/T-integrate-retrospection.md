---
id: T-integrate-retrospection
title: Integrate retrospection triggers into MessageProcessor
status: open
priority: high
parent: F-conversation-retrospection
prerequisites:
  - T-add-retrospection-settings
  - T-create-retrospectionservice
affectedFiles: {}
log: []
schema: v1.0
childrenIds: []
created: 2026-02-05T23:05:25.075Z
updated: 2026-02-05T23:05:25.075Z
---

Wire the RetrospectionService into MessageProcessor so retrospection fires on both conversation-end paths, and add the callback pattern for ChatView notification.

## Implementation Plan

### File: `src/processor/types.ts`

**1. Add `RetrospectionCallback` type** (after `AgentMessageCallback` at line ~71-75)

```typescript
/**
 * Callback type for retrospection completion notifications.
 * Used by ChatView to display retrospection insights as a system message.
 */
export type RetrospectionCallback = (result: {
  conversationTitle: string;
  content: string;
  timestamp: string;
}) => void;
```

### File: `src/processor/index.ts`

**2. Export the new type** (add to the type exports at line ~9-15)

```typescript
export type {
  // ... existing exports
  RetrospectionCallback,
} from "./types";
```

### File: `src/processor/MessageProcessor.ts`

**3. Add imports**

At the top, add:
```typescript
import { RetrospectionService } from "../retrospection";
import type { Conversation } from "../context";
import type { RetrospectionCallback } from "./types";
```

**4. Add callback array** (line ~50, after `agentMessageCallbacks`)

```typescript
private retrospectionCallbacks: RetrospectionCallback[] = [];
```

**5. Add `onRetrospection()` subscribe method** (after `onAgentMessage` at line ~116-122)

Follow the exact same pattern as `onResponse`, `onMessageReceived`, and `onAgentMessage`:

```typescript
/**
 * Register a callback for retrospection completion.
 * Used by ChatView to display retrospection results as system messages.
 * Returns an unsubscribe function.
 */
onRetrospection(callback: RetrospectionCallback): () => void {
  this.retrospectionCallbacks.push(callback);
  return () => {
    const idx = this.retrospectionCallbacks.indexOf(callback);
    if (idx >= 0) this.retrospectionCallbacks.splice(idx, 1);
  };
}
```

**6. Add `notifyRetrospection()` private method** (after `notifyResponseCallbacks` at line ~153-168)

```typescript
private notifyRetrospection(result: { conversationTitle: string; content: string; timestamp: string }): void {
  for (const callback of this.retrospectionCallbacks) {
    try {
      callback(result);
    } catch (err) {
      console.error("MessageProcessor: Retrospection callback error:", err);
    }
  }
}
```

**7. Add `runRetrospection()` method** (private async, after `notifyRetrospection`)

```typescript
private async runRetrospection(conversation: Conversation): Promise<void> {
  const service = new RetrospectionService(this.app, this.settings);
  const result = await service.runRetrospection(conversation);
  this.notifyRetrospection(result);
}
```

**8. Wire Trigger Path A: Explicit `end_conversation` tool**

In `processWithRetry()`, after the assistant message is recorded and before the `isWaitingForResponse` check (around line 411-428), add:

```typescript
// Check if end_conversation was called (conversation was explicitly ended)
if (
  this.settings.enableConversationRetrospection &&
  toolsUsed.includes("end_conversation")
) {
  // Retrieve the just-ended conversation by looking it up
  // The end_conversation tool sets endedAt and clears activeConversationId,
  // so we need to find the conversation that was just ended.
  // The tool call happened during processMessage(), before we recorded messages.
  // At this point, getActiveConversation() returns null because end_conversation ended it.
  // We need to find the ended conversation. The most recent ended conversation is the one.
  const recentEnded = this.conversationManager.getRecentConversations(1);
  const endedConversation = recentEnded[0];
  if (endedConversation) {
    void this.runRetrospection(endedConversation).catch((err) =>
      console.error("MessageProcessor: Retrospection failed:", err)
    );
  }
}
```

Important detail: The `end_conversation` tool is called **during** `llmService.processMessage()` (line 386). By the time we reach line 390+, the conversation has already been ended by the tool. The `toolsUsed` array (line 390) will contain `"end_conversation"` if it was called. We use `getRecentConversations(1)` to retrieve the just-ended conversation.

**9. Wire Trigger Path B: Idle timeout**

In `processWithRetry()`, **before** the user message is added to the conversation (line 401), capture the current active conversation ID. **After** the `addMessage` call, check if the active conversation changed:

```typescript
// Capture active conversation ID before addMessage (for idle timeout detection)
const activeConvIdBeforeAdd = this.conversationManager.getActiveConversation()?.id ?? null;

// Record user message in conversation
const userMessage: ConversationMessage = { ... };
await this.conversationManager.addMessage(userMessage, llmService);

// Check if idle timeout triggered a conversation end
if (
  this.settings.enableConversationRetrospection &&
  activeConvIdBeforeAdd !== null
) {
  const newActiveId = this.conversationManager.getActiveConversation()?.id ?? null;
  if (newActiveId !== activeConvIdBeforeAdd) {
    // The old conversation was ended due to idle timeout
    const endedConversation = this.conversationManager.getConversation(activeConvIdBeforeAdd);
    if (endedConversation) {
      void this.runRetrospection(endedConversation).catch((err) =>
        console.error("MessageProcessor: Retrospection failed:", err)
      );
    }
  }
}
```

Note: `ConversationManager.getConversation(id)` already exists at line 293 of `ConversationManager.ts`. No changes needed to `ConversationManager`.

### File: `src/main.ts`

**10. Add import for `RetrospectionCallback`**

```typescript
import {
  MessageProcessor,
  type ResponseCallback,
  type MessageReceivedCallback,
  type AgentMessageCallback,
  type RetrospectionCallback,  // ADD THIS
} from "./processor";
```

**11. Add `onRetrospection()` delegation method** (after `onAgentMessage` at line ~302-307)

Following the exact same delegation pattern as `onMessageResponse`, `onMessageReceived`, and `onAgentMessage`:

```typescript
/**
 * Subscribe to retrospection completion notifications.
 * Used by ChatView to display retrospection insights.
 * Returns an unsubscribe function.
 */
onRetrospection(callback: RetrospectionCallback): () => void {
  if (!this.messageProcessor) {
    return () => {};
  }
  return this.messageProcessor.onRetrospection(callback);
}
```

## Detailed processWithRetry() Change Locations

The critical section is in `processWithRetry()` (line 294-479). The changes go in two places:

**Location 1 (Idle timeout)**: Before line 401 (`await this.conversationManager.addMessage(userMessage, llmService)`) — capture the active ID. After line 401 — check if it changed.

**Location 2 (Explicit end)**: After line 411 (`await this.conversationManager.addMessage(assistantMessage)`) and the `toolsUsed` extraction at line 390 — check if `toolsUsed.includes("end_conversation")`.

## Non-Blocking Guarantee

- The retrospection call is wrapped in `void ... .catch(...)` — fire-and-forget
- Uses a separate `LLMService` instance (created inside `RetrospectionService`)
- If retrospection fails, error is logged to console but not surfaced to user
- The `processWithRetry` return happens immediately regardless of retrospection

## Prerequisites

- T-add-retrospection-settings (for `settings.enableConversationRetrospection`)
- T-create-retrospectionservice (for `RetrospectionService`)

## Acceptance Criteria

- [ ] `RetrospectionCallback` type exported from `src/processor/types.ts`
- [ ] `onRetrospection()` subscribe/unsubscribe method on `MessageProcessor`
- [ ] `notifyRetrospection()` notifies all callbacks with try/catch
- [ ] `runRetrospection()` creates `RetrospectionService` and calls `notifyRetrospection`
- [ ] Path A: `end_conversation` tool triggers retrospection
- [ ] Path B: Idle timeout triggers retrospection
- [ ] Both paths check `settings.enableConversationRetrospection` before proceeding
- [ ] `SmartHolePlugin.onRetrospection()` delegation method exists
- [ ] `mise run quality` passes