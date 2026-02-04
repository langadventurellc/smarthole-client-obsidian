---
id: E-communication-and-conversation
title: Communication and Conversation State
status: in-progress
priority: high
parent: P-agentic-architecture-overhaul
prerequisites:
  - E-file-operation-tools
affectedFiles:
  src/processor/types.ts: Added AgentMessageCallback type definition with JSDoc
    comment; Replaced ConversationHistory import with ConversationManager;
    Changed conversationHistory property to conversationManager in
    MessageProcessorConfig interface
  src/processor/MessageProcessor.ts: Added agentMessageCallbacks array,
    onAgentMessage() registration method, and notifyAgentMessageCallbacks()
    notification method; Added imports for createSendMessageTool and
    SendMessageContext. In processWithRetry(), created SendMessageContext with
    channel functions and registered the send_message tool with LLMService.;
    Replaced ConversationHistory import with ConversationManager and
    ConversationMessage; Changed private member to conversationManager; Updated
    processWithRetry() to use conversationManager.getContextPrompt() and record
    messages as separate user/assistant ConversationMessage entries; Removed
    triggerSummarization method and needsSummarization check
  src/processor/index.ts: Added AgentMessageCallback to module exports
  src/llm/tools/sendMessage.ts: Created new file with SendMessageContext interface
    (sendToSmartHole, sendToChatView, source properties) and SendMessageInput
    interface (message, is_question properties). Includes comprehensive JSDoc
    documentation explaining the purpose of each field.; Added imports for
    ToolHandler and Tool types, added toolDefinition constant with name
    'send_message', description, and inputSchema, and added
    createSendMessageTool factory function that creates a ToolHandler with
    validation, ChatView and SmartHole delivery logic, and appropriate return
    messages
  src/llm/tools/index.ts: Added exports for createSendMessageTool,
    SendMessageContext, and SendMessageInput from sendMessage module
  src/llm/index.ts: Added re-exports for createSendMessageTool,
    SendMessageContext, and SendMessageInput from tools module
  src/main.ts: Added import for AgentMessageCallback type and added
    onAgentMessage() method that delegates to MessageProcessor.onAgentMessage()
    for ChatView subscription; Replaced ConversationHistory import with
    ConversationManager; Changed conversationHistory property to private
    conversationManager; Updated initialization to use ConversationManager;
    Updated MessageProcessor config; Added getConversationManager() accessor
    method
  src/views/ChatView.ts: Added unsubscribeAgentMessage property, subscribed to
    agent messages in onOpen() to display mid-execution messages as assistant
    messages, and added cleanup in onClose(); Updated onOpen() to use
    plugin.getConversationManager() and load messages from active conversation
    using ConversationMessage format
  src/context/types.ts: Added ConversationMessage, Conversation, and
    PersistedConversations interfaces for the new conversation-based data model
  src/context/index.ts: Added exports for new types (Conversation,
    ConversationMessage, PersistedConversations) while keeping legacy type
    exports; Added export for ConversationManager class
  src/settings.ts: Added conversationIdleTimeoutMinutes and
    maxConversationsRetained to SmartHoleSettings interface and
    DEFAULT_SETTINGS, plus UI controls in SmartHoleSettingTab.display()
  src/context/ConversationManager.ts: "Created new ConversationManager class with
    conversation lifecycle management (load/save, addMessage, endConversation,
    getActiveConversation, getContextPrompt, getConversation,
    getRecentConversations, idle timeout detection, rolling limit enforcement);
    Added imports for LLMService type and extractTextContent utility from
    '../llm'. Added generateConversationSummary() method for LLM-based
    title/summary generation. Updated endConversation() to accept optional
    llmService parameter and generate summaries. Updated addMessage() to accept
    optional llmService parameter and pass it to endConversation() on idle
    timeout.; Added migration logic: imported old format types
    (PersistedHistory, HistoryEntry, ConversationSummary), added
    HISTORY_DATA_KEY constant, updated load() to check for old format and run
    migration, added migrateFromOldFormat(), convertOldEntriesToMessages(),
    buildMigrationSummary(), toPersistedFormat(), and
    loadFromPersistedConversations() methods"
log: []
schema: v1.0
childrenIds:
  - F-conversation-boundaries-and
  - F-conversation-state-management
  - F-get-conversation-tool
  - F-send-message-tool
created: 2026-02-04T01:58:12.351Z
updated: 2026-02-04T01:58:12.351Z
---

# Communication and Conversation State

## Purpose and Goals

Transform the agent from a one-shot response system to a multi-turn conversational assistant. This includes:
1. Making user communication an explicit tool the agent invokes
2. Enabling the agent to ask questions and wait for responses
3. Tracking conversation state across messages

## Major Components and Deliverables

### 1. Send Message Tool (`src/llm/tools/sendMessage.ts`)
- Send message to user via SmartHole (for WebSocket messages) or ChatView (for direct messages)
- Can be called multiple times during execution
- Messages appear in real-time (not batched until end)
- Requires `SendMessageContext` passed to tool factory

