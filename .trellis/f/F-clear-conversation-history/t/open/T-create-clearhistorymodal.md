---
id: T-create-clearhistorymodal
title: Create ClearHistoryModal confirmation dialog
status: open
priority: medium
parent: F-clear-conversation-history
prerequisites: []
affectedFiles: {}
log: []
schema: v1.0
childrenIds: []
created: 2026-02-05T06:08:47.168Z
updated: 2026-02-05T06:08:47.168Z
---

# Create ClearHistoryModal Confirmation Dialog

Create a confirmation modal that warns users before permanently deleting conversation history.

## Context

- **Feature**: [F-clear-conversation-history](/.trellis/f/F-clear-conversation-history/F-clear-conversation-history.md) - Clear Conversation History Button
- **File to modify**: `src/settings.ts`
- **Obsidian API**: Extend the `Modal` class from `obsidian` (already imported in settings.ts)

## Implementation Requirements

Create a new `ClearHistoryModal` class in `src/settings.ts` (place it before the `SmartHoleSettingTab` class).

### Class Structure:
```typescript
class ClearHistoryModal extends Modal {
  private onConfirm: () => void;

  constructor(app: App, onConfirm: () => void) {
    super(app);
    this.onConfirm = onConfirm;
  }

  onOpen(): void {
    const { contentEl } = this;
    
    // Warning heading
    contentEl.createEl("h2", { text: "Clear Conversation History" });
    
    // Warning message
    contentEl.createEl("p", { 
      text: "This will permanently delete all conversation history. This action cannot be undone." 
    });
    
    // Button container using Obsidian's Setting component
    new Setting(contentEl)
      .addButton((btn) =>
        btn
          .setButtonText("Cancel")
          .onClick(() => this.close())
      )
      .addButton((btn) =>
        btn
          .setButtonText("Clear All")
          .setWarning()
          .onClick(() => {
            this.onConfirm();
            this.close();
          })
      );
  }

  onClose(): void {
    const { contentEl } = this;
    contentEl.empty();
  }
}
```

### Key Implementation Details:

1. **Import `Modal`**: Already imported at line 1: `import { App, PluginSettingTab, SecretComponent, Setting } from "obsidian";` - `Modal` needs to be added to this import
2. **Constructor**: Takes `App` instance and `onConfirm` callback
3. **Warning message**: Clear text explaining the permanent deletion
4. **Cancel button**: Plain button that just closes the modal
5. **Clear All button**: Uses `setWarning()` for red/destructive styling
6. **Cleanup**: `onClose()` empties the content element

## Acceptance Criteria

- [ ] `ClearHistoryModal` class exists in `src/settings.ts`
- [ ] Class extends Obsidian's `Modal` class
- [ ] Constructor accepts `App` and `onConfirm: () => void` callback
- [ ] `onOpen()` displays warning heading and message
- [ ] Modal has Cancel button that closes without calling callback
- [ ] Modal has "Clear All" button with `setWarning()` styling
- [ ] "Clear All" button calls `onConfirm()` callback and closes modal
- [ ] `onClose()` cleans up the content element
- [ ] `Modal` is added to the obsidian import at line 1

## Out of Scope

- Settings UI button that opens the modal (separate task)
- The actual clearing logic (handled by ConversationManager.clearAll())
- Status feedback display (handled by settings button task)