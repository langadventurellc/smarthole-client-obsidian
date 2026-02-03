import { Plugin } from "obsidian";

import { InboxManager } from "./inbox";
import { MessageProcessor } from "./processor";
import { DEFAULT_SETTINGS, SmartHoleSettingTab, type SmartHoleSettings } from "./settings";
import type { ConnectionStatus } from "./types";
import { SmartHoleConnection } from "./websocket/SmartHoleConnection";

export default class SmartHolePlugin extends Plugin {
  settings!: SmartHoleSettings;
  private statusBarEl!: HTMLElement;
  private connection: SmartHoleConnection | null = null;
  private inboxManager: InboxManager | null = null;
  private messageProcessor: MessageProcessor | null = null;

  async onload() {
    await this.loadSettings();
    this.addSettingTab(new SmartHoleSettingTab(this.app, this));

    // Initialize status bar
    this.statusBarEl = this.addStatusBarItem();
    this.updateStatusBar("disconnected");

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

    // Initialize MessageProcessor
    this.messageProcessor = new MessageProcessor({
      connection: this.connection,
      inboxManager: this.inboxManager,
      app: this.app,
      settings: this.settings,
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

    console.log("SmartHole Client plugin unloaded");
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
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
}
