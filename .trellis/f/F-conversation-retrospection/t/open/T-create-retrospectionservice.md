---
id: T-create-retrospectionservice
title: Create RetrospectionService
status: open
priority: high
parent: F-conversation-retrospection
prerequisites: []
affectedFiles: {}
log: []
schema: v1.0
childrenIds: []
created: 2026-02-05T23:05:10.143Z
updated: 2026-02-05T23:05:10.143Z
---

Create a new `RetrospectionService` module that handles the background retrospection LLM call and persistence.

## Implementation Plan

### New File: `src/retrospection/RetrospectionService.ts`

This is the core module. It is a stateless service class (or collection of pure-ish functions) that:

1. Accepts a completed `Conversation` object, `SmartHoleSettings`, and `App` instance
2. Creates a **fresh `LLMService` instance** — follows the existing pattern in `MessageProcessor.processWithRetry()` (line 307-309) where `new LLMService(this.app, this.settings)` + `await llmService.initialize()` is called per attempt
3. Builds a prompt from the conversation's messages + the user's `retrospectionPrompt` setting
4. Calls `llmService.processMessage()` with **no tools registered** (read-only reflection)
5. Extracts the text content from the response using `extractTextContent()` from `src/llm/types.ts`
6. Persists the result to `.smarthole/retrospection.md` in the vault (prepend at top)
7. Returns a result object `{ conversationTitle: string; content: string; timestamp: string }` for display via callback

```typescript
import type { App } from "obsidian";
import type { SmartHoleSettings } from "../settings";
import type { Conversation } from "../context/types";
import { LLMService, extractTextContent } from "../llm";
import { formatLocalTimestamp } from "../utils/time";

const RETROSPECTION_FILE = ".smarthole/retrospection.md";

export interface RetrospectionResult {
  conversationTitle: string;
  content: string;
  timestamp: string;
}

export class RetrospectionService {
  private app: App;
  private settings: SmartHoleSettings;

  constructor(app: App, settings: SmartHoleSettings) {
    this.app = app;
    this.settings = settings;
  }

  async runRetrospection(conversation: Conversation): Promise<RetrospectionResult> {
    // 1. Build prompt
    const prompt = this.buildPrompt(conversation);

    // 2. Create fresh LLMService (no tools)
    const llmService = new LLMService(this.app, this.settings);
    await llmService.initialize();

    // 3. Call LLM
    const response = await llmService.processMessage(prompt);
    const content = extractTextContent(response);

    // 4. Persist to file
    const timestamp = new Date().toISOString();
    const title = conversation.title || "Untitled";
    await this.persistRetrospection(title, content, timestamp);

    // 5. Return result
    return { conversationTitle: title, content, timestamp };
  }

  // Exposed for unit testing
  buildPrompt(conversation: Conversation): string { ... }
  formatEntry(title: string, content: string, timestamp: string): string { ... }
}
```

**Prompt Building Logic** (`buildPrompt`):

```typescript
buildPrompt(conversation: Conversation): string {
  const title = conversation.title || "Untitled";
  const messagesText = conversation.messages
    .map((msg) => {
      const tools = msg.toolsUsed?.length ? ` (tools: ${msg.toolsUsed.join(", ")})` : "";
      return `[${formatLocalTimestamp(msg.timestamp)}] ${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}${tools}`;
    })
    .join("\n\n");

  return `Here is a completed conversation titled "${title}":\n\n${messagesText}\n\n---\n\n${this.settings.retrospectionPrompt}`;
}
```

This mirrors the message formatting pattern used in `ConversationManager.generateConversationSummary()` (line 190-195 of `ConversationManager.ts`), which uses the same `formatLocalTimestamp` + role + content + tools format.

**File Persistence Logic** (`persistRetrospection`):

```typescript
private async persistRetrospection(title: string, content: string, timestamp: string): Promise<void> {
  const entry = this.formatEntry(title, content, timestamp);

  const adapter = this.app.vault.adapter;
  let existingContent = "";

  try {
    existingContent = await adapter.read(RETROSPECTION_FILE);
  } catch {
    // File doesn't exist yet — that's fine
  }

  // Prepend new entry at the top
  const newContent = entry + existingContent;
  await adapter.write(RETROSPECTION_FILE, newContent);
}
```

**Entry Format** (`formatEntry`):

```typescript
formatEntry(title: string, content: string, timestamp: string): string {
  return `## ${title} — ${formatLocalTimestamp(timestamp)}\n\n${content}\n\n---\n\n`;
}
```

Uses `app.vault.adapter.read()` and `app.vault.adapter.write()` for file operations. The `.smarthole/` directory already exists (created by `InboxManager`). The adapter-level API is used rather than `vault.create()`/`vault.modify()` because the file may or may not exist, and adapter methods handle both cases cleanly.

**Error Handling**: The service should throw on errors. The caller (`MessageProcessor.runRetrospection`) is responsible for the fire-and-forget try/catch pattern.

### New File: `src/retrospection/index.ts`

Standard barrel export:

```typescript
export { RetrospectionService } from "./RetrospectionService";
export type { RetrospectionResult } from "./RetrospectionService";
```

### New File: `tests/retrospection/RetrospectionService.test.ts`

Unit tests covering the pure functions:

**Test 1: Prompt building**
- Create a mock `Conversation` with messages, title, and toolsUsed
- Call `buildPrompt()` and assert it contains:
  - The conversation title
  - Each message's content and role label
  - Tool names when present
  - The retrospection prompt from settings at the end

**Test 2: Entry formatting**
- Call `formatEntry()` with a title, content, and timestamp
- Assert the output matches the expected Markdown format:
  ```
  ## Title — [formatted timestamp]\n\ncontent\n\n---\n\n
  ```

**Test 3: Prompt building with empty conversation**
- Verify graceful handling when `messages` is empty
- Verify "Untitled" is used when `title` is null

Follow the test file pattern from `tests/utils/time.test.ts` — use `describe/it/expect` from Vitest, import directly from source.

## Key Dependencies

- `LLMService` from `src/llm` (constructor + initialize + processMessage)
- `extractTextContent` from `src/llm/types.ts`
- `formatLocalTimestamp` from `src/utils/time.ts`
- `Conversation` type from `src/context/types.ts`
- `SmartHoleSettings` from `src/settings.ts`
- `App` from `obsidian` (for vault.adapter access)

## Acceptance Criteria

- [ ] `RetrospectionService` class exists at `src/retrospection/RetrospectionService.ts`
- [ ] `src/retrospection/index.ts` barrel export exists
- [ ] `buildPrompt()` correctly formats conversation messages with the retrospection prompt
- [ ] `formatEntry()` produces correctly formatted Markdown entries
- [ ] File persistence prepends entries (most recent first)
- [ ] Service creates a fresh LLMService with no tools registered
- [ ] Unit tests for prompt building and entry formatting pass
- [ ] `mise run quality` passes