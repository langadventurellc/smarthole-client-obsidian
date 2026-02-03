---
id: E-plugin-foundation-and-settings
title: Plugin Foundation and Settings
status: in-progress
priority: medium
parent: P-smarthole-client-obsidian
prerequisites: []
affectedFiles:
  package.json: Created package.json with runtime dependency @anthropic-ai/sdk and
    dev dependencies for TypeScript/Obsidian development
  tsconfig.json: Created TypeScript configuration with strict mode, ES2018 target,
    and source maps for Obsidian plugin development
  manifest.json: "Created Obsidian plugin manifest with isDesktopOnly: true for
    WebSocket support"
log: []
schema: v1.0
childrenIds:
  - F-plugin-core-with-settings-and
  - F-project-scaffolding-and-build
created: 2026-02-03T03:39:44.221Z
updated: 2026-02-03T03:39:44.221Z
---

# Plugin Foundation and Settings

## Purpose and Goals

Establish the core Obsidian plugin infrastructure including project scaffolding, build configuration, plugin lifecycle management, and the complete settings UI. This epic creates the foundation that all other epics depend on.

## Major Components and Deliverables

### 1. Project Scaffolding
- `package.json` with dependencies (obsidian, typescript, esbuild, @anthropic-ai/sdk)
- `tsconfig.json` for TypeScript compilation
- `manifest.json` with plugin metadata (`isDesktopOnly: true`)
- Build scripts for development and production
- `.gitignore` and project structure

### 2. Main Plugin Class
- `src/main.ts` extending Obsidian's `Plugin` class
- `onload()` lifecycle hook for initialization
- `onunload()` lifecycle hook for cleanup
- Settings loading/saving infrastructure

### 3. Settings Interface and Tab
- `src/settings.ts` with `SmartHoleSettings` interface
- Settings tab UI using `PluginSettingTab`
- All settings fields:
  - API key (password field, stored securely)
  - Model selection dropdown (Haiku 4.5, Sonnet 4.5, Opus 4.5)
  - Client name text field (default: "Miss Simone")
  - Routing description textarea
  - Information architecture prompt textarea
  - "Generate description from IA" button
- Default values for all settings
- Validation for API key format

### 4. Model Configuration
Available models with API IDs:
| Model | API ID | Alias |
|-------|--------|-------|
| Claude Haiku 4.5 | `claude-haiku-4-5-20251001` | `claude-haiku-4-5` |
| Claude Sonnet 4.5 | `claude-sonnet-4-5-20250929` | `claude-sonnet-4-5` |
| Claude Opus 4.5 | `claude-opus-4-5-20251101` | `claude-opus-4-5` |

Default model: `claude-haiku-4-5-20251001` (fastest, most cost-efficient)

### 5. Status Bar Indicator
- Connection status display in Obsidian status bar
- States: disconnected, connecting, connected, error
- Click to show connection details or reconnect

## Acceptance Criteria

- [ ] Plugin loads successfully in Obsidian
- [ ] Plugin unloads cleanly without errors or leaked resources
- [ ] Settings tab displays all configuration options
- [ ] Settings persist across plugin reload
- [ ] API key field masks input
- [ ] Model dropdown shows Haiku 4.5, Sonnet 4.5, and Opus 4.5 options
- [ ] Default values applied on first load
- [ ] Status bar shows connection state
- [ ] Build produces valid `main.js` and `manifest.json`

## Technical Considerations

- Use `loadData()`/`saveData()` for settings persistence
- API key stored in plugin data (Obsidian's standard storage)
- Status bar uses `addStatusBarItem()` API
- Desktop-only plugin due to WebSocket requirement
- Follow Obsidian sample plugin patterns
- Use model aliases for flexibility, full IDs for production

## Dependencies

None - this is the foundational epic.

## Estimated Scale

2-3 features:
1. Project scaffolding and build setup
2. Main plugin class with settings infrastructure
3. Settings UI and status bar

## User Stories

- As a user, I can install and enable the plugin in Obsidian
- As a user, I can configure my Anthropic API key in settings
- As a user, I can choose which Claude model to use (Haiku, Sonnet, or Opus)
- As a user, I can customize the client name and routing description
- As a user, I can see the connection status at a glance

## Non-functional Requirements

- Plugin loads in under 100ms
- Settings save immediately on change
- Clean unload with no memory leaks