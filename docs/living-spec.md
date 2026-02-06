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

**Chat Sidebar UI**
- [x] Chat sidebar accessible via ribbon icon or command palette
- [x] Direct message input that bypasses WebSocket routing
- [x] Message display with user/assistant distinction
- [x] Collapsible tool actions display showing vault operations
- [x] Conversation history loading when sidebar opens
- [x] Real-time WebSocket message display in sidebar
- [x] Source indicators ("typed"/"voice") for messages
- [x] Model selector dropdown in header for quick model switching (persists to settings)
- [x] Stop button to cancel in-flight LLM requests during processing

**Conversation Retrospection**
- [x] `enableConversationRetrospection` toggle in settings, defaults to `false`
- [x] `retrospectionPrompt` textarea in settings with default prompt
- [x] Retrospection fires on explicit `end_conversation` tool calls (when enabled)
- [x] Retrospection fires on idle-timeout conversation endings (when enabled)
- [x] Retrospection runs in background (fire-and-forget, no delay to response delivery)
- [x] Insights persisted to `.smarthole/retrospection.md` as dated Markdown sections
- [x] Visually distinct system message in ChatView when retrospection completes
- [x] Feature is completely inert when the setting is disabled

**Streaming API**
- [x] Primary agent path uses `messages.stream()` + `finalMessage()` to avoid HTTP timeout restrictions
- [x] Model-aware max output tokens (64K for all Claude 4.5 models) via `CLAUDE_MODEL_MAX_OUTPUT_TOKENS`
- [x] Abort signal bridging from `AbortController` to `stream.abort()` for streaming cancellation
- [x] Micro-agent callers (commit messages, retrospection, summaries, settings) use non-streaming `messages.create()`
- [x] Streaming option (`streaming: boolean`) on `LLMService` and `AnthropicProvider` constructors (default: `true`)

**Git Version Control**
- [x] `enableGitVersionControl` toggle in settings, defaults to `false`
- [x] `autoCommitAfterProcessing` toggle in settings, defaults to `true` (only visible when git enabled)
- [x] Git repository initialized on first enable (via `isomorphic-git`)
- [x] `.gitignore` seeded on initialization
- [x] `.git/` added to protected paths (agent cannot access repository data)
- [x] Automatic commits after message processing with LLM-generated commit messages (structured metadata)
- [x] `search_git_history` tool available to agent when git is enabled
- [x] `view_file_history` tool available to agent when git is enabled
- [x] `view_commit` tool available to agent when git is enabled
- [x] Git tools not registered when feature is disabled
- [x] Plugin lifecycle management (init on enable, teardown on disable/unload)
- [x] Feature is completely inert when the setting is disabled

---

## Settings Specification

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `anthropicApiKeyName` | SecretComponent | empty | Reference to stored API key secret |
| `model` | dropdown | `claude-haiku-4-5-20251001` | Claude model to use (Haiku 4.5, Sonnet 4.5, Opus 4.5) |
| `clientName` | string | `Miss Simone` | Name for SmartHole registration |
| `routingDescription` | textarea | (see below) | Description for SmartHole routing |
| `informationArchitecture` | textarea | (see below) | Prompt defining vault organization |
| `enableConversationRetrospection` | toggle | `false` | Run background LLM retrospection when conversations end |
| `retrospectionPrompt` | textarea | (see below) | Prompt used for the retrospection LLM call |
| `enableGitVersionControl` | toggle | `false` | Track vault changes with git (initializes repo on first enable) |
| `autoCommitAfterProcessing` | toggle | `true` | Auto-commit after agent processing (only visible when git enabled) |
| `maxConversationHistory` | number | `50` | Maximum recent conversations to retain (older ones are summarized) |

### Default Routing Description
```
I manage personal notes, journals, lists, and knowledge in Obsidian. I can create notes, update existing ones, search for information, and organize files. Use me for anything related to remembering things, note-taking, or personal knowledge management.
```

### Default Retrospection Prompt
```
Review this conversation and reflect on opportunities for improvement. Consider:

1. System Prompt Improvements: Were there missing instructions, unclear guidance, or information that should be added to the system prompt to handle this type of request better?
2. Vault Knowledge Gaps: What did you not know about the vault's structure, naming conventions, or content that would have helped?
3. Tooling Opportunities: Were there actions you wished you could take but couldn't? Tools that would have made the interaction smoother?
4. Workflow Improvements: Could this type of request be handled more efficiently?

Provide specific, actionable insights. Focus on what would make future similar conversations more effective.
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

For detailed technical documentation, see the individual docs:

- [WebSocket Connection](websocket-connection.md) - Protocol, reconnection, response methods
- [LLM Service](llm-service.md) - Provider architecture, tool registration, multi-turn processing
- [Vault Tools](vault-tools.md) - Tool definitions and usage
- [Message Processor](message-processor.md) - Pipeline flow, retry logic, error handling
- [Conversation History](conversation-history.md) - Storage, context injection, summarization
- [Inbox Manager](inbox-manager.md) - Durability layer, crash recovery
- [Chat View](chat-view.md) - Sidebar UI implementation
- [Git Version Control](git-version-control.md) - GitService, git tools, auto-commit

### Reference Documentation

- [SmartHole Protocol](/reference-docs/smarthole-client-docs/protocol-reference.md) - Complete WebSocket protocol specification
- [Obsidian Plugin API](/reference-docs/obsidian-plugin-docs/index.md) - Obsidian development reference

---

## Out of Scope (Post-MVP)

- Migration tooling to convert existing vaults to new structure
- Additional LLM providers (OpenAI, local models)
- Interactive clarification conversations
- RAG/vector search
- Obsidian mobile support (desktop only for WebSocket)

---

## Open Questions

None at this time. All requirements have been clarified.
