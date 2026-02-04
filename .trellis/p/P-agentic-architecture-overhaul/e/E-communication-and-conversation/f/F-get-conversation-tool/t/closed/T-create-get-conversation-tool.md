---
id: T-create-get-conversation-tool
title: Create get_conversation tool implementation
status: done
priority: high
parent: F-get-conversation-tool
prerequisites: []
affectedFiles:
  src/llm/tools/getConversation.ts: Created new tool implementation with
    GetConversationContext interface, GetConversationInput type, tool
    definition, and createGetConversationTool factory function. Supports
    get-by-ID and list-recent modes with proper validation and error handling.
log:
  - "Created the get_conversation tool implementation that allows the agent to
    retrieve past conversation details. The tool supports two modes: (1)
    retrieving a specific conversation by ID with full message history, or (2)
    listing recent conversations with summaries only. Implemented with proper
    validation, error handling, and follows the established tool patterns from
    endConversation.ts."
schema: v1.0
childrenIds: []
created: 2026-02-04T18:39:47.786Z
updated: 2026-02-04T18:39:47.786Z
---

# Create get_conversation tool implementation

## Overview
Create the `getConversation.ts` file implementing the tool that allows the agent to retrieve past conversation details.

## Location
`src/llm/tools/getConversation.ts`

## Implementation Details

### Context Interface
```typescript
export interface GetConversationContext {
  conversationManager: ConversationManager;
}
```

### Input Schema
```typescript
export interface GetConversationInput {
  conversation_id?: string;      // Specific conversation to retrieve
  list_recent?: number;          // List N most recent conversations (summaries only)
}
```

### Tool Behavior

**When `conversation_id` provided:**
- Call `conversationManager.getConversation(id)` to get full conversation
- Return full conversation history with all messages, timestamps, roles, content
- Include summary and title if available
- Return error message if conversation not found

**When `list_recent` provided:**
- Call `conversationManager.getRecentConversations(limit)` to get recent completed conversations
- Return list of conversation summaries (id, title, summary, startedAt, endedAt, message count)
- Exclude full message content
- Default to 10 if not specified or invalid

**When neither provided:**
- Treat as `list_recent=10` (default behavior)

### Response Format

**For single conversation (JSON stringified):**
```typescript
{
  id: string;
  title: string | null;
  summary: string | null;
  startedAt: string;
  endedAt: string | null;
  messages: Array<{
    timestamp: string;
    role: 'user' | 'assistant';
    content: string;
    toolsUsed?: string[];
  }>;
}
```

**For list (JSON stringified):**
```typescript
{
  conversations: Array<{
    id: string;
    title: string | null;
    summary: string | null;
    startedAt: string;
    endedAt: string | null;
    messageCount: number;
  }>;
}
```

### Code Structure
Follow the pattern from `endConversation.ts`:
- Section comments for Context Interface, Input Types, Tool Definition, Tool Factory
- Export context interface and input type
- Tool name: `get_conversation`
- Description should explain both modes (get by ID, list recent)

### Validation
- Only completed conversations accessible (filter out active conversation when listing)
- Validate `conversation_id` is a non-empty string if provided
- Validate `list_recent` is a positive number if provided, default to 10 otherwise

## Acceptance Criteria
- [ ] Tool file created following existing patterns
- [ ] Context interface defined with ConversationManager dependency
- [ ] Both input modes work (get by ID, list recent)
- [ ] Proper error handling for not-found conversations
- [ ] Response formats match specification
- [ ] TypeScript types exported for external use