import { Plugin } from "obsidian";

export default class SmartHolePlugin extends Plugin {
  async onload() {
    console.log("SmartHole Client plugin loaded");
  }

  async onunload() {
    console.log("SmartHole Client plugin unloaded");
  }
}
