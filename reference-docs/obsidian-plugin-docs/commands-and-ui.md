# Commands and UI

## Registering Commands

Commands appear in the Command Palette and can have hotkeys:

```typescript
export default class MyPlugin extends Plugin {
  async onload() {
    // Basic command
    this.addCommand({
      id: 'process-voice-command',
      name: 'Process voice command',
      callback: () => {
        this.processVoiceCommand();
      }
    });

    // Conditional command (only shows when condition is met)
    this.addCommand({
      id: 'send-to-llm',
      name: 'Send selection to LLM',
      checkCallback: (checking: boolean) => {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (activeView) {
          if (!checking) {
            this.sendToLLM(activeView.editor.getSelection());
          }
          return true;
        }
        return false;
      }
    });

    // Editor command (has access to editor)
    this.addCommand({
      id: 'insert-llm-response',
      name: 'Insert LLM response at cursor',
      editorCallback: (editor: Editor, view: MarkdownView) => {
        // Has access to editor and view
        const cursor = editor.getCursor();
        editor.replaceRange('LLM response here', cursor);
      }
    });
  }
}
```

## Ribbon Actions

Add icons to the left sidebar:

```typescript
this.addRibbonIcon('microphone', 'Voice input', () => {
  this.toggleVoiceInput();
});
```

## Status Bar

Display plugin status (desktop only):

```typescript
const statusBar = this.addStatusBarItem();
statusBar.setText('Voice: Connected');

// Update later
statusBar.setText('Voice: Disconnected');
```

## Modals

Display dialogs for user interaction:

```typescript
import { App, Modal, Setting } from 'obsidian';

class ConfirmModal extends Modal {
  result: boolean = false;
  onSubmit: (result: boolean) => void;

  constructor(app: App, onSubmit: (result: boolean) => void) {
    super(app);
    this.onSubmit = onSubmit;
  }

  onOpen() {
    this.setTitle('Confirm Action');
    this.setContent('Are you sure you want to proceed?');

    new Setting(this.contentEl)
      .addButton((btn) =>
        btn.setButtonText('Yes').setCta().onClick(() => {
          this.close();
          this.onSubmit(true);
        })
      )
      .addButton((btn) =>
        btn.setButtonText('No').onClick(() => {
          this.close();
          this.onSubmit(false);
        })
      );
  }
}

// Usage
new ConfirmModal(this.app, (result) => {
  if (result) {
    // User confirmed
  }
}).open();
```

## Suggestion Modals

For selecting from a list:

```typescript
import { FuzzySuggestModal } from 'obsidian';

class NoteSuggestModal extends FuzzySuggestModal<TFile> {
  getItems(): TFile[] {
    return this.app.vault.getMarkdownFiles();
  }

  getItemText(file: TFile): string {
    return file.basename;
  }

  onChooseItem(file: TFile) {
    // Handle selection
  }
}
```

**Documentation:**
- [/Users/zach/code/obsidian-developer-docs/en/Plugins/User interface/Commands.md](/Users/zach/code/obsidian-developer-docs/en/Plugins/User%20interface/Commands.md)
- [/Users/zach/code/obsidian-developer-docs/en/Plugins/User interface/Ribbon actions.md](/Users/zach/code/obsidian-developer-docs/en/Plugins/User%20interface/Ribbon%20actions.md)
- [/Users/zach/code/obsidian-developer-docs/en/Plugins/User interface/Status bar.md](/Users/zach/code/obsidian-developer-docs/en/Plugins/User%20interface/Status%20bar.md)
- [/Users/zach/code/obsidian-developer-docs/en/Plugins/User interface/Modals.md](/Users/zach/code/obsidian-developer-docs/en/Plugins/User%20interface/Modals.md)
