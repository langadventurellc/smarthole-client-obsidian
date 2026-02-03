# SmartHole Client for Obsidian - Living Specification Document

(Living specification documents are intended to be maintained during the life of the application and should be updated to reference the current expected state of the application. Before development starts, it's the same thing as a requirements document - it describes the desired state.)

## Overview

An Obsidian plugin that acts as a SmartHole client, receiving voice and text commands to intelligently manage notes in an Obsidian vault. The plugin connects to the SmartHole desktop application via WebSocket and uses Claude (Anthropic) to interpret commands and execute actions on the vault.

---

## What

### Core Functionality

**SmartHole Integration**
- Connect to SmartHole's WebSocket server at `ws://127.0.0.1:9473`
- Register with a configurable client name (default: "Miss Simone") and routing description
- Receive routed messages containing user voice/text commands
- Send acknowledgments and notifications back through SmartHole

**LLM-Powered Command Processing**
- Integrate with Anthropic's Claude API to interpret incoming messages
- Provide the LLM with tools to manipulate the Obsidian vault:
  - Create new notes in appropriate locations
  - Modify existing notes (append, update, edit content)
  - Search and read note contents
  - Organize notes (rename, move between folders)
- LLM makes decisions guided by a user-configurable "information architecture" prompt

**Message Durability**
- Save incoming messages to an inbox folder before LLM processing
- If API processing fails, messages remain in inbox for later reprocessing
- Provides recovery path when API is unavailable

**Conversation Context**
- Maintain summaries of recent conversations in plugin storage
- Provide searchable history for context retrieval
- History stored internally, not as visible vault files

### Connection Behavior

- Attempt connection to SmartHole on plugin load
- On connection failure: retry every 30 seconds
- Gracefully handle SmartHole not running (plugin remains functional, just disconnected)
- Clean up WebSocket connection on plugin unload

### Search

- Use Obsidian's built-in search capabilities (simple text search)
- No RAG or vector search in MVP - plain markdown file search is sufficient

---

## Where

### Affected Areas

**New Plugin Structure**
- Main plugin class extending Obsidian's `Plugin`
- Settings tab for configuration
- WebSocket connection manager
- LLM service layer (Anthropic integration)
- Tool implementations for vault operations
- Inbox manager for message durability
- Message processor for pipeline orchestration

**Obsidian Vault**
- Inbox folder for pending messages (location TBD, likely `.smarthole/inbox/`)
- All other vault modifications are user-directed via voice/text commands

**Plugin Data Storage**
- Settings (API key, model, client name, routing description, IA prompt)
- Conversation history and summaries

---

## Why

### Context and Motivation

SmartHole provides a unified voice/text interface that routes commands to appropriate applications. An Obsidian plugin enables hands-free, natural language note management - users can speak commands like "remember to buy milk tomorrow" or "add this to my project notes" and have them intelligently processed.

The plugin having its own LLM integration (rather than relying on SmartHole) provides:
- Full control over how commands are interpreted
- Access to vault contents for context-aware decisions
- Foundation for future capabilities and customization
- Independence from SmartHole's routing LLM limitations

The information architecture prompt allows users to define their organizational preferences without rigid templates - the LLM uses it as guidance, not strict rules.

### Design Decisions

**Anthropic Claude for MVP, extensible architecture**
- Start with Anthropic (Haiku/Sonnet) for proven quality
- Design the LLM service layer to support future providers (OpenAI, local models)
- Don't hardcode Anthropic-specific patterns throughout the codebase

**Best-guess for ambiguity (not interactive clarification)**
- Interactive back-and-forth requires complex conversation state management
- For MVP, the LLM should make reasonable decisions based on context and IA prompt
- Can revisit interactive clarification post-MVP when conversation infrastructure is stronger

**Inbox folder pattern for durability**
- Voice commands shouldn't be lost due to transient API failures
- Persisting before processing ensures recovery path
- Can implement "process pending" functionality for manual or automatic retry

**SmartHole notifications only (not Obsidian notices)**
- Keeps notification experience consistent for users
- User is likely not looking at Obsidian when issuing voice commands
- SmartHole's system notifications are more visible

---

## Done

### MVP Acceptance Criteria

**Connection & Registration**
- [x] Plugin connects to SmartHole on load (or retries every 30s if unavailable)
- [x] Registers with configurable name and description (SmartHoleConnection class)
- [x] Shows connection status indicator in Obsidian UI (status bar)
- [x] Cleanly disconnects on plugin unload

**Settings**
- [x] Anthropic API key field (stored securely via SecretComponent)
- [x] Model selection dropdown (Haiku 4.5, Sonnet 4.5, Opus 4.5)
- [x] Client name field (default: "Miss Simone")
- [x] Routing description textarea (user-editable)
- [x] "Generate description from IA" button (uses LLM to analyze IA and generate routing description)
- [x] Information architecture prompt textarea (with sensible default)

**Message Processing**
- [x] Incoming messages saved to inbox folder before processing
- [x] Messages sent to Claude with appropriate system prompt and tools
- [x] LLM can create new notes in the vault
- [x] LLM can modify existing notes
- [x] LLM can search and read notes
- [x] LLM can move/rename notes
- [x] Successful actions send notification via SmartHole
- [x] Failed actions notify user via SmartHole

**Error Handling**
- [x] API failures trigger silent retry (2-3 attempts)
- [x] Persistent failures notify user via SmartHole
- [x] Failed messages remain in inbox for later processing
- [ ] Invalid API key produces clear error message in settings

**Conversation Context**
- [x] Recent conversation history stored in plugin data (ConversationHistory class in src/context/)
- [x] History available to LLM for context (via getContextPrompt() and LLMService.setConversationContext())
- [x] Summaries maintained for older conversations (summarizeOld() with LLM-generated summaries)

---

## Settings Specification

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `anthropicApiKeyName` | SecretComponent | empty | Reference to stored API key secret |
| `model` | dropdown | `claude-haiku-4-5-20251001` | Claude model to use (Haiku 4.5, Sonnet 4.5, Opus 4.5) |
| `clientName` | string | `Miss Simone` | Name for SmartHole registration |
| `routingDescription` | textarea | (see below) | Description for SmartHole routing |
| `informationArchitecture` | textarea | (see below) | Prompt defining vault organization |
| `maxConversationHistory` | number | `50` | Maximum recent conversations to retain (older ones are summarized) |

### Default Routing Description
```
I manage personal notes, journals, lists, and knowledge in Obsidian. I can create notes, update existing ones, search for information, and organize files. Use me for anything related to remembering things, note-taking, or personal knowledge management.
```

### Default Information Architecture Prompt
```
This is a personal knowledge notebook. Notes can be organized flexibly based on content:

- Daily notes and journals go in the "Journal" folder
- Lists (shopping, todos, etc.) go in the "Lists" folder
- Project-related notes go in the "Projects" folder
- General reference and wiki-style notes go in the root or "Notes" folder

When encountering information that doesn't fit clearly into existing categories, create a new note in the most logical location and use descriptive naming. Prefer linking related notes together using [[wiki links]].

The goal is an evolving personal wiki where information is easy to find and naturally connected.
```

---

## Technical Notes

### SmartHole Protocol

Refer to `/reference-docs/smarthole-client-docs/` for complete protocol documentation:
- WebSocket connection to `ws://127.0.0.1:9473`
- Registration message with name, description, version
- Receive `message` type with `id`, `text`, `timestamp`, `metadata`
- Respond with `ack`, `reject`, or `notification` types

**Implementation**: `src/websocket/` contains the SmartHoleConnection class and protocol types. The connection class handles registration, message parsing with type guards, response methods (sendAck, sendReject, sendNotification), and automatic reconnection with exponential backoff (1s → 30s cap).

### Obsidian APIs

Refer to `/reference-docs/obsidian-plugin-docs/` for API documentation:
- `Plugin` lifecycle (`onload`, `onunload`)
- `Vault` for file operations (create, modify, read, delete, rename)
- `PluginSettingTab` for settings UI
- `prepareFuzzySearch` / `prepareSimpleSearch` for search
- Native `WebSocket` API (Electron environment)

### LLM Architecture Considerations

Design the LLM integration layer with future extensibility:
- Abstract interface for LLM providers
- Anthropic implementation as first concrete provider
- Tool definitions separate from provider-specific formatting
- Configuration for model selection within a provider

**Implementation**: `src/llm/` contains the LLM service layer:
- `types.ts` - Provider-agnostic type definitions (LLMProvider interface, LLMMessage, ContentBlock types, Tool/ToolCall/ToolResult, LLMError with error codes)
- `AnthropicProvider.ts` - Claude API integration with retry logic (3 attempts, exponential backoff 1s/2s/4s), error classification (auth, rate limit, network, invalid request)
- `LLMService.ts` - Main service orchestrating tool registration, conversation history (max 20 messages), system prompt construction with information architecture, and multi-turn tool use loop (max 10 iterations)
- `index.ts` - Public exports for the module
- `tools/` - Vault manipulation tools (see Vault Tools below)

### Vault Tools

The LLM uses these tools to manipulate the Obsidian vault:

| Tool | Description |
|------|-------------|
| `create_note` | Create new markdown notes. Auto-generates filenames from H1 headings or content if path not specified. Creates parent folders automatically. |
| `modify_note` | Modify existing notes with atomic operations. Supports `append`, `prepend`, and `replace` operations. Uses `vault.process()` for safe concurrent access. |
| `search_notes` | Search notes using `prepareSimpleSearch()`. Returns up to 10 results with excerpts. Optional `read_content` parameter returns full file content. |
| `organize_note` | Rename or move notes. Creates destination folders automatically. Validates against overwrites. |

**Implementation**: `src/llm/tools/` contains factory functions for each tool:
- Each factory function (e.g., `createCreateNoteTool(app)`) returns a `ToolHandler` with a tool definition and execute function
- `createVaultTools(app)` returns an array of all instantiated tools for bulk registration with `LLMService`
- All tools normalize paths to ensure `.md` extension and handle missing folders gracefully

### Message Processor

The MessageProcessor orchestrates the complete message processing pipeline, integrating the inbox, LLM, and notification systems.

**Pipeline flow:**
1. **Save to inbox** - Message persisted for durability before any processing
2. **Send acknowledgment** - Notify SmartHole that message was received (skipped for reprocessing)
3. **LLM processing** - Create LLMService instance, register vault tools, process message with retry
4. **Send notification** - Success or error notification sent via SmartHole
5. **Cleanup** - Remove message from inbox on success (kept on failure for reprocessing)

**Retry logic:**
- Maximum 3 retry attempts for transient LLM errors
- Exponential backoff: 1s, 2s, 4s delays between retries
- Only retryable errors (rate limits, network issues) trigger retry
- Non-retryable errors (auth, invalid request) fail immediately

**Startup recovery:**
- `reprocessPending()` called on plugin load
- Iterates through all messages in inbox folder
- Reprocesses each with `skipAck=true` (original ack already sent)
- Ensures no messages lost due to plugin crashes or Obsidian restarts

**Error messages:**
- User-friendly error messages mapped from LLMError codes
- Auth errors: "API key is missing or invalid"
- Rate limits: "Too many requests. Please try again in a moment."
- Network errors: "Network error. Please check your internet connection."
- Invalid requests: "Unable to process request. The message may be too long."

**Implementation**: `src/processor/` contains:
- `types.ts` - MessageProcessorConfig and ProcessResult interfaces
- `MessageProcessor.ts` - Main orchestration class with process() and reprocessPending() methods
- `index.ts` - Public exports for the module

### Conversation History

The ConversationHistory class manages persistent conversation history across plugin restarts, providing context to the LLM for continuity.

**Storage:**
- Persisted in plugin data (via `saveData()`), NOT in vault files
- Rolling window of recent conversations (configurable, default 50)
- Older conversations summarized before removal to preserve context

**Data model:**
- `HistoryEntry` - Individual conversation with id, timestamp, userMessage, assistantResponse, toolsUsed
- `ConversationSummary` - LLM-generated summary of a batch of older conversations
- `PersistedHistory` - Container with recentConversations, summaries, and lastSummarized timestamp

**Context injection:**
- `getContextPrompt()` returns formatted context for inclusion in LLM system prompt
- Includes up to 10 recent conversations in full detail
- Includes summaries of older conversations for longer-term context
- MessageProcessor records conversations after successful processing

**Summarization:**
- Triggered when conversation count exceeds `maxConversationHistory` setting
- Summarizes batches of at least 10 conversations at a time
- Uses LLM to generate concise summaries capturing key topics, files modified, user patterns

**Implementation**: `src/context/` contains:
- `types.ts` - HistoryEntry, ConversationSummary, PersistedHistory interfaces
- `ConversationHistory.ts` - Main class with load(), addConversation(), getContextPrompt(), clear(), summarizeOld()
- `index.ts` - Public exports for the module

---

## Out of Scope (Post-MVP)

- Migration tooling to convert existing vaults to new structure
- Additional LLM providers (OpenAI, local models)
- Interactive clarification conversations
- RAG/vector search
- Advanced UI (chat panel, conversation view)
- Obsidian mobile support (desktop only for WebSocket)

---

## Open Questions

None at this time. All requirements have been clarified.
