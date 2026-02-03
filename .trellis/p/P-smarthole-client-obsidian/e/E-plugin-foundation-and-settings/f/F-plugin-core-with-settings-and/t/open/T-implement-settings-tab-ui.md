---
id: T-implement-settings-tab-ui
title: Implement settings tab UI with all configuration controls
status: open
priority: high
parent: F-plugin-core-with-settings-and
prerequisites:
  - T-implement-types-settings
affectedFiles: {}
log: []
schema: v1.0
childrenIds: []
created: 2026-02-03T04:45:52.919Z
updated: 2026-02-03T04:45:52.919Z
---

# Implement Settings Tab UI with All Configuration Controls

## Purpose

Create the settings tab UI that allows users to configure all plugin options. This creates `SmartHoleSettingTab` extending Obsidian's `PluginSettingTab` and registers it with the plugin.

## Deliverables

### 1. Create `SmartHoleSettingTab` Class in `src/settings.ts`

Add the settings tab class to the existing `src/settings.ts` file (which already has the interface and defaults from the previous task):

```typescript
import { App, PluginSettingTab, SecretComponent, Setting } from 'obsidian';
import type SmartHolePlugin from './main';
import { CLAUDE_MODELS } from './types';

export class SmartHoleSettingTab extends PluginSettingTab {
  plugin: SmartHolePlugin;

  constructor(app: App, plugin: SmartHolePlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    // ... settings fields
  }
}
```

### 2. Implement Settings Fields

**Required fields in order:**

1. **API Key** (using SecretComponent)
   - Name: "Anthropic API Key"
   - Description: "Select or create a secret for your Anthropic API key"
   - Uses `SecretComponent` for secure storage
   - Saves the secret NAME to `settings.anthropicApiKeyName`

2. **Model Selection** (Dropdown)
   - Name: "Claude Model"
   - Description: "Select the Claude model to use for processing"
   - Options from `CLAUDE_MODELS` constant:
     - `claude-haiku-4-5-20251001` → "Claude Haiku 4.5 (Fast, cost-efficient)"
     - `claude-sonnet-4-5-20250929` → "Claude Sonnet 4.5 (Balanced)"
     - `claude-opus-4-5-20251101` → "Claude Opus 4.5 (Most capable)"

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
   - For MVP: Show a notice that this feature requires API connection
   - Use SmartHole notification if connected, otherwise console.log for now

### 3. Register Settings Tab in Main Plugin

Update `src/main.ts` to register the settings tab in `onload()`:

```typescript
import { SmartHoleSettingTab } from './settings';

// In onload():
this.addSettingTab(new SmartHoleSettingTab(this.app, this));
```

### 4. Settings Behavior

- All settings should save immediately on change (call `saveSettings()` in each onChange handler)
- Textareas should have reasonable height for multi-line content
- Dropdowns should iterate over `CLAUDE_MODELS` to build options

## Acceptance Criteria

- [ ] Settings tab appears in Obsidian settings under plugin name
- [ ] API key field uses `SecretComponent` (password-style input with secret management)
- [ ] Model dropdown shows all three Claude 4.5 models with friendly names
- [ ] Client name text field displays with placeholder
- [ ] Routing description textarea displays with current value
- [ ] Information architecture textarea displays with current value
- [ ] Generate description button shows notice when clicked (MVP placeholder)
- [ ] All settings persist across plugin reload
- [ ] Changes save immediately on input
- [ ] `mise run quality` passes
- [ ] `mise run build` succeeds

## Technical Notes

- Use `SecretComponent` per `reference-docs/obsidian-plugin-docs/secure-secret-storage.md`
- Follow patterns from `reference-docs/obsidian-plugin-docs/settings-and-configuration.md`
- Iterate over `Object.entries(CLAUDE_MODELS)` for dropdown options
- SecretComponent stores the NAME of the secret, which is then used with `app.secretStorage.get()` to retrieve the actual value

## Files to Modify

- Modify: `src/settings.ts` (add SmartHoleSettingTab class)
- Modify: `src/main.ts` (register settings tab)