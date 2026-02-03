# SmartHole Client for Obsidian

Obsidian plugin that acts as a SmartHole client, using Claude (Anthropic) to intelligently manage notes via voice/text commands. Desktop-only (requires WebSocket).

## Tech Stack

TypeScript, Obsidian Plugin API, esbuild, @anthropic-ai/sdk

## Commands

Commands will use `mise` for all development tasks (to be configured):

```bash
mise run dev         # Start dev mode with hot reload
mise run build       # Build for distribution
mise run test        # Run tests
mise run quality     # All quality checks (lint + format + type-check)
mise run lint        # ESLint only
mise run format      # Prettier only
mise run type-check  # TypeScript only
```

## Project Structure

```
src/
├── main.ts                    # Main plugin class (Plugin lifecycle)
├── settings.ts                # Settings interface and tab
├── websocket/
│   └── SmartHoleConnection.ts # WebSocket connection manager
├── llm/
│   ├── types.ts              # Abstract LLM interfaces
│   ├── AnthropicProvider.ts  # Anthropic implementation
│   └── tools/                # Tool definitions and handlers
│       ├── createNote.ts
│       ├── modifyNote.ts
│       ├── searchNotes.ts
│       └── organizeNotes.ts
├── inbox/
│   └── InboxManager.ts       # Message durability layer
└── context/
    └── ConversationHistory.ts # Conversation context management
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

- [Living Spec](docs/living-spec.md) - Product vision and requirements
- [SmartHole Protocol](reference-docs/smarthole-client-docs/protocol-reference.md) - WebSocket protocol specification
- [Obsidian Plugin API](reference-docs/obsidian-plugin-docs/index.md) - Obsidian development reference

## IMPORTANT RULES ABOUT SPAWN SUBAGENT TASKS

- **NEVER USE HAIKU**
- **ALWAYS USE OPUS 4.5** - All of our sub-agents are performing critical pieces of work to complete a project that needs to be of high quality. In order to achieve this, we must use OPUS 4.5 for all the agents that we spawn to do the development work or any of the work surrounding the development process.
