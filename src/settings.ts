import { App, PluginSettingTab, SecretComponent, Setting } from "obsidian";

import { extractTextContent, LLMError, LLMService } from "./llm";
import type SmartHolePlugin from "./main";
import { CLAUDE_MODELS, type ClaudeModelId } from "./types";

export interface SmartHoleSettings {
  anthropicApiKeyName: string;
  model: ClaudeModelId;
  clientName: string;
  routingDescription: string;
  informationArchitecture: string;
  maxConversationHistory: number;
  /** Minutes of inactivity before a conversation is considered ended */
  conversationIdleTimeoutMinutes: number;
  /** Maximum number of conversations to retain (oldest deleted when exceeded) */
  maxConversationsRetained: number;
  /** Minutes before a pending conversation state is considered stale and cleaned up */
  conversationStateTimeoutMinutes: number;
}

const DEFAULT_ROUTING_DESCRIPTION = `Miss Simone - I manage personal notes, journals, lists, and knowledge in Obsidian. I can create notes, update existing ones, search for information, and organize files. Use me for anything related to remembering things, note-taking, or personal knowledge management.`;

const DEFAULT_INFORMATION_ARCHITECTURE = `You are Miss Simone, the custodian of this Obsidian vault. You manage the organization, creation, retrieval, and maintenance of all content within.

This is a personal knowledge notebook. Notes can be organized flexibly based on content:

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
  conversationIdleTimeoutMinutes: 30,
  maxConversationsRetained: 1000,
  conversationStateTimeoutMinutes: 60,
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

    // Routing description textarea - store reference for programmatic updates
    let routingDescriptionTextarea: HTMLTextAreaElement | null = null;
    new Setting(containerEl)
      .setName("Routing Description")
      .setDesc("Description used by SmartHole to route messages to this client")
      .addTextArea((text) => {
        text.inputEl.rows = 4;
        text.inputEl.cols = 50;
        routingDescriptionTextarea = text.inputEl;
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

    // Generate Description button with inline status
    const generateSetting = new Setting(containerEl)
      .setName("Generate from IA")
      .setDesc("Generate routing description based on your Information Architecture");

    // Status text element for inline feedback with inline styles
    const statusEl = generateSetting.descEl.createSpan();
    statusEl.style.marginLeft = "8px";
    statusEl.style.fontWeight = "500";

    const setStatusError = (message: string) => {
      statusEl.setText(message);
      statusEl.style.color = "var(--text-error)";
    };

    const setStatusSuccess = (message: string) => {
      statusEl.setText(message);
      statusEl.style.color = "var(--text-success)";
    };

    const clearStatus = () => {
      statusEl.setText("");
      statusEl.style.color = "";
    };

    generateSetting.addButton((button) =>
      button.setButtonText("Generate").onClick(async () => {
        // Clear previous status
        clearStatus();

        // Validate API key is configured
        if (!this.plugin.settings.anthropicApiKeyName?.trim()) {
          setStatusError("Error: API key not configured");
          return;
        }

        // Validate Information Architecture is not empty
        if (!this.plugin.settings.informationArchitecture?.trim()) {
          setStatusError("Error: Information Architecture is empty");
          return;
        }

        // Show loading state
        button.setDisabled(true);
        const originalText = button.buttonEl.textContent ?? "Generate";
        button.setButtonText("Generating...");

        try {
          // Initialize LLM service
          const llmService = new LLMService(this.app, this.plugin.settings);
          await llmService.initialize();

          // Create prompt for generating routing description
          const prompt = `Analyze the following Information Architecture for an Obsidian vault and generate a concise routing description (under 150 words) that explains what this client can do and when to use it. The description should be in first person and help a routing system decide when to send messages to this client.

Information Architecture:
${this.plugin.settings.informationArchitecture}

Generate only the routing description text, nothing else. Do not include any preamble or explanation.`;

          // Send to LLM
          const response = await llmService.processMessage(prompt);
          const generatedDescription = extractTextContent(response).trim();

          if (!generatedDescription) {
            throw new Error("LLM returned empty response");
          }

          // Update settings
          this.plugin.settings.routingDescription = generatedDescription;
          await this.plugin.saveSettings();

          // Update the textarea directly without re-rendering the entire panel
          if (routingDescriptionTextarea) {
            routingDescriptionTextarea.value = generatedDescription;
          }

          // Show success message
          setStatusSuccess("Description generated successfully!");
        } catch (error) {
          // Handle errors with inline status
          let errorMessage = "Generation failed";
          if (error instanceof LLMError) {
            errorMessage = error.message;
          } else if (error instanceof Error) {
            errorMessage = error.message;
          }
          setStatusError(`Error: ${errorMessage}`);
        } finally {
          // Restore button state
          button.setDisabled(false);
          button.setButtonText(originalText);
        }
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

    // Conversation Idle Timeout setting
    new Setting(containerEl)
      .setName("Conversation Idle Timeout (minutes)")
      .setDesc(
        "Minutes of inactivity before a conversation is considered ended and a new one begins"
      )
      .addText((text) =>
        text
          .setPlaceholder("30")
          .setValue(String(this.plugin.settings.conversationIdleTimeoutMinutes))
          .onChange(async (value) => {
            const parsed = parseInt(value, 10);
            if (!isNaN(parsed) && parsed > 0) {
              this.plugin.settings.conversationIdleTimeoutMinutes = parsed;
              await this.plugin.saveSettings();
            }
          })
      );

    // Max Conversations Retained setting
    new Setting(containerEl)
      .setName("Max Conversations Retained")
      .setDesc(
        "Maximum number of conversations to keep (oldest are deleted when this limit is exceeded)"
      )
      .addText((text) =>
        text
          .setPlaceholder("1000")
          .setValue(String(this.plugin.settings.maxConversationsRetained))
          .onChange(async (value) => {
            const parsed = parseInt(value, 10);
            if (!isNaN(parsed) && parsed >= 1) {
              this.plugin.settings.maxConversationsRetained = parsed;
              await this.plugin.saveSettings();
            }
          })
      );
  }
}
