---
id: F-get-conversation-tool
title: Get Conversation Tool
status: in-progress
priority: medium
parent: E-communication-and-conversation
prerequisites:
  - F-conversation-boundaries-and
affectedFiles:
  src/llm/tools/getConversation.ts: Created new tool implementation with
    GetConversationContext interface, GetConversationInput type, tool
    definition, and createGetConversationTool factory function. Supports
    get-by-ID and list-recent modes with proper validation and error handling.
  src/llm/tools/index.ts: Added exports for createGetConversationTool factory
    function and GetConversationContext, GetConversationInput types from the
    getConversation module, following the existing pattern for context-dependent
    tools.
log: []
schema: v1.0
childrenIds:
  - T-export-get-conversation-tool
  - T-register-get-conversation
  - T-create-get-conversation-tool
created: 2026-02-04T06:04:09.173Z
updated: 2026-02-04T06:04:09.173Z
---

# Get Conversation Tool

## Purpose

Allow the agent to retrieve past conversation details when context from previous conversations is needed. Since past conversations are no longer included in the system prompt (see Conversation Boundaries feature), the agent needs a way to access them on demand.

## Current State

- All conversation history included in system prompt
- No tool for retrieving conversation data
- Agent cannot selectively access past context

## Implementation

### Tool Definition (`src/llm/tools/getConversation.ts`)

```typescript
interface GetConversationInput {
  conversation_id?: string;      // Specific conversation to retrieve
  list_recent?: number;          // List N most recent conversations (summaries only)
}
```

### Tool Behavior

**When `conversation_id` provided:**
- Return full conversation history for that ID
- Include all messages with timestamps, roles, content
- Include summary and title if available
- Return error if conversation not found

**When `list_recent` provided:**
- Return list of N most recent conversation summaries
- Include: id, title, summary, startedAt, endedAt, message count
- Exclude full message content (too verbose)
- Default N = 10 if not specified

**When neither provided:**
- Return list of 10 most recent conversation summaries (same as list_recent=10)

### Response Format

```typescript
// For single conversation
{
  id: string;
  title: string;
  summary: string;
  startedAt: string;
  endedAt: string;
  messages: Array<{
    timestamp: string;
    role: 'user' | 'assistant';
    content: string;
    toolsUsed?: string[];
  }>;
}

// For list
{
  conversations: Array<{
    id: string;
    title: string;
    summary: string;
    startedAt: string;
    endedAt: string;
    messageCount: number;
  }>;
}
```

### Integration with ConversationManager

- Tool reads from ConversationManager's stored conversations
- Only completed conversations are accessible (active conversation is in context)
- Need access to ConversationManager instance (similar pattern to SendMessageContext)

### Tool Factory Pattern

```typescript
function createGetConversationTool(conversationManager: ConversationManager): ToolHandler
```

## Acceptance Criteria

- [ ] `get_conversation` tool retrieves full conversation by ID
- [ ] `get_conversation` can list recent conversations with summaries
- [ ] Only completed conversations accessible (not current active one)
- [ ] Returns appropriate error for unknown conversation ID
- [ ] Response format is concise but complete

## Dependencies

- Depends on Conversation Boundaries feature (ConversationManager must exist)

## Technical Notes

- Follow existing tool patterns from `src/llm/tools/`
- Export from `src/llm/tools/index.ts`
- Tool should be registered separately from vault tools (needs ConversationManager)