### 2. Conversation State Types (`src/context/types.ts`, `src/processor/types.ts`)
New types for tracking conversation state:
```typescript
interface ConversationState {
  isWaitingForResponse: boolean;
  pendingContext?: {
    originalMessageId: string;
    toolCallsCompleted: number;
    lastAgentMessage: string;
  };
}
```

### 3. LLMService Conversation State (`src/llm/LLMService.ts`)
- Handle conversation state tracking
- Integrate sendMessage tool with notification channels
- Distinguish between "task complete" and "waiting for response"
- Signal waiting state when agent asks a question

### 4. MessageProcessor Conversation Support (`src/processor/MessageProcessor.ts`)
- Support ongoing conversations (not one-shot)
- Continue existing conversation context when user responds
- Track pending conversations per message source
- Persist conversation state for crash recovery

### 5. Conversation Boundaries (`src/context/ConversationManager.ts`)

Group message exchanges into discrete conversations based on time proximity and explicit endings.

**Conversation lifecycle:**
- New conversation starts when: (a) no active conversation exists, (b) idle timeout exceeded, or (c) previous conversation explicitly ended
- Conversation ends when: (a) agent explicitly ends it, (b) user requests agent to end it, or (c) idle timeout triggers on next message
- Immediate summary generation when conversation ends (using user's configured model)

**Data model:**
```typescript
interface Conversation {
  id: string;                    // Unique conversation ID
  startedAt: string;             // ISO 8601 timestamp
  endedAt: string | null;        // null if active
  title: string | null;          // Auto-generated title (null until ended)
  summary: string | null;        // Auto-generated summary (null until ended)
  messages: ConversationMessage[];
}

interface ConversationMessage {
  id: string;
  timestamp: string;
  role: 'user' | 'assistant';
  content: string;
  toolsUsed?: string[];
}
```

**Context injection changes:**
- Only current conversation's messages included in LLM context
- Past conversations NOT in system prompt (reduces token usage)
- Agent retrieves past conversations via `get_conversation` tool when needed

### 6. Get Conversation Tool (`src/llm/tools/getConversation.ts`)

Allow agent to retrieve past conversation details when context is needed.

```typescript
interface GetConversationInput {
  conversation_id?: string;      // Specific conversation to retrieve
  list_recent?: number;          // List N most recent conversations (summaries only)
}
```

Returns full conversation history if ID provided, or list of conversation summaries with IDs.

## Acceptance Criteria

### Communication
- [ ] `send_message` sends message to user via SmartHole
- [ ] `send_message` displays in ChatView for direct messages
- [ ] Agent can call `send_message` multiple times during execution
- [ ] Messages appear in real-time (not batched until end)

### Conversation State
- [ ] Agent can ask questions and wait for response
- [ ] Conversation state persists between messages
- [ ] Next user message continues existing conversation context
- [ ] Clear distinction between "task complete" and "awaiting response"
- [ ] Safety limit on tool iterations remains in place (MAX_TOOL_ITERATIONS = 10)

### Conversation Boundaries
- [ ] Messages within idle timeout belong to same conversation
- [ ] Idle timeout is configurable (setting in plugin settings)
- [ ] Agent can explicitly end a conversation
- [ ] User can request agent to end conversation
- [ ] Summary generated immediately when conversation ends
- [ ] Summary uses user's configured model
- [ ] New conversations start silently (no notification to user)
- [ ] Rolling limit of 1000 conversations retained (configurable)
- [ ] Oldest conversations deleted when limit exceeded

### Conversation Retrieval
- [ ] `get_conversation` tool retrieves full conversation by ID
- [ ] `get_conversation` can list recent conversations with summaries
- [ ] Agent only sees current conversation in system prompt
- [ ] Past conversations accessible only via tool

## Technical Considerations

### SendMessage Context
The tool needs access to notification channels:
```typescript
interface SendMessageContext {
  sendToSmartHole: (message: string, priority?: 'normal' | 'high') => void;
  sendToChatView: (message: string) => void;
  source: 'websocket' | 'direct';
}

function createSendMessageTool(context: SendMessageContext): ToolHandler
```

### Conversation State Detection
When agent sends a message that ends with a question or explicitly signals "waiting", set `isWaitingForResponse = true`. Next incoming message continues that context.

### MessageProcessor Changes
- Currently creates fresh LLMService per message (stateless)
- Need to preserve LLMService state for ongoing conversations
- Store conversation state alongside message history
- Handle crash recovery for mid-conversation state

## Dependencies

- E-file-operation-tools (for consistent tool patterns)

## User Stories

- As an agent, I can send progress updates while performing long operations
- As an agent, I can ask clarifying questions and wait for the user's response
- As an agent, I can provide partial results before continuing work
- As a user, my follow-up message continues the conversation seamlessly

## Non-functional Requirements

- Real-time message delivery (no perceptible delay)
- Conversation state persists across plugin restarts
- Clear UX indication when agent is waiting for response vs task complete

## Estimated Scale

3-4 features (sendMessage tool, conversation state types, LLMService changes, MessageProcessor changes)