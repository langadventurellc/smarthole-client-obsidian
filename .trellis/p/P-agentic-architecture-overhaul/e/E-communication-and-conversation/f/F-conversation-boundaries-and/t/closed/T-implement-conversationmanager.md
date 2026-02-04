---
id: T-implement-conversationmanager
title: Implement ConversationManager Core
status: done
priority: high
parent: F-conversation-boundaries-and
prerequisites:
  - T-add-conversation-data-types
affectedFiles:
  src/context/ConversationManager.ts: Created new ConversationManager class with
    conversation lifecycle management (load/save, addMessage, endConversation,
    getActiveConversation, getContextPrompt, getConversation,
    getRecentConversations, idle timeout detection, rolling limit enforcement)
  src/context/index.ts: Added export for ConversationManager class
log:
  - >-
    Implemented ConversationManager class with all required functionality:


    - Created ConversationManager class with private state (plugin,
    conversations array, activeConversationId)

    - Implemented load() / save() for persistence using plugin storage key
    "conversationData"

    - getActiveConversation() returns conversation where endedAt === null

    - addMessage(message) creates new conversation if idle timeout exceeded or
    no active, adds message to active conversation

    - endConversation() sets endedAt on active conversation

    - shouldStartNewConversation() checks idle timeout from settings

    - getIdleTimeoutMs() converts minutes setting to milliseconds

    - enforceConversationLimit() removes oldest ended conversations when
    exceeding max

    - getContextPrompt() returns only current conversation's messages formatted
    for LLM

    - getConversation(id) finds conversation by ID

    - getRecentConversations(limit) returns ended conversations sorted by
    recency


    All quality checks pass (lint, format, type-check) and build succeeds.
  - Implemented ConversationManager class that manages conversation lifecycle
    and boundaries. The class handles conversation creation based on idle
    timeout detection, explicit conversation endings, message addition, context
    prompt generation for LLM, and rolling limit enforcement to keep storage
    bounded. Uses the plugin storage key "conversationData" for persistence and
    follows the same patterns as the existing ConversationHistory class.
schema: v1.0
childrenIds: []
created: 2026-02-04T17:11:31.371Z
updated: 2026-02-04T17:11:31.371Z
---

# Implement ConversationManager Core

## Purpose

Create the `ConversationManager` class that manages conversation lifecycle, including creating new conversations, detecting boundaries via idle timeout, and handling explicit conversation endings.

## Implementation

### File: `src/context/ConversationManager.ts`

```typescript
export class ConversationManager {
  private plugin: SmartHolePlugin;
  private conversations: Conversation[];
  private activeConversationId: string | null;

  constructor(plugin: SmartHolePlugin);
  
  // Lifecycle
  async load(): Promise<void>;
  private async save(): Promise<void>;
  
  // Conversation Management
  getActiveConversation(): Conversation | null;
  async addMessage(message: ConversationMessage): Promise<Conversation>;
  async endConversation(generateSummary?: boolean): Promise<void>;
  
  // Boundary Detection
  private shouldStartNewConversation(): boolean;
  private getIdleTimeoutMs(): number;
  
  // Rolling Limit
  private enforceConversationLimit(): void;
  
  // Context for LLM
  getContextPrompt(): string;  // Only current conversation's messages
  
  // Accessors
  getConversation(id: string): Conversation | null;
  getRecentConversations(limit?: number): Conversation[];
}
```

### Conversation Lifecycle Rules

**Start new conversation when:**
- No active conversation exists
- Idle timeout exceeded since last message (check `messages[last].timestamp` vs now)
- Previous conversation was explicitly ended

**End conversation when:**
- `endConversation()` is called explicitly
- Idle timeout triggers on next message arrival (end old, start new)

### Boundary Detection Logic

```typescript
private shouldStartNewConversation(): boolean {
  if (!this.activeConversationId) return true;
  
  const active = this.getActiveConversation();
  if (!active || active.messages.length === 0) return true;
  
  const lastMessage = active.messages[active.messages.length - 1];
  const lastMessageTime = new Date(lastMessage.timestamp).getTime();
  const now = Date.now();
  const idleMs = this.getIdleTimeoutMs();
  
  return (now - lastMessageTime) > idleMs;
}
```

### Rolling Limit Enforcement

```typescript
private enforceConversationLimit(): void {
  const maxRetained = this.plugin.settings.maxConversationsRetained || 1000;
  
  // Only count ended conversations toward limit (keep active conversation)
  const endedConversations = this.conversations.filter(c => c.endedAt !== null);
  
  if (endedConversations.length > maxRetained) {
    // Sort by endedAt, remove oldest
    const sorted = [...endedConversations].sort((a, b) => 
      new Date(a.endedAt!).getTime() - new Date(b.endedAt!).getTime()
    );
    const toRemove = sorted.slice(0, endedConversations.length - maxRetained);
    const idsToRemove = new Set(toRemove.map(c => c.id));
    this.conversations = this.conversations.filter(c => !idsToRemove.has(c.id));
  }
}
```

### Context Prompt Generation

```typescript
getContextPrompt(): string {
  const active = this.getActiveConversation();
  if (!active || active.messages.length === 0) {
    return "";
  }
  
  const messageSection = active.messages
    .map(msg => {
      const tools = msg.toolsUsed?.length ? ` [used: ${msg.toolsUsed.join(", ")}]` : "";
      return `[${msg.timestamp}]\n${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}${tools}`;
    })
    .join("\n\n");
  
  return `## Current Conversation\n${messageSection}`;
}
```

### Persistence

- Store data key: `"conversationData"`
- Format: `PersistedConversations` from types.ts
- Call `save()` after any mutation

## Acceptance Criteria

- [ ] `ConversationManager` class created in `src/context/ConversationManager.ts`
- [ ] Can load/save conversation data from plugin storage
- [ ] `addMessage()` creates new conversation when needed (idle timeout or first message)
- [ ] `addMessage()` adds to existing active conversation within idle timeout
- [ ] `endConversation()` marks conversation as ended (sets `endedAt`)
- [ ] `getContextPrompt()` returns only current conversation's messages
- [ ] Rolling limit enforced when conversations exceed max retained
- [ ] `getConversation(id)` retrieves conversation by ID
- [ ] `getRecentConversations(limit)` returns most recent ended conversations
- [ ] Exported from `src/context/index.ts`

## Dependencies

- Requires data types from T-add-conversation-data-types (types must exist first)

## Technical Notes

- Conversation ID format: `conv-{Date.now()}` is simple and unique enough
- Active conversation is identified by `endedAt === null`
- Summary generation is handled in a separate task (this task just sets `endedAt`)
- This class does NOT replace ConversationHistory yet - integration happens in separate task