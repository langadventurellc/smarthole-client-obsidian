import { Plugin, WorkspaceLeaf } from "obsidian";

import { ConversationHistory } from "./context";
import { InboxManager } from "./inbox";
import { MessageProcessor, type ResponseCallback, type MessageReceivedCallback } from "./processor";
import { DEFAULT_SETTINGS, SmartHoleSettingTab, type SmartHoleSettings } from "./settings";
import type { ConnectionStatus } from "./types";
import { ChatView, VIEW_TYPE_CHAT } from "./views";
import { SmartHoleConnection } from "./websocket/SmartHoleConnection";
import type { RoutedMessage } from "./websocket";

export default class SmartHolePlugin extends Plugin {
  settings!: SmartHoleSettings;
  private statusBarEl!: HTMLElement;
  private connection: SmartHoleConnection | null = null;
  private inboxManager: InboxManager | null = null;
  /** Exposed for ChatView to subscribe to response callbacks */
  messageProcessor: MessageProcessor | null = null;
  /** Exposed for ChatView to load conversation history */
  conversationHistory: ConversationHistory | null = null;

  async onload() {
    await this.loadSettings();
    this.addSettingTab(new SmartHoleSettingTab(this.app, this));

    // Initialize status bar
    this.statusBarEl = this.addStatusBarItem();
    this.updateStatusBar("disconnected");

    // Register ChatView with plugin reference for direct message handling
    this.registerView(VIEW_TYPE_CHAT, (leaf: WorkspaceLeaf) => new ChatView(leaf, this));

    // Add ribbon icon to open chat sidebar
    this.addRibbonIcon("message-circle", "Open SmartHole Chat", () => {
      this.activateChatView();
    });

    // Add command to open chat sidebar
    this.addCommand({
      id: "open-chat",
      name: "Open Chat",
      callback: () => this.activateChatView(),
    });

    // Add click handler for status bar
    this.statusBarEl.addEventListener("click", () => {
      // MVP: Log to console (SmartHole notifications not yet implemented)
      console.log("SmartHole connection status clicked");
    });

    // Initialize SmartHole connection
    this.connection = new SmartHoleConnection({
      name: this.settings.clientName,
      description: this.settings.routingDescription,
      version: this.manifest.version,
    });

    // Update status bar on connection state changes
    this.connection.onStateChange = (state) => {
      this.updateStatusBar(state);
    };

    // Initialize InboxManager
    this.inboxManager = new InboxManager(this.app.vault);

    // Initialize ConversationHistory and load persisted data
    this.conversationHistory = new ConversationHistory(this);
    await this.conversationHistory.load();

    // Initialize MessageProcessor
    this.messageProcessor = new MessageProcessor({
      connection: this.connection,
      inboxManager: this.inboxManager,
      app: this.app,
      settings: this.settings,
      conversationHistory: this.conversationHistory,
    });

    // Process incoming messages through the full pipeline
    this.connection.onMessage = async (message) => {
      const result = await this.messageProcessor!.process(message);
      if (!result.success) {
        console.error("SmartHole: Message processing failed", result.error);
      }
    };

    // Enable reconnection and initiate connection
    this.connection.enableReconnection();
    this.connection.connect();

    // Reprocess any pending messages from previous sessions
    this.messageProcessor.reprocessPending().catch((error) => {
      console.error("SmartHole: Failed to reprocess pending messages", error);
    });

    console.log("SmartHole Client plugin loaded");
  }

  onunload() {
    // Clean up SmartHole connection
    if (this.connection) {
      this.connection.disableReconnection();
      this.connection.disconnect();
      this.connection = null;
    }

    // Clear processor references
    this.inboxManager = null;
    this.messageProcessor = null;
    this.conversationHistory = null;

    console.log("SmartHole Client plugin unloaded");
  }

  async loadSettings() {
    const data = await this.loadData();
    // Extract only the settings fields, ignoring other data keys like conversationHistory
    this.settings = Object.assign({}, DEFAULT_SETTINGS, this.extractSettings(data));
  }

  async saveSettings() {
    // Preserve other data keys (like conversationHistory) when saving settings
    const existingData = (await this.loadData()) || {};
    const mergedData = { ...existingData, ...this.settings };
    await this.saveData(mergedData);
  }

  private extractSettings(data: unknown): Partial<SmartHoleSettings> {
    if (!data || typeof data !== "object") {
      return {};
    }
    const d = data as Record<string, unknown>;
    const settings: Partial<SmartHoleSettings> = {};

    // Only extract known settings keys to avoid pulling in other data
    if (typeof d.anthropicApiKeyName === "string")
      settings.anthropicApiKeyName = d.anthropicApiKeyName;
    if (typeof d.model === "string") settings.model = d.model as SmartHoleSettings["model"];
    if (typeof d.clientName === "string") settings.clientName = d.clientName;
    if (typeof d.routingDescription === "string")
      settings.routingDescription = d.routingDescription;
    if (typeof d.informationArchitecture === "string")
      settings.informationArchitecture = d.informationArchitecture;
    if (typeof d.maxConversationHistory === "number")
      settings.maxConversationHistory = d.maxConversationHistory;

    return settings;
  }

  updateStatusBar(status: ConnectionStatus): void {
    const statusText: Record<ConnectionStatus, string> = {
      disconnected: "SmartHole: Disconnected",
      connecting: "SmartHole: Connecting...",
      connected: "SmartHole: Connected",
      error: "SmartHole: Error",
    };
    this.statusBarEl.setText(statusText[status]);
  }

  async activateChatView(): Promise<void> {
    const { workspace } = this.app;

    let leaf: WorkspaceLeaf | null = null;
    const existingLeaves = workspace.getLeavesOfType(VIEW_TYPE_CHAT);

    if (existingLeaves.length > 0) {
      leaf = existingLeaves[0];
    } else {
      leaf = workspace.getRightLeaf(false);
      if (leaf) {
        await leaf.setViewState({ type: VIEW_TYPE_CHAT, active: true });
      }
    }

    if (leaf) {
      workspace.revealLeaf(leaf);
    }
  }

  /**
   * Process a message directly from the chat sidebar (bypassing WebSocket).
   * The message is processed through the LLM pipeline but does not send
   * WebSocket ack or notification responses.
   */
  async processDirectMessage(text: string): Promise<void> {
    if (!this.messageProcessor) {
      throw new Error("MessageProcessor not initialized");
    }

    const routedMessage: RoutedMessage = {
      type: "message",
      payload: {
        id: crypto.randomUUID(),
        text,
        timestamp: new Date().toISOString(),
        metadata: {
          inputMethod: "text",
          source: "direct",
        },
      },
    };

    // Skip ack (no WebSocket to ack to), process message
    await this.messageProcessor.process(routedMessage, true);
  }

  /**
   * Subscribe to message processing responses.
   * Returns an unsubscribe function.
   */
  onMessageResponse(callback: ResponseCallback): () => void {
    if (!this.messageProcessor) {
      return () => {};
    }
    return this.messageProcessor.onResponse(callback);
  }

  /**
   * Subscribe to incoming message notifications.
   * Used by ChatView to display WebSocket messages in real-time.
   * Returns an unsubscribe function.
   */
  onMessageReceived(callback: MessageReceivedCallback): () => void {
    if (!this.messageProcessor) {
      return () => {};
    }
    return this.messageProcessor.onMessageReceived(callback);
  }
}
