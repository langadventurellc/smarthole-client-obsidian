import { ItemView, setIcon, WorkspaceLeaf } from "obsidian";
import type SmartHolePlugin from "../main";

export const VIEW_TYPE_CHAT = "smarthole-chat-view";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  toolsUsed?: string[];
  source?: "direct" | "websocket";
}

export class ChatView extends ItemView {
  private plugin: SmartHolePlugin;
  private messages: ChatMessage[] = [];
  private messagesEl: HTMLElement | null = null;
  private inputEl: HTMLTextAreaElement | null = null;
  private typingEl: HTMLElement | null = null;
  private onSendCallback: ((text: string) => void) | null = null;
  private unsubscribe: (() => void) | null = null;
  private unsubscribeMessageReceived: (() => void) | null = null;
  private renderedMessageIds = new Set<string>();

  constructor(leaf: WorkspaceLeaf, plugin: SmartHolePlugin) {
    super(leaf);
    this.plugin = plugin;
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

    const chatContainer = container.createEl("div", { cls: "smarthole-chat-container" });

    // Messages area (scrollable)
    this.messagesEl = chatContainer.createEl("div", { cls: "smarthole-chat-messages" });

    // Input area (fixed at bottom)
    const inputArea = chatContainer.createEl("div", { cls: "smarthole-chat-input-area" });

    this.inputEl = inputArea.createEl("textarea", {
      cls: "smarthole-chat-input",
      attr: { placeholder: "Type a message..." },
    });

    const sendButton = inputArea.createEl("button", { cls: "smarthole-chat-send" });
    setIcon(sendButton, "send");

    // Input event handlers
    this.inputEl.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.handleSend();
      }
    });

    sendButton.addEventListener("click", () => {
      this.handleSend();
    });

    // Auto-resize textarea
    this.inputEl.addEventListener("input", () => {
      this.autoResizeTextarea();
    });

    // Load persisted conversation history
    const history = this.plugin.conversationHistory?.getRecentConversations() ?? [];
    for (const entry of history) {
      // Render user message
      this.addMessage({
        id: `${entry.id}-user`,
        role: "user",
        content: entry.userMessage,
        timestamp: entry.timestamp,
        source: entry.source ?? "websocket",
      });

      // Render assistant response
      this.addMessage({
        id: `${entry.id}-assistant`,
        role: "assistant",
        content: entry.assistantResponse,
        timestamp: entry.timestamp,
        toolsUsed: entry.toolsUsed,
      });
    }
    this.scrollToBottom();

    // Subscribe to message processing responses
    this.unsubscribe = this.plugin.onMessageResponse((result) => {
      this.addMessage({
        id: result.messageId,
        role: "assistant",
        content: result.success ? (result.response ?? "No response") : `Error: ${result.error}`,
        timestamp: new Date().toISOString(),
        toolsUsed: result.toolsUsed,
      });
      this.hideTypingIndicator();
    });

    // Subscribe to incoming messages (for WebSocket-originated messages)
    this.unsubscribeMessageReceived = this.plugin.onMessageReceived((msg) => {
      // Only show if not direct (direct messages already shown optimistically by handleSend)
      if (msg.payload.metadata?.source !== "direct") {
        this.addMessage({
          id: msg.payload.id,
          role: "user",
          content: msg.payload.text,
          timestamp: msg.payload.timestamp,
          source: "websocket",
        });
        this.showTypingIndicator();
      }
    });

    // Set the send callback to process direct messages
    this.setOnSendCallback(async (text) => {
      // Add user message immediately (optimistic UI)
      this.addMessage({
        id: crypto.randomUUID(),
        role: "user",
        content: text,
        timestamp: new Date().toISOString(),
        source: "direct",
      });

      this.showTypingIndicator();

      try {
        await this.plugin.processDirectMessage(text);
      } catch (error) {
        this.hideTypingIndicator();
        this.addMessage({
          id: crypto.randomUUID(),
          role: "assistant",
          content: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
          timestamp: new Date().toISOString(),
        });
      }
    });
  }

  async onClose(): Promise<void> {
    // Clean up response subscription
    this.unsubscribe?.();
    this.unsubscribe = null;

    // Clean up message received subscription
    this.unsubscribeMessageReceived?.();
    this.unsubscribeMessageReceived = null;

    this.messages = [];
    this.renderedMessageIds.clear();
    this.messagesEl = null;
    this.inputEl = null;
    this.typingEl = null;
    this.onSendCallback = null;
  }

  setOnSendCallback(callback: (text: string) => void): void {
    this.onSendCallback = callback;
  }

  addMessage(message: ChatMessage): void {
    // Deduplicate messages by ID
    if (this.renderedMessageIds.has(message.id)) {
      return;
    }
    this.renderedMessageIds.add(message.id);

    this.messages.push(message);
    this.renderMessage(message);
    this.scrollToBottom();
  }

  showTypingIndicator(): void {
    if (!this.messagesEl || this.typingEl) return;

    this.typingEl = this.messagesEl.createEl("div", { cls: "smarthole-chat-typing" });
    this.typingEl.setText("Thinking...");
    this.scrollToBottom();
  }

  hideTypingIndicator(): void {
    if (this.typingEl) {
      this.typingEl.remove();
      this.typingEl = null;
    }
  }

  clearMessages(): void {
    this.messages = [];
    this.renderedMessageIds.clear();
    if (this.messagesEl) {
      this.messagesEl.empty();
    }
  }

  private handleSend(): void {
    if (!this.inputEl) return;

    const text = this.inputEl.value.trim();
    if (!text) return;

    // Clear input
    this.inputEl.value = "";
    this.autoResizeTextarea();

    // Call the callback if set, otherwise log to console
    if (this.onSendCallback) {
      this.onSendCallback(text);
    } else {
      console.log("SmartHole Chat: Message sent (no handler set)", text);
    }
  }

  private formatTimestamp(isoString: string): string {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;

    // Same day: show time only
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    }

    // Different day: show date and time
    return (
      date.toLocaleDateString([], { month: "short", day: "numeric" }) +
      " " +
      date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    );
  }

  private renderMessage(message: ChatMessage): void {
    if (!this.messagesEl) return;

    const messageEl = this.messagesEl.createEl("div", {
      cls: `smarthole-chat-message smarthole-chat-message-${message.role}`,
    });

    // Header with role label and timestamp
    const headerEl = messageEl.createEl("div", { cls: "smarthole-chat-message-header" });

    const roleEl = headerEl.createEl("span", { cls: "smarthole-chat-message-role" });
    roleEl.setText(message.role === "user" ? "You" : "Assistant");

    const timestampEl = headerEl.createEl("span", { cls: "smarthole-chat-message-timestamp" });
    timestampEl.setText(this.formatTimestamp(message.timestamp));

    // Content
    const contentEl = messageEl.createEl("div", { cls: "smarthole-chat-message-content" });
    contentEl.setText(message.content);

    // Source indicator for user messages
    if (message.role === "user" && message.source) {
      const sourceEl = messageEl.createEl("div", { cls: "smarthole-chat-source" });
      sourceEl.setText(message.source === "direct" ? "typed" : "voice");
    }

    // Tool actions for assistant messages
    if (message.role === "assistant" && message.toolsUsed && message.toolsUsed.length > 0) {
      const toolsContainer = messageEl.createEl("details", { cls: "smarthole-chat-tools" });

      const summary = toolsContainer.createEl("summary");
      summary.setText(`Tools used (${message.toolsUsed.length})`);

      const toolsList = toolsContainer.createEl("ul", { cls: "smarthole-chat-tools-list" });
      for (const tool of message.toolsUsed) {
        const toolItem = toolsList.createEl("li");
        toolItem.setText(tool);
      }
    }
  }

  private scrollToBottom(): void {
    if (this.messagesEl) {
      this.messagesEl.scrollTo({
        top: this.messagesEl.scrollHeight,
        behavior: "smooth",
      });
    }
  }

  private autoResizeTextarea(): void {
    if (!this.inputEl) return;

    // Reset height to auto to get the correct scrollHeight
    this.inputEl.style.height = "auto";
    // Set height to scrollHeight, capped by CSS max-height
    this.inputEl.style.height = `${this.inputEl.scrollHeight}px`;
  }
}
