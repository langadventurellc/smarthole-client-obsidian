import { App, PluginSettingTab, SecretComponent, Setting } from "obsidian";

import type SmartHolePlugin from "./main";
import { CLAUDE_MODELS, type ClaudeModelId } from "./types";

export interface SmartHoleSettings {
  anthropicApiKeyName: string;
  model: ClaudeModelId;
  clientName: string;
  routingDescription: string;
  informationArchitecture: string;
  maxConversationHistory: number;
}

const DEFAULT_ROUTING_DESCRIPTION = `Miss Simone - I manage personal notes, journals, lists, and knowledge in Obsidian. I can create notes, update existing ones, search for information, and organize files. Use me for anything related to remembering things, note-taking, or personal knowledge management.`;

const DEFAULT_INFORMATION_ARCHITECTURE = `This is a personal knowledge notebook. Notes can be organized flexibly based on content:

- Daily notes and journals go in the "Journal" folder
- Lists (shopping, todos, etc.) go in the "Lists" folder
- Project-related notes go in the "Projects" folder
- General reference and wiki-style notes go in the root or "Notes" folder

When encountering information that doesn't fit clearly into existing categories, create a new note in the most logical location and use descriptive naming. Prefer linking related notes together using [[wiki links]].

The goal is an evolving personal wiki where information is easy to find and naturally connected.`;

export const DEFAULT_SETTINGS: SmartHoleSettings = {
  anthropicApiKeyName: "",
  model: "claude-haiku-4-5-20251001",
  clientName: "obsidian",
  routingDescription: DEFAULT_ROUTING_DESCRIPTION,
  informationArchitecture: DEFAULT_INFORMATION_ARCHITECTURE,
  maxConversationHistory: 50,
};

export class SmartHoleSettingTab extends PluginSettingTab {
  plugin: SmartHolePlugin;

  constructor(app: App, plugin: SmartHolePlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    // API Key setting using SecretComponent
    new Setting(containerEl)
      .setName("Anthropic API Key")
      .setDesc("Select or create a secret for your Anthropic API key")
      .addComponent((el) =>
        new SecretComponent(this.app, el)
          .setValue(this.plugin.settings.anthropicApiKeyName)
          .onChange(async (value) => {
            this.plugin.settings.anthropicApiKeyName = value;
            await this.plugin.saveSettings();
          })
      );

    // Model selection dropdown
    new Setting(containerEl)
      .setName("Claude Model")
      .setDesc("Select the Claude model to use for processing")
      .addDropdown((dropdown) => {
        for (const [modelId, displayName] of Object.entries(CLAUDE_MODELS)) {
          dropdown.addOption(modelId, displayName);
        }
        return dropdown.setValue(this.plugin.settings.model).onChange(async (value) => {
          this.plugin.settings.model = value as ClaudeModelId;
          await this.plugin.saveSettings();
        });
      });

    // Client name text input
    new Setting(containerEl)
      .setName("Client Name")
      .setDesc("Identifier used when registering with SmartHole (lowercase, no spaces)")
      .addText((text) =>
        text
          .setPlaceholder("obsidian")
          .setValue(this.plugin.settings.clientName)
          .onChange(async (value) => {
            this.plugin.settings.clientName = value;
            await this.plugin.saveSettings();
          })
      );

    // Routing description textarea
    new Setting(containerEl)
      .setName("Routing Description")
      .setDesc("Description used by SmartHole to route messages to this client")
      .addTextArea((text) => {
        text.inputEl.rows = 4;
        text.inputEl.cols = 50;
        return text.setValue(this.plugin.settings.routingDescription).onChange(async (value) => {
          this.plugin.settings.routingDescription = value;
          await this.plugin.saveSettings();
        });
      });

    // Information Architecture textarea
    new Setting(containerEl)
      .setName("Information Architecture")
      .setDesc("Prompt defining how notes should be organized in your vault")
      .addTextArea((text) => {
        text.inputEl.rows = 8;
        text.inputEl.cols = 50;
        return text
          .setValue(this.plugin.settings.informationArchitecture)
          .onChange(async (value) => {
            this.plugin.settings.informationArchitecture = value;
            await this.plugin.saveSettings();
          });
      });

    // Generate Description button
    new Setting(containerEl)
      .setName("Generate from IA")
      .setDesc("Generate routing description based on your Information Architecture")
      .addButton((button) =>
        button.setButtonText("Generate").onClick(() => {
          // MVP placeholder - feature requires API connection
          console.log("Generate description feature requires API connection (not yet implemented)");
        })
      );

    // Max Conversation History setting
    new Setting(containerEl)
      .setName("Conversation History Limit")
      .setDesc(
        "Maximum number of recent conversations to keep in full detail (older ones are summarized)"
      )
      .addText((text) =>
        text
          .setPlaceholder("50")
          .setValue(String(this.plugin.settings.maxConversationHistory))
          .onChange(async (value) => {
            const parsed = parseInt(value, 10);
            if (!isNaN(parsed) && parsed > 0) {
              this.plugin.settings.maxConversationHistory = parsed;
              await this.plugin.saveSettings();
            }
          })
      );
  }
}
