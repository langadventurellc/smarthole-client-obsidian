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
    return "message-circle";
  }

  async onOpen(): Promise<void> {
    const container = this.containerEl.children[1];
    container.empty();
    container.createEl("div", { cls: "smarthole-chat-container" });
  }

  async onClose(): Promise<void> {
    // Cleanup will be implemented in subsequent tasks
  }
}
