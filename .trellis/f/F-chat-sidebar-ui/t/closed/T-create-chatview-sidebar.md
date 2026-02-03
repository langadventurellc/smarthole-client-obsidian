---
id: T-create-chatview-sidebar
title: Create ChatView sidebar infrastructure
status: done
priority: high
parent: F-chat-sidebar-ui
prerequisites: []
affectedFiles:
  src/views/ChatView.ts: Created new ItemView implementation with VIEW_TYPE_CHAT
    constant and ChatView class
  src/views/index.ts: Created barrel export for ChatView and VIEW_TYPE_CHAT
  styles.css: Created root-level CSS file with .smarthole-chat-container styling
    using Obsidian CSS variables
  src/main.ts: Added view registration, ribbon icon, command, and activateChatView() method
log:
  - |-
    Starting implementation. Research completed:
    - Verified main.ts structure and patterns
    - Confirmed no existing views directory
    - CSS should go in root styles.css file (auto-loaded by Obsidian)
    - ItemView pattern understood from Perplexity docs

    Creating:
    1. src/views/ChatView.ts - ItemView implementation
    2. src/views/index.ts - Barrel export
    3. styles.css - Basic CSS for chat container
    4. Modifying src/main.ts - Register view, ribbon icon, command
  - >-
    Implemented ChatView sidebar infrastructure:

    - Created ChatView class extending ItemView with getViewType(),
    getDisplayText(), getIcon(), onOpen(), and onClose() methods

    - Exported VIEW_TYPE_CHAT constant for view registration

    - Added barrel export in src/views/index.ts

    - Created styles.css with basic chat container styling using Obsidian CSS
    variables

    - Modified main.ts to register the view, add ribbon icon (message-circle),
    and add "Open Chat" command

    - Implemented activateChatView() method that opens/reveals the sidebar in
    the right leaf without creating duplicates
schema: v1.0
childrenIds: []
created: 2026-02-03T19:12:06.305Z
updated: 2026-02-03T19:12:06.305Z
---

# Create ChatView Sidebar Infrastructure

Set up the basic sidebar view infrastructure following Obsidian's ItemView pattern.

## What to Implement

### 1. Create ChatView class (`src/views/ChatView.ts`)

```typescript
import { ItemView, WorkspaceLeaf } from "obsidian";

export const VIEW_TYPE_CHAT = "smarthole-chat-view";

export class ChatView extends ItemView {
  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  getViewType(): string {
    return VIEW_TYPE_CHAT;
  }

  getDisplayText(): string {
    return "SmartHole Chat";
  }

  getIcon(): string {
    return "message-circle"; // or appropriate Lucide icon
  }

  async onOpen(): Promise<void> {
    const container = this.containerEl.children[1];
    container.empty();
    container.createEl("div", { cls: "smarthole-chat-container" });
    // Basic structure - will be expanded in subsequent tasks
  }

  async onClose(): Promise<void> {
    // Cleanup if needed
  }
}
```

### 2. Register view in main.ts

In `onload()`:
```typescript
this.registerView(VIEW_TYPE_CHAT, (leaf) => new ChatView(leaf));
```

### 3. Add ribbon icon

In `onload()`:
```typescript
this.addRibbonIcon("message-circle", "Open SmartHole Chat", () => {
  this.activateChatView();
});
```

### 4. Add command

In `onload()`:
```typescript
this.addCommand({
  id: "open-chat",
  name: "Open Chat",
  callback: () => this.activateChatView(),
});
```

### 5. Implement activateChatView method

```typescript
async activateChatView(): Promise<void> {
  const { workspace } = this.app;
  
  let leaf = workspace.getLeavesOfType(VIEW_TYPE_CHAT)[0];
  
  if (!leaf) {
    leaf = workspace.getRightLeaf(false);
    await leaf.setViewState({ type: VIEW_TYPE_CHAT, active: true });
  }
  
  workspace.revealLeaf(leaf);
}
```

### 6. Create basic CSS file (`src/views/ChatView.css`)

```css
.smarthole-chat-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--background-primary);
  color: var(--text-normal);
}
```

### 7. Import CSS in main.ts or ChatView.ts

## Files to Create
- `src/views/ChatView.ts`
- `src/views/ChatView.css`

## Files to Modify
- `src/main.ts` - Register view, add ribbon icon, add command, add activateChatView method

## Acceptance Criteria

1. Ribbon icon appears in left sidebar with message-circle icon
2. Clicking ribbon icon opens chat sidebar on right
3. Command "SmartHole: Open Chat" appears in command palette
4. Running command opens chat sidebar
5. Sidebar shows "SmartHole Chat" as title
6. Reopening when already open reveals existing leaf (doesn't create duplicate)
7. View survives plugin reload (Obsidian re-registers it)