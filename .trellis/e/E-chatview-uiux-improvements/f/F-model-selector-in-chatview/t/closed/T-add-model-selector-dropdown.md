---
id: T-add-model-selector-dropdown
title: Add model selector dropdown to ChatView header
status: done
priority: medium
parent: F-model-selector-in-chatview
prerequisites: []
affectedFiles:
  src/views/ChatView.ts: Added import for CLAUDE_MODELS and ClaudeModelId from
    types. Added header section in onOpen() before messages area with title span
    and model select dropdown. Dropdown populates from CLAUDE_MODELS with short
    names, pre-selects current model, and persists changes on selection.
  styles.css: "Added .smarthole-chat-header (flex row, border-bottom, flex-shrink:
    0), .smarthole-chat-header-title (semibold, medium font),
    .smarthole-chat-model-select (small font, themed border/background, cursor
    pointer), and .smarthole-chat-model-select:focus (accent border, no outline)
    styles."
log:
  - >-
    Research complete. Verified:

    - ChatView.ts onOpen() creates chatContainer then messagesEl (lines 51-54) -
    header goes between

    - CLAUDE_MODELS and ClaudeModelId available from src/types.ts

    - plugin.settings.model and plugin.saveSettings() confirmed in main.ts and
    settings.ts

    - styles.css uses Obsidian CSS variables consistently


    Starting implementation.
  - Added a model selector dropdown to the ChatView header. The header appears
    between the chat container top and the messages area, displaying "SmartHole
    Chat" title on the left and a native <select> dropdown on the right. The
    dropdown is populated from CLAUDE_MODELS with short display names (e.g.,
    "Haiku 4.5", "Sonnet 4.5", "Opus 4.5"), pre-selects the current model from
    plugin settings, and persists changes immediately via plugin.saveSettings()
    on selection change. CSS styles use Obsidian CSS variables for theme
    compatibility.
schema: v1.0
childrenIds: []
created: 2026-02-05T19:56:42.099Z
updated: 2026-02-05T19:56:42.099Z
---

# Add Model Selector Dropdown to ChatView Header

## Purpose
Add a compact header section to the ChatView with a model selector dropdown, allowing users to switch between Claude models without navigating to settings.

## Implementation Details

### 1. ChatView Header UI (`src/views/ChatView.ts`)

In `onOpen()`, create a header div **before** the messages area (between `chatContainer` creation and `this.messagesEl` creation):

```typescript
// Header area
const headerEl = chatContainer.createEl("div", { cls: "smarthole-chat-header" });
const titleEl = headerEl.createEl("span", { cls: "smarthole-chat-header-title" });
titleEl.setText("SmartHole Chat");

const modelSelect = headerEl.createEl("select", { cls: "smarthole-chat-model-select" });
for (const [modelId, displayName] of Object.entries(CLAUDE_MODELS)) {
  const option = modelSelect.createEl("option", { value: modelId });
  // Use short display names: extract "Haiku 4.5", "Sonnet 4.5", "Opus 4.5" from the full display string
  const shortName = displayName.replace(/^Claude\s+/, "").replace(/\s*\(.*\)$/, "");
  option.setText(shortName);
}
modelSelect.value = this.plugin.settings.model;

modelSelect.addEventListener("change", async () => {
  this.plugin.settings.model = modelSelect.value as ClaudeModelId;
  await this.plugin.saveSettings();
});
```

### 2. Imports
Add `ClaudeModelId` and `CLAUDE_MODELS` imports from `../types` at the top of ChatView.ts:
```typescript
import { CLAUDE_MODELS, type ClaudeModelId } from "../types";
```

### 3. CSS Styles (`styles.css`)

Add header styles:

```css
/* ChatView header with title and model selector */
.smarthole-chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--size-4-2) var(--size-4-3);
  border-bottom: 1px solid var(--background-modifier-border);
  flex-shrink: 0;
}

.smarthole-chat-header-title {
  font-weight: var(--font-semibold);
  font-size: var(--font-ui-medium);
  color: var(--text-normal);
}

.smarthole-chat-model-select {
  font-size: var(--font-ui-small);
  padding: var(--size-4-1) var(--size-4-2);
  border: 1px solid var(--background-modifier-border);
  border-radius: var(--radius-s);
  background-color: var(--background-primary);
  color: var(--text-normal);
  cursor: pointer;
}

.smarthole-chat-model-select:focus {
  outline: none;
  border-color: var(--interactive-accent);
}
```

### Key Details
- Import `CLAUDE_MODELS` and `ClaudeModelId` from `src/types.ts`
- Use native `<select>` element for accessibility
- Short display names: strip "Claude " prefix and parenthetical from CLAUDE_MODELS values (e.g., "Claude Haiku 4.5 (Fast, cost-efficient)" → "Haiku 4.5")
- Pre-select current model from `this.plugin.settings.model`
- On change, update `this.plugin.settings.model` and call `this.plugin.saveSettings()`
- Header is a flex row: title left, dropdown right
- Uses Obsidian CSS variables for theming
- No cleanup needed in `onClose()` — the DOM elements are removed automatically when the container is emptied

## Affected Files
- `src/views/ChatView.ts` — Add header with model dropdown in `onOpen()`, add imports
- `styles.css` — Add `.smarthole-chat-header`, `.smarthole-chat-header-title`, `.smarthole-chat-model-select` styles

## Acceptance Criteria
- [ ] Header section appears at top of ChatView with "SmartHole Chat" title and model dropdown
- [ ] Dropdown shows all three models from CLAUDE_MODELS with short display names
- [ ] Current model is pre-selected when view opens
- [ ] Changing selection immediately updates `plugin.settings.model` and persists via `saveSettings()`
- [ ] Subsequent messages (direct and WebSocket) use the new model
- [ ] Dropdown styling uses Obsidian CSS variables and looks good in both light and dark themes
- [ ] Header is compact and does not waste vertical space