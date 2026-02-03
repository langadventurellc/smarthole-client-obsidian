# Settings and Configuration

Settings allow users to configure your plugin, persisting across sessions.

## Basic Settings Setup

```typescript
import { Plugin } from 'obsidian';

interface MyPluginSettings {
  anthropicModel: string;
  systemPrompt: string;
  autoConnect: boolean;
  serverPort: number;
}

const DEFAULT_SETTINGS: Partial<MyPluginSettings> = {
  anthropicModel: 'claude-3-sonnet-20240229',
  systemPrompt: 'You are a helpful note-taking assistant...',
  autoConnect: true,
  serverPort: 8080
};

export default class MyPlugin extends Plugin {
  settings: MyPluginSettings;

  async onload() {
    await this.loadSettings();
    this.addSettingTab(new MySettingTab(this.app, this));
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
```

## Settings Tab UI

```typescript
import { App, PluginSettingTab, Setting } from 'obsidian';

export class MySettingTab extends PluginSettingTab {
  plugin: MyPlugin;

  constructor(app: App, plugin: MyPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    // Dropdown for model selection
    new Setting(containerEl)
      .setName('Claude Model')
      .setDesc('Select the Claude model to use')
      .addDropdown((dropdown) =>
        dropdown
          .addOption('claude-3-opus-20240229', 'Claude 3 Opus')
          .addOption('claude-3-sonnet-20240229', 'Claude 3 Sonnet')
          .addOption('claude-3-haiku-20240307', 'Claude 3 Haiku')
          .setValue(this.plugin.settings.anthropicModel)
          .onChange(async (value) => {
            this.plugin.settings.anthropicModel = value;
            await this.plugin.saveSettings();
          })
      );

    // Textarea for system prompt
    new Setting(containerEl)
      .setName('System Prompt')
      .setDesc('Instructions for the LLM')
      .addTextArea((text) =>
        text
          .setValue(this.plugin.settings.systemPrompt)
          .onChange(async (value) => {
            this.plugin.settings.systemPrompt = value;
            await this.plugin.saveSettings();
          })
      );

    // Toggle for auto-connect
    new Setting(containerEl)
      .setName('Auto-connect')
      .setDesc('Automatically connect to local server on startup')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.autoConnect)
          .onChange(async (value) => {
            this.plugin.settings.autoConnect = value;
            await this.plugin.saveSettings();
          })
      );

    // Number input via text
    new Setting(containerEl)
      .setName('Server Port')
      .setDesc('WebSocket server port')
      .addText((text) =>
        text
          .setValue(String(this.plugin.settings.serverPort))
          .onChange(async (value) => {
            this.plugin.settings.serverPort = parseInt(value) || 8080;
            await this.plugin.saveSettings();
          })
      );
  }
}
```

## Available Setting Types

| Type            | Method              | Use Case                    |
| --------------- | ------------------- | --------------------------- |
| Text            | `addText()`         | Short text input            |
| Textarea        | `addTextArea()`     | Long text (prompts, etc.)   |
| Toggle          | `addToggle()`       | Boolean settings            |
| Dropdown        | `addDropdown()`     | Select from options         |
| Slider          | `addSlider()`       | Numeric range               |
| Button          | `addButton()`       | Actions                     |
| Color Picker    | `addColorPicker()`  | Color selection             |
| Search          | `addSearch()`       | Searchable suggestions      |
| Moment Format   | `addMomentFormat()` | Date/time format            |
| Progress Bar    | `addProgressBar()`  | Display progress            |

**Documentation:** [/Users/zach/code/obsidian-developer-docs/en/Plugins/User interface/Settings.md](/Users/zach/code/obsidian-developer-docs/en/Plugins/User%20interface/Settings.md)
