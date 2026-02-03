import { Plugin } from "obsidian";

import { DEFAULT_SETTINGS, type SmartHoleSettings } from "./settings";

export default class SmartHolePlugin extends Plugin {
  settings!: SmartHoleSettings;

  async onload() {
    await this.loadSettings();
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
}
