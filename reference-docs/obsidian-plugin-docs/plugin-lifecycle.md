# Plugin Lifecycle

Every plugin extends the `Plugin` class with two main lifecycle methods:

```typescript
import { Plugin } from 'obsidian';

export default class MyPlugin extends Plugin {
  async onload() {
    // Configure resources when plugin starts
    // Register commands, settings, event handlers here
  }

  async onunload() {
    // Release resources when plugin is disabled
    // Clean up event listeners, intervals, etc.
  }
}
```

## Key Points
- `onload()` runs when the user enables the plugin
- `onunload()` runs when the plugin is disabled
- Use Developer Tools (Ctrl+Shift+I / Cmd+Option+I) to debug

**Documentation:**
- [/Users/zach/code/obsidian-developer-docs/en/Plugins/Getting started/Build a plugin.md](/Users/zach/code/obsidian-developer-docs/en/Plugins/Getting%20started/Build%20a%20plugin.md)
- [/Users/zach/code/obsidian-developer-docs/en/Plugins/Getting started/Anatomy of a plugin.md](/Users/zach/code/obsidian-developer-docs/en/Plugins/Getting%20started/Anatomy%20of%20a%20plugin.md)
