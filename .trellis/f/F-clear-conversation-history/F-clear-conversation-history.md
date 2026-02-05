---
id: F-clear-conversation-history
title: Clear Conversation History Button
status: in-progress
priority: medium
parent: none
prerequisites: []
affectedFiles:
  src/context/ConversationManager.ts: Added clearAll() method that resets
    conversations to empty array, sets activeConversationId to null, and
    persists the cleared state
  src/settings.ts: Added Modal to import from obsidian. Created new
    ClearHistoryModal class (lines 52-89) with constructor accepting App and
    onConfirm callback, onOpen() method that displays warning heading/message
    and Cancel/Clear All buttons, and onClose() method that cleans up contentEl.
log: []
schema: v1.0
childrenIds:
  - T-add-clear-conversation
  - T-create-clearhistorymodal
  - T-add-clearall-method-to
created: 2026-02-05T06:06:19.835Z
updated: 2026-02-05T06:06:19.835Z
---

# Clear Conversation History Button

Add a button to the settings screen that allows users to permanently delete all conversation history, with a confirmation dialog to prevent accidental data loss.

## Purpose

Users need the ability to clear their conversation history when they want to start fresh or remove sensitive data. Currently there is no way to clear stored conversations without manually editing plugin data.

## Key Components

### 1. ConversationManager.clearAll() Method
Add a public method to `src/context/ConversationManager.ts` that:
- Resets the `conversations` array to empty
- Sets `activeConversationId` to null
- Persists the empty state via `save()`

Reference: The legacy `ConversationHistory` class has a `clear()` method at line 123-126 that follows this pattern.

### 2. Confirmation Modal
Create a `ClearHistoryModal` class (can be in `src/settings.ts`) that:
- Extends Obsidian's `Modal` class
- Displays a warning message about permanent deletion
- Has Cancel and "Clear All" buttons
- Calls a confirmation callback when user confirms

### 3. Settings UI Button
Add to the settings tab in `src/settings.ts`:
- A new `Setting` with "Clear Conversation History" label
- A button with `setWarning()` styling to indicate destructive action
- Inline status feedback (success/error) following existing pattern from "Generate from IA" button
- Place after the existing conversation settings section (around line 283)

## Implementation Guidance

**Follow existing patterns:**
- The "Generate from IA" button (lines 133-226) demonstrates button with inline status feedback
- Use `this.plugin.getConversationManager()` to access the manager
- Use Obsidian's `Modal` class with `Setting` components for buttons

**Modal structure:**
```typescript
class ClearHistoryModal extends Modal {
  constructor(app: App, onConfirm: () => void)
  onOpen(): void  // Create UI with warning text and buttons
  onClose(): void // Clean up contentEl
}
```

**Button styling:**
- Use `setWarning()` on the "Clear All" button to visually indicate destructive action
- Use `var(--text-success)` and `var(--text-error)` for status feedback

## Acceptance Criteria

- [ ] Settings screen displays a "Clear Conversation History" section with a "Clear All" button
- [ ] Clicking the button opens a confirmation modal with warning text
- [ ] Modal has working Cancel (closes without action) and "Clear All" (confirms) buttons
- [ ] Confirming clears all conversations from storage
- [ ] Success message appears inline after clearing
- [ ] If ConversationManager is unavailable, error message appears inline
- [ ] Active conversations are properly terminated (no orphaned state)

## Testing Requirements

- Manual testing: Verify button appears, modal opens/closes, confirmation clears data
- Verify plugin data no longer contains conversation entries after clearing
- Verify reloading plugin after clear shows empty conversation state

## Files to Modify

- `src/context/ConversationManager.ts` - Add `clearAll()` method
- `src/settings.ts` - Add Modal class and settings button UI