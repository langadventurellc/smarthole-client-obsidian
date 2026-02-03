import { Plugin } from "obsidian";

import { DEFAULT_SETTINGS, SmartHoleSettingTab, type SmartHoleSettings } from "./settings";
import type { ConnectionStatus } from "./types";

export default class SmartHolePlugin extends Plugin {
  settings!: SmartHoleSettings;
  private statusBarEl!: HTMLElement;

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

    console.log("SmartHole Client plugin loaded");
  }

  async onunload() {
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
