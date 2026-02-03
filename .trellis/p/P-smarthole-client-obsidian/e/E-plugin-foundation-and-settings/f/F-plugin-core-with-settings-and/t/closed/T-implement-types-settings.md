---
id: T-implement-types-settings
title: Implement types, settings interface, and persistence
status: done
priority: high
parent: F-plugin-core-with-settings-and
prerequisites: []
affectedFiles:
  src/types.ts: Created with ConnectionStatus type, CLAUDE_MODELS constant, and
    ClaudeModelId type
  src/settings.ts: Created with SmartHoleSettings interface and DEFAULT_SETTINGS
    constant with default values from living spec
  src/main.ts: Updated with settings property, loadSettings(), and saveSettings() methods
log:
  - >-
    Research completed:

    - Reviewed existing src/main.ts - minimal skeleton

    - Reviewed settings patterns from
    reference-docs/obsidian-plugin-docs/settings-and-configuration.md

    - Reviewed default values from docs/living-spec.md

    - Verified TypeScript configuration (strict mode, ES2018)


    Beginning implementation of types.ts, settings.ts, and main.ts updates.
  - >-
    Implemented the foundational type definitions and settings infrastructure
    for the SmartHole Client plugin:


    1. Created `src/types.ts` with:
       - `ConnectionStatus` type union for WebSocket connection states
       - `CLAUDE_MODELS` const object mapping model IDs to display names
       - `ClaudeModelId` type derived from CLAUDE_MODELS keys

    2. Created `src/settings.ts` with:
       - `SmartHoleSettings` interface with all required fields (anthropicApiKeyName, model, clientName, routingDescription, informationArchitecture)
       - `DEFAULT_SETTINGS` partial with default values matching the living specification
       - Model type uses `ClaudeModelId` for type safety

    3. Updated `src/main.ts` with:
       - `settings` property typed as `SmartHoleSettings` (using definite assignment assertion)
       - `loadSettings()` method using `Object.assign()` pattern per Obsidian best practices
       - `saveSettings()` method for persistence
       - Settings loaded in `onload()` lifecycle hook

    All quality checks pass (`mise run quality`) and build succeeds (`mise run
    build`).
schema: v1.0
childrenIds: []
created: 2026-02-03T04:45:32.155Z
updated: 2026-02-03T04:45:32.155Z
---

# Implement Types, Settings Interface, and Persistence

## Purpose

Create the foundational type definitions and settings infrastructure that all other components will depend on. This includes the shared types, settings interface with defaults, and the persistence methods in the main plugin class.

## Deliverables

### 1. Create `src/types.ts`

Define shared type definitions:

```typescript
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export const CLAUDE_MODELS = {
  'claude-haiku-4-5-20251001': 'Claude Haiku 4.5 (Fast, cost-efficient)',
  'claude-sonnet-4-5-20250929': 'Claude Sonnet 4.5 (Balanced)',
  'claude-opus-4-5-20251101': 'Claude Opus 4.5 (Most capable)',
} as const;

export type ClaudeModelId = keyof typeof CLAUDE_MODELS;
```

### 2. Create Settings Interface in `src/settings.ts`

Define the settings interface and defaults:

```typescript
export interface SmartHoleSettings {
  anthropicApiKeyName: string;  // Secret storage reference (stores the NAME, not the key)
  model: string;                 // Model API ID
  clientName: string;            // SmartHole registration name
  routingDescription: string;    // SmartHole routing description
  informationArchitecture: string; // IA prompt for LLM
}
```

**Default Values:**
- `anthropicApiKeyName`: `''` (empty - user must configure)
- `model`: `'claude-haiku-4-5-20251001'` (fastest, most cost-efficient)
- `clientName`: `'Miss Simone'`
- `routingDescription`: (from living-spec.md - see below)
- `informationArchitecture`: (from living-spec.md - see below)

**Default Routing Description:**
```
I manage personal notes, journals, lists, and knowledge in Obsidian. I can create notes, update existing ones, search for information, and organize files. Use me for anything related to remembering things, note-taking, or personal knowledge management.
```

**Default Information Architecture:**
```
This is a personal knowledge notebook. Notes can be organized flexibly based on content:

- Daily notes and journals go in the "Journal" folder
- Lists (shopping, todos, etc.) go in the "Lists" folder
- Project-related notes go in the "Projects" folder
- General reference and wiki-style notes go in the root or "Notes" folder

When encountering information that doesn't fit clearly into existing categories, create a new note in the most logical location and use descriptive naming. Prefer linking related notes together using [[wiki links]].

The goal is an evolving personal wiki where information is easy to find and naturally connected.
```

Export `DEFAULT_SETTINGS` as a `Partial<SmartHoleSettings>` constant.

### 3. Update `src/main.ts` with Settings Infrastructure

Update the main plugin class to:

1. Add `settings: SmartHoleSettings` property
2. Implement `loadSettings()` method using `loadData()` and `Object.assign()` pattern
3. Implement `saveSettings()` method using `saveData()`
4. Call `loadSettings()` in `onload()`

**Pattern to follow (from reference docs):**
```typescript
async loadSettings() {
  this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
}

async saveSettings() {
  await this.saveData(this.settings);
}
```

## Acceptance Criteria

- [ ] `src/types.ts` exists with `ConnectionStatus` type and `CLAUDE_MODELS` constant
- [ ] `src/settings.ts` exists with `SmartHoleSettings` interface and `DEFAULT_SETTINGS`
- [ ] Main plugin class has `settings` property typed as `SmartHoleSettings`
- [ ] `loadSettings()` and `saveSettings()` methods implemented
- [ ] Settings loaded in `onload()`
- [ ] Default values match the living spec exactly
- [ ] `mise run quality` passes
- [ ] `mise run build` succeeds

## Technical Notes

- Use `Object.assign()` pattern to merge defaults with saved data
- Settings use `loadData()`/`saveData()` for persistence (built into Obsidian Plugin class)
- The `anthropicApiKeyName` stores the NAME of a secret, not the actual API key value
- Settings will be persisted to `.obsidian/plugins/smarthole-client/data.json`

## Files to Create/Modify

- Create: `src/types.ts`
- Create: `src/settings.ts` (interface and defaults only - settings tab UI is separate task)
- Modify: `src/main.ts`