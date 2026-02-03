---
id: F-plugin-core-with-settings-and
title: Plugin Core with Settings and Status Bar
status: in-progress
priority: high
parent: E-plugin-foundation-and-settings
prerequisites:
  - F-project-scaffolding-and-build
affectedFiles:
  src/types.ts: Created with ConnectionStatus type, CLAUDE_MODELS constant, and
    ClaudeModelId type
  src/settings.ts: "Created with SmartHoleSettings interface and DEFAULT_SETTINGS
    constant with default values from living spec; Added SmartHoleSettingTab
    class extending PluginSettingTab with display() method implementing all
    settings fields: SecretComponent for API key, dropdown for model selection,
    text input for client name, textareas for routing description and
    information architecture, and Generate button with MVP placeholder"
  src/main.ts: Updated with settings property, loadSettings(), and saveSettings()
    methods; Added import for SmartHoleSettingTab and registered the settings
    tab in onload() using this.addSettingTab()
log: []
schema: v1.0
childrenIds:
  - T-implement-settings-tab-ui
  - T-implement-status-bar
  - T-implement-types-settings
created: 2026-02-03T04:12:16.932Z
updated: 2026-02-03T04:12:16.932Z
---

# Plugin Core with Settings and Status Bar

## Purpose

Implement the main plugin class with complete lifecycle management, the settings interface with all configuration options, and the status bar indicator. This creates a fully functional (but not yet connected) plugin that can be loaded in Obsidian.

## Deliverables

### 1. Main Plugin Class (`src/main.ts`)

Create the main plugin class extending Obsidian's `Plugin`:

```typescript
export default class SmartHolePlugin extends Plugin {
  settings: SmartHoleSettings;

  async onload() {
    // Load settings
    // Add settings tab
    // Initialize status bar
  }

  async onunload() {
    // Clean up resources
  }

  async loadSettings() { ... }
  async saveSettings() { ... }
}
```

Key responsibilities:
- Extend `Plugin` from Obsidian
- Export as default for Obsidian to load
- Initialize settings infrastructure on load
- Register settings tab
- Add status bar item
- Clean unload with no leaked resources

### 2. Settings Interface (`src/settings.ts`)

Define the settings interface:

```typescript
export interface SmartHoleSettings {
  anthropicApiKeyName: string;  // Secret storage reference
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
- `routingDescription`: (from living-spec.md defaults)
- `informationArchitecture`: (from living-spec.md defaults)

### 3. Settings Tab UI (`src/settings.ts`)

Create `SmartHoleSettingTab` extending `PluginSettingTab`:

**Settings Fields:**

1. **API Key** (using SecretComponent)
   - Name: "Anthropic API Key"
   - Description: "Select or create a secret for your Anthropic API key"
   - Uses `SecretComponent` for secure storage

2. **Model Selection** (Dropdown)
   - Name: "Claude Model"
   - Description: "Select the Claude model to use for processing"
   - Options:
     - `claude-haiku-4-5-20251001` -> "Claude Haiku 4.5 (Fast, cost-efficient)"
     - `claude-sonnet-4-5-20250929` -> "Claude Sonnet 4.5 (Balanced)"
     - `claude-opus-4-5-20251101` -> "Claude Opus 4.5 (Most capable)"

3. **Client Name** (Text)
   - Name: "Client Name"
   - Description: "Name used when registering with SmartHole"
   - Placeholder: "Miss Simone"

4. **Routing Description** (Textarea)
   - Name: "Routing Description"
   - Description: "Description used by SmartHole to route messages to this client"

5. **Information Architecture** (Textarea)
   - Name: "Information Architecture"
   - Description: "Prompt defining how notes should be organized in your vault"

6. **Generate Description Button** (Button)
   - Name: "Generate from IA"
   - Description: "Generate routing description based on your Information Architecture"
   - Note: For MVP, show a notice that this feature requires API connection (implement actual generation in a later epic)

### 4. Status Bar Indicator

Add status bar item showing connection status:

**States:**
- `disconnected` - "SmartHole: Disconnected" (default)
- `connecting` - "SmartHole: Connecting..."
- `connected` - "SmartHole: Connected"
- `error` - "SmartHole: Error"

**Behavior:**
- Click shows connection details via Notice (MVP) or modal (future)
- For now, always show "Disconnected" (actual connection in WebSocket epic)

**Implementation:**
- Use `this.addStatusBarItem()` in `onload()`
- Store reference for updates
- Provide method to update status: `updateStatusBar(status: ConnectionStatus)`

### 5. Type Definitions

Create `src/types.ts` for shared types:

```typescript
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export const CLAUDE_MODELS = {
  'claude-haiku-4-5-20251001': 'Claude Haiku 4.5 (Fast, cost-efficient)',
  'claude-sonnet-4-5-20250929': 'Claude Sonnet 4.5 (Balanced)',
  'claude-opus-4-5-20251101': 'Claude Opus 4.5 (Most capable)',
} as const;
```

## Acceptance Criteria

- [ ] Plugin loads successfully in Obsidian without errors
- [ ] Plugin unloads cleanly without errors or leaked resources
- [ ] Settings tab appears in Obsidian settings
- [ ] All settings fields display correctly:
  - [ ] API key uses SecretComponent (password-style input)
  - [ ] Model dropdown shows all three Claude 4.5 models
  - [ ] Client name text field with default value
  - [ ] Routing description textarea with default value
  - [ ] Information architecture textarea with default value
  - [ ] Generate description button (shows notice for MVP)
- [ ] Settings persist across plugin reload
- [ ] Default values applied on first load
- [ ] Status bar shows connection state
- [ ] Status bar responds to click
- [ ] `mise run build` produces working plugin
- [ ] `mise run quality` passes

## Technical Notes

- Use `SecretComponent` for API key storage per `reference-docs/obsidian-plugin-docs/secure-secret-storage.md`
- Follow settings patterns from `reference-docs/obsidian-plugin-docs/settings-and-configuration.md`
- Use `loadData()`/`saveData()` for settings persistence
- Status bar uses `addStatusBarItem()` API
- All settings should save immediately on change

## File Structure

```
src/
  main.ts       # Main plugin class
  settings.ts   # Settings interface, defaults, and tab
  types.ts      # Shared type definitions
```

## Dependencies

- Requires F-project-scaffolding-and-build to be complete