---
id: E-llm-service-and-vault-tools
title: LLM Service and Vault Tools
status: open
priority: medium
parent: P-smarthole-client-obsidian
prerequisites:
  - E-plugin-foundation-and-settings
affectedFiles: {}
log: []
schema: v1.0
childrenIds: []
created: 2026-02-03T03:40:21.371Z
updated: 2026-02-03T03:40:21.371Z
---

# LLM Service and Vault Tools

## Purpose and Goals

Implement the LLM integration layer with Anthropic's Claude API and create the vault manipulation tools that the LLM uses to manage notes. Design with extensibility for future LLM providers while keeping the MVP focused on Anthropic.

## Major Components and Deliverables

### 1. LLM Service Layer
- `src/llm/types.ts` - Abstract interfaces for LLM providers
- `src/llm/AnthropicProvider.ts` - Anthropic implementation
- Tool use (function calling) support
- System prompt construction with information architecture
- Error handling and retry logic (2-3 attempts)
- API key validation

### 2. Model Support
Support for Claude 4.5 models:
| Model | API ID | Use Case |
|-------|--------|----------|
| Claude Haiku 4.5 | `claude-haiku-4-5-20251001` | Fast, cost-efficient (default) |
| Claude Sonnet 4.5 | `claude-sonnet-4-5-20250929` | Balance of speed and capability |
| Claude Opus 4.5 | `claude-opus-4-5-20251101` | Maximum intelligence |

### 3. Vault Tools - Create Note
- `src/llm/tools/createNote.ts`
- Create new markdown files in specified locations
- Auto-generate filenames from content if not specified
- Create parent folders if needed
- Tool definition for Claude function calling

### 4. Vault Tools - Modify Note
- `src/llm/tools/modifyNote.ts`
- Append content to existing notes
- Update/replace content in notes
- Use `vault.process()` for atomic operations
- Handle file not found gracefully

### 5. Vault Tools - Search Notes
- `src/llm/tools/searchNotes.ts`
- Full-text search using `prepareSimpleSearch()`
- Return matching files with relevant excerpts
- Read note contents for LLM context
- Limit results to prevent context overflow

### 6. Vault Tools - Organize Notes
- `src/llm/tools/organizeNotes.ts`
- Rename notes (file rename)
- Move notes between folders
- Handle conflicts (file already exists)

### 7. Tool Orchestration
- Tool registry for available tools
- Tool execution with error handling
- Response formatting for Claude

## Acceptance Criteria

- [ ] AnthropicProvider makes successful API calls with valid key
- [ ] Invalid API key produces clear error message
- [ ] System prompt includes information architecture from settings
- [ ] All three Claude 4.5 models (Haiku, Sonnet, Opus) work correctly
- [ ] LLM can call createNote tool to create new notes
- [ ] LLM can call modifyNote tool to update existing notes
- [ ] LLM can call searchNotes tool to find and read notes
- [ ] LLM can call organizeNotes tool to move/rename notes
- [ ] Tool errors are reported back to LLM for graceful handling
- [ ] API failures trigger retry (2-3 attempts)
- [ ] Conversation history provided to LLM for context

## Technical Considerations

- Use Anthropic SDK (@anthropic-ai/sdk) for API calls
- Tool definitions follow Claude's function calling format
- Use `app.vault` API for all file operations
- Use `cachedRead()` for search, `read()` for modifications
- Use `vault.process()` for atomic read-modify-write
- Respect Obsidian's file naming conventions
- Handle wiki-link creation in notes

## Dependencies

- **E-plugin-foundation-and-settings**: Requires API key and model settings

## Estimated Scale

2-3 features:
1. LLM service layer with Anthropic provider
2. Vault manipulation tools (create, modify, search, organize)
3. Tool orchestration and error handling

## User Stories

- As a user, I can say "remember to buy milk" and have a note created
- As a user, I can say "add eggs to my shopping list" and have an existing note updated
- As a user, I can say "what's on my shopping list" and get an answer
- As a user, I can say "move my project notes to the Archive folder"
- As a user, I can choose Opus for complex tasks or Haiku for quick responses

## Non-functional Requirements

- LLM response within 10 seconds for simple commands (Haiku)
- Tool execution completes within 1 second
- Search returns top 10 results maximum
- No data loss on concurrent modifications (atomic writes)

## Reference

See `/reference-docs/obsidian-plugin-docs/note-management.md` for Vault API
See `/reference-docs/obsidian-plugin-docs/search-capabilities.md` for search