# Secure Secret Storage (API Keys)

For sensitive data like API keys, use `SecretStorage` instead of storing in `data.json`.

## Why Use SecretStorage?

- **Security:** Secrets stored separately from plugin data
- **Sharing:** Users can share secrets across multiple plugins
- **Maintenance:** Single update point when keys change

## Implementation

```typescript
import { App, PluginSettingTab, SecretComponent, Setting } from 'obsidian';

interface MyPluginSettings {
  anthropicApiKeyName: string;  // Stores the NAME of the secret, not the value
}

export class MySettingTab extends PluginSettingTab {
  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName('Anthropic API Key')
      .setDesc('Select or create a secret for your API key')
      .addComponent((el) =>
        new SecretComponent(this.app, el)
          .setValue(this.plugin.settings.anthropicApiKeyName)
          .onChange((value) => {
            this.plugin.settings.anthropicApiKeyName = value;
            this.plugin.saveSettings();
          })
      );
  }
}
```

## Retrieving the Secret Value

```typescript
// In your plugin code
async makeApiCall() {
  const apiKey = this.app.secretStorage.get(this.settings.anthropicApiKeyName);

  if (!apiKey) {
    new Notice('Please configure your API key in settings');
    return;
  }

  const response = await requestUrl({
    url: 'https://api.anthropic.com/v1/messages',
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      // ...
    },
    // ...
  });
}
```

**Documentation:** [/Users/zach/code/obsidian-developer-docs/en/Plugins/Guides/Store secrets.md](/Users/zach/code/obsidian-developer-docs/en/Plugins/Guides/Store%20secrets.md)
