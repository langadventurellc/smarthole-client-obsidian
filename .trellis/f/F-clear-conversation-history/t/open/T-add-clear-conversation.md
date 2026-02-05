---
id: T-add-clear-conversation
title: Add Clear Conversation History button to settings UI
status: open
priority: medium
parent: F-clear-conversation-history
prerequisites:
  - T-add-clearall-method-to
  - T-create-clearhistorymodal
affectedFiles: {}
log: []
schema: v1.0
childrenIds: []
created: 2026-02-05T06:09:05.427Z
updated: 2026-02-05T06:09:05.427Z
---

# Add Clear Conversation History Button to Settings UI

Add a settings section with a button that opens the confirmation modal and clears conversation history.

## Context

- **Feature**: [F-clear-conversation-history](/.trellis/f/F-clear-conversation-history/F-clear-conversation-history.md) - Clear Conversation History Button
- **File to modify**: `src/settings.ts`
- **Reference pattern**: The "Generate from IA" button (lines 133-226) demonstrates button with inline status feedback
- **Prerequisites**: T-add-clearall-method-to (ConversationManager.clearAll()), T-create-clearhistorymodal (ClearHistoryModal)

## Implementation Requirements

Add a new Setting section at the end of the `display()` method in `SmartHoleSettingTab` (after line 283, following the "Max Conversations Retained" setting).

### Implementation Pattern (follow "Generate from IA" button pattern):

```typescript
// Clear Conversation History section
const clearHistorySetting = new Setting(containerEl)
  .setName("Clear Conversation History")
  .setDesc("Permanently delete all conversation history");

// Status text element for inline feedback
const clearStatusEl = clearHistorySetting.descEl.createSpan();
clearStatusEl.style.marginLeft = "8px";
clearStatusEl.style.fontWeight = "500";

const setClearStatusError = (message: string) => {
  clearStatusEl.setText(message);
  clearStatusEl.style.color = "var(--text-error)";
};

const setClearStatusSuccess = (message: string) => {
  clearStatusEl.setText(message);
  clearStatusEl.style.color = "var(--text-success)";
};

const clearClearStatus = () => {
  clearStatusEl.setText("");
  clearStatusEl.style.color = "";
};

clearHistorySetting.addButton((button) =>
  button
    .setButtonText("Clear All")
    .setWarning()
    .onClick(() => {
      clearClearStatus();
      
      new ClearHistoryModal(this.app, async () => {
        try {
          const conversationManager = this.plugin.getConversationManager();
          if (!conversationManager) {
            setClearStatusError("Error: ConversationManager unavailable");
            return;
          }
          
          await conversationManager.clearAll();
          setClearStatusSuccess("Conversation history cleared");
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          setClearStatusError(`Error: ${errorMessage}`);
        }
      }).open();
    })
);
```

### Key Implementation Details:

1. **Placement**: After the last setting ("Max Conversations Retained" at line 283)
2. **Button styling**: Use `setWarning()` for red/destructive appearance
3. **Status feedback**: Inline status using span element with CSS variables
4. **ConversationManager access**: Use `this.plugin.getConversationManager()`
5. **Error handling**: Display error if manager unavailable or clear fails
6. **Success feedback**: Show "Conversation history cleared" on success

### Prerequisite Check:

This task requires:
- `ClearHistoryModal` class to exist in `src/settings.ts`
- `clearAll()` method to exist on `ConversationManager`
- `getConversationManager()` method on the plugin (verify this exists in main.ts)

## Acceptance Criteria

- [ ] New "Clear Conversation History" section appears in settings after conversation settings
- [ ] Button displays "Clear All" with warning (red) styling
- [ ] Clicking button opens `ClearHistoryModal` confirmation dialog
- [ ] Confirming in modal calls `ConversationManager.clearAll()`
- [ ] Success message "Conversation history cleared" appears inline after successful clear
- [ ] Error message appears inline if ConversationManager is unavailable
- [ ] Error message appears inline if clearAll() throws an error
- [ ] Status resets when button is clicked again

## Out of Scope

- The ClearHistoryModal implementation (separate task)
- The clearAll() method implementation (separate task)
- Testing beyond manual verification