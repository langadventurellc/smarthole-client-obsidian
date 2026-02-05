import { ItemView, setIcon, WorkspaceLeaf } from "obsidian";
import type SmartHolePlugin from "../main";
import type { ConversationManager } from "../context";

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
  private unsubscribeAgentMessage: (() => void) | null = null;
  private renderedMessageIds = new Set<string>();
  private messageElements = new Map<string, HTMLElement>();
  private editingMessageId: string | null = null;

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
      if (e.key === "Escape" && this.editingMessageId) {
        e.preventDefault();
        this.cancelEditMode();
        return;
      }
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

    // Load persisted conversation history from active conversation
    const conversationManager = this.plugin.getConversationManager();
    const activeConversation = conversationManager?.getActiveConversation();
    if (activeConversation) {
      for (const message of activeConversation.messages) {
        this.addMessage({
          id: message.id,
          role: message.role,
          content: message.content,
          timestamp: message.timestamp,
          toolsUsed: message.toolsUsed,
        });
      }
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

    // Subscribe to mid-execution agent messages (from send_message tool)
    this.unsubscribeAgentMessage = this.plugin.onAgentMessage((msg) => {
      this.addMessage({
        id: `agent-${crypto.randomUUID()}`,
        role: "assistant",
        content: msg.content,
        timestamp: msg.timestamp,
      });
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

    // Clean up agent message subscription
    this.unsubscribeAgentMessage?.();
    this.unsubscribeAgentMessage = null;

    this.messages = [];
    this.renderedMessageIds.clear();
    this.messageElements.clear();
    this.editingMessageId = null;
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
    this.messageElements.clear();
    this.editingMessageId = null;
    if (this.messagesEl) {
      this.messagesEl.empty();
    }
  }

  private async handleSend(): Promise<void> {
    if (!this.inputEl) return;

    const text = this.inputEl.value.trim();
    if (!text) return;

    // Handle fork-on-send if in edit mode
    if (this.editingMessageId) {
      const editingId = this.editingMessageId;
      const editingMessage = this.messages.find((m) => m.id === editingId);

      // Clear edit state before processing
      this.clearEditState();

      if (editingMessage) {
        try {
          const conversationManager = this.plugin.getConversationManager();
          if (conversationManager) {
            // Find the corresponding message in ConversationManager by matching content
            // ChatView IDs may differ from ConversationManager IDs due to optimistic UI
            const conversationMessageId = this.findConversationMessageId(
              conversationManager,
              editingMessage
            );

            if (conversationMessageId) {
              const { forkPoint } =
                await conversationManager.forkConversation(conversationMessageId);

              // Remove archived messages from ChatView display
              this.removeMessagesFromIndex(forkPoint);
            } else {
              // Message not found in ConversationManager - remove from ChatView based on local index
              const localIndex = this.messages.findIndex((m) => m.id === editingId);
              if (localIndex !== -1) {
                this.removeMessagesFromIndex(localIndex);
              }
            }
          }
        } catch (error) {
          console.error("SmartHole Chat: Failed to fork conversation", error);
        }
      }
    }

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

  /**
   * Find the ConversationManager message ID that corresponds to a ChatView message.
   * ChatView uses optimistic IDs (crypto.randomUUID) while ConversationManager uses
   * a different format (${messageId}-user). This method matches by content and role.
   */
  private findConversationMessageId(
    conversationManager: ConversationManager,
    chatMessage: ChatMessage
  ): string | null {
    const activeConversation = conversationManager.getActiveConversation();
    if (!activeConversation) return null;

    // Find matching message by content and role
    const match = activeConversation.messages.find(
      (m) => m.role === chatMessage.role && m.content === chatMessage.content
    );

    return match?.id ?? null;
  }

  /**
   * Clear edit state without clearing the input.
   * Used when we need to preserve input text for sending.
   */
  private clearEditState(): void {
    if (!this.editingMessageId) return;

    // Remove editing class from message element
    const messageEl = this.messageElements.get(this.editingMessageId);
    if (messageEl) {
      messageEl.removeClass("smarthole-chat-message-editing");
    }

    // Clear edit state
    this.editingMessageId = null;
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

    // Store reference for edit mode highlighting
    this.messageElements.set(message.id, messageEl);

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

    // Footer action bar
    const footerEl = messageEl.createEl("div", { cls: "smarthole-chat-message-footer" });

    // Edit button for user messages only
    if (message.role === "user") {
      const editBtn = footerEl.createEl("button", {
        cls: "smarthole-chat-action-btn",
        attr: { "data-message-id": message.id, "aria-label": "Edit message" },
      });
      setIcon(editBtn, "pencil");

      editBtn.addEventListener("click", () => {
        this.enterEditMode(message.id);
      });
    }

    // Copy button for all messages
    const copyBtn = footerEl.createEl("button", {
      cls: "smarthole-chat-action-btn",
      attr: { "aria-label": "Copy message" },
    });
    setIcon(copyBtn, "copy");

    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(message.content);
        setIcon(copyBtn, "check");
        setTimeout(() => {
          setIcon(copyBtn, "copy");
        }, 1500);
      } catch (error) {
        console.warn("SmartHole Chat: Failed to copy message to clipboard", error);
      }
    });
  }

  /**
   * Enter edit mode for a specific message.
   * Populates the input with the original message text and highlights the message being edited.
   */
  private enterEditMode(messageId: string): void {
    // Find the original message
    const message = this.messages.find((m) => m.id === messageId);
    if (!message || !this.inputEl) return;

    // Set edit state
    this.editingMessageId = messageId;

    // Populate input with original text
    this.inputEl.value = message.content;
    this.autoResizeTextarea();

    // Select all text for easy replacement
    this.inputEl.focus();
    this.inputEl.setSelectionRange(0, message.content.length);

    // Add visual indicator to the message being edited
    const messageEl = this.messageElements.get(messageId);
    if (messageEl) {
      messageEl.addClass("smarthole-chat-message-editing");
    }
  }

  /**
   * Cancel edit mode without making changes.
   * Clears the input and removes the editing indicator from the message.
   */
  private cancelEditMode(): void {
    if (!this.editingMessageId) return;

    // Remove editing class from message element
    const messageEl = this.messageElements.get(this.editingMessageId);
    if (messageEl) {
      messageEl.removeClass("smarthole-chat-message-editing");
    }

    // Clear edit state
    this.editingMessageId = null;

    // Clear input
    if (this.inputEl) {
      this.inputEl.value = "";
      this.autoResizeTextarea();
    }
  }

  /**
   * Remove messages from a specific index onward.
   * Used when forking a conversation to clear archived messages from the display.
   */
  private removeMessagesFromIndex(index: number): void {
    if (!this.messagesEl || index < 0 || index >= this.messages.length) return;

    // Get the messages to remove
    const messagesToRemove = this.messages.slice(index);

    // Remove DOM elements and clean up tracking data
    for (const message of messagesToRemove) {
      // Remove from renderedMessageIds
      this.renderedMessageIds.delete(message.id);

      // Remove DOM element
      const messageEl = this.messageElements.get(message.id);
      if (messageEl) {
        messageEl.remove();
      }

      // Remove from messageElements map
      this.messageElements.delete(message.id);
    }

    // Truncate the messages array
    this.messages = this.messages.slice(0, index);
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
