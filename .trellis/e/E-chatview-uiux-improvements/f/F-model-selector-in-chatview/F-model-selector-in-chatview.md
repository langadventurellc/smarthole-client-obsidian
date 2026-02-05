---
id: F-model-selector-in-chatview
title: Model Selector in ChatView Header
status: done
priority: medium
parent: E-chatview-uiux-improvements
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
  - "Auto-completed: All child tasks are complete"
schema: v1.0
childrenIds:
  - T-add-model-selector-dropdown
created: 2026-02-05T17:53:13.603Z
updated: 2026-02-05T17:53:13.603Z
---

# Model Selector in ChatView Header

## Purpose
Add a compact dropdown in the ChatView header that allows users to quickly switch between Claude models (Haiku, Sonnet, Opus) without navigating to the settings tab. Changes persist immediately and affect all subsequent messages.

## Key Components to Implement

### 1. Model Dropdown UI (`src/views/ChatView.ts`)
- Add dropdown/select element in the header area (below title or as part of title row)
- Populate options from `CLAUDE_MODELS` constant in `src/types.ts`
- Display short model names: "Haiku 4.5", "Sonnet 4.5", "Opus 4.5"
- Show current selection based on `plugin.settings.model`

### 2. Settings Persistence (`src/views/ChatView.ts`)
- On dropdown change: update `plugin.settings.model`
- Call `plugin.saveSettings()` to persist
- No confirmation needed - immediate effect

### 3. Header Layout (`src/views/ChatView.ts`)
- Modify `onOpen()` to add a header section before messages area
- Header contains: view title ("SmartHole Chat") and model dropdown
- Compact layout - dropdown should not dominate the header

### 4. Styles (`styles.css`)
- `.smarthole-chat-header` - header container with title and controls
- `.smarthole-chat-model-select` - dropdown styling (compact, matches theme)

## Acceptance Criteria
- [ ] Model dropdown is visible in ChatView header area
- [ ] Dropdown shows all three models from CLAUDE_MODELS constant
- [ ] Current model is pre-selected when view opens
- [ ] Changing selection immediately updates plugin settings
- [ ] Subsequent messages (both direct and WebSocket) use the new model
- [ ] Dropdown styling matches Obsidian theme (uses CSS variables)
- [ ] Header layout is compact and doesn't waste vertical space

## Technical Requirements
- Use native `<select>` element for accessibility and simplicity
- Import `CLAUDE_MODELS` from `src/types.ts`
- Model IDs are keys of CLAUDE_MODELS, display text derived from values
- Settings persistence via `plugin.saveSettings()`

## Implementation Guidance
- Create header div before messages area in `onOpen()`
- Use a simple mapping to create shorter display names:
  - "claude-haiku-4-5-20251001" → "Haiku 4.5"
  - "claude-sonnet-4-5-20250929" → "Sonnet 4.5"  
  - "claude-opus-4-5-20251101" → "Opus 4.5"
- Or just extract from the existing CLAUDE_MODELS display strings
- No need for custom dropdown component - native select works well

## Testing Requirements
- Verify dropdown displays all three model options
- Verify current model is selected on view open
- Verify model change persists (reload plugin, check settings)
- Verify new messages use updated model (check API calls in dev tools)
- Verify styling looks good in both light and dark themes

## Dependencies
- None (can be implemented independently)