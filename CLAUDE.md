# SmartHole Client for Obsidian

Obsidian plugin that acts as a SmartHole client, using Claude (Anthropic) to intelligently manage notes via voice/text commands. Desktop-only (requires WebSocket).

## Tech Stack

TypeScript, Obsidian Plugin API, esbuild, @anthropic-ai/sdk, isomorphic-git

## Commands

Commands use `mise` for all development tasks:

```bash
mise run dev         # Start dev mode with hot reload
mise run build       # Build for distribution
mise run quality     # All quality checks (lint + format + type-check)
mise run lint        # ESLint only
mise run format      # Prettier only
mise run type-check  # TypeScript only
```

## Project Structure

```
src/
├── main.ts        # Main plugin class (Plugin lifecycle, status bar, view registration)
├── settings.ts    # Settings interface, defaults, and tab UI
├── types.ts       # Shared type definitions (ConnectionStatus, CLAUDE_MODELS)
├── websocket/     # WebSocket connection manager (SmartHoleConnection, protocol types)
├── llm/           # LLM service layer (LLMService, AnthropicProvider, types)
│   └── tools/     # Tools (vault: readFile, editFile, writeFile, createFolder, deleteFile, moveFile, searchFiles, listFiles, getFileInfo, getActiveNote; communication: sendMessage, endConversation, getConversation; git: searchGitHistory, viewFileHistory, viewCommit; utils: pathUtils, protected)
├── git/           # Git version control (GitService wrapping isomorphic-git, types)
├── inbox/         # Message durability layer (InboxManager, persists to .smarthole/inbox/)
├── processor/     # Message orchestration (MessageProcessor: inbox -> ack -> LLM -> notify -> cleanup, auto-commit)
├── context/       # Conversation management (ConversationManager for grouped conversations, ConversationHistory legacy)
├── retrospection/ # Background conversation retrospection (RetrospectionService, persists to .smarthole/retrospection.md)
├── utils/         # Shared utilities (time formatting for LLM context, debug logger)
└── views/         # UI components (ChatView sidebar for direct interaction)
```

## Architecture Rules

- Plugin extends Obsidian's `Plugin` class with `onload()` and `onunload()`
- Settings use `PluginSettingTab` with `loadData()`/`saveData()` for persistence
- File operations use `app.vault` API (create, modify, read, delete, rename)
- Search uses `prepareSimpleSearch()` for full-text search
- WebSocket uses native browser API (Electron environment)
- Desktop only: `isDesktopOnly: true` in manifest (WebSocket requirement)

## Conventions

### Always

- Use `npm install <package>` for dependencies (not manual package.json edits)
- Run `mise run quality` before committing
- Follow existing patterns in adjacent code
- Use `vault.process()` for atomic read-modify-write operations
- Send notifications via SmartHole (not Obsidian notices)

### Ask First

- Adding new runtime dependencies
- Changing SmartHole message protocol handling
- Modifying LLM tool definitions
- Changes to the settings schema

### Never

- Store API keys outside plugin data storage
- Connect to non-localhost WebSocket addresses
- Use RAG/vector search (plain text search only for MVP)
- Create Obsidian notices (use SmartHole notifications)

## SmartHole Protocol

- WebSocket server: `ws://127.0.0.1:9473`
- Registration: send `{ type: "registration", payload: { name, description, version } }`
- Messages: receive `{ type: "message", payload: { id, text, timestamp, metadata } }`
- Responses: send `{ type: "response", payload: { messageId, type: "ack"|"reject"|"notification", payload } }`
- Reconnection: exponential backoff (1s → 30s cap), retry indefinitely

## Claude Models

| Model | API ID | Use Case |
|-------|--------|----------|
| Claude Haiku 4.5 | `claude-haiku-4-5-20251001` | Fast, cost-efficient (default) |
| Claude Sonnet 4.5 | `claude-sonnet-4-5-20250929` | Balance of speed and capability |
| Claude Opus 4.5 | `claude-opus-4-5-20251101` | Maximum intelligence |

## Detailed Documentation

- [WebSocket Connection](docs/websocket-connection.md) - SmartHole client connection, registration, reconnection
- [LLM Service](docs/llm-service.md) - Provider-agnostic LLM integration, tool registration, multi-turn processing
- [Vault Tools](docs/vault-tools.md) - File operations, search, and vault management tools
- [Message Processor](docs/message-processor.md) - Pipeline orchestration, retry logic, error handling
- [Conversation History](docs/conversation-history.md) - Conversation boundaries, message grouping, LLM summaries
- [Inbox Manager](docs/inbox-manager.md) - Message durability, crash recovery
- [Chat View](docs/chat-view.md) - Sidebar UI, direct messages, tool display
- [Git Version Control](docs/git-version-control.md) - GitService, git tools, auto-commit
- [Living Spec](docs/living-spec.md) - Product vision and requirements
- [Agentic Architecture](docs/requirements-agentic-architecture.md) - Planned filesystem access and autonomous execution

### Reference Documentation
- [SmartHole Protocol](reference-docs/smarthole-client-docs/protocol-reference.md) - WebSocket protocol specification
- [Obsidian Plugin API](reference-docs/obsidian-plugin-docs/index.md) - Obsidian development reference

## IMPORTANT RULES ABOUT SPAWN SUBAGENT TASKS

- **NEVER USE HAIKU**
- **ALWAYS USE OPUS 4.5** - All of our sub-agents are performing critical pieces of work to complete a project that needs to be of high quality. In order to achieve this, we must use OPUS 4.5 for all the agents that we spawn to do the development work or any of the work surrounding the development process.
