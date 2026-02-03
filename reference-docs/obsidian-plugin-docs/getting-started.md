# Getting Started

## Prerequisites
- Git installed locally
- Node.js development environment
- Code editor (VS Code recommended)
- A **separate vault** for development (never develop in your main vault)

## Quick Start

1. Clone the sample plugin into your vault's `.obsidian/plugins` directory:
   ```bash
   cd path/to/vault/.obsidian/plugins
   git clone https://github.com/obsidianmd/obsidian-sample-plugin.git
   ```

2. Build the plugin:
   ```bash
   cd obsidian-sample-plugin
   npm install
   npm run dev
   ```

3. Enable the plugin in Obsidian:
   - Settings > Community plugins > Turn on community plugins
   - Enable your plugin under "Installed plugins"

4. Install [Hot-Reload](https://github.com/pjeby/hot-reload) plugin for automatic reloading during development.

## Manifest Configuration

The `manifest.json` file defines your plugin metadata:

| Property        | Required | Description                                       |
| --------------- | -------- | ------------------------------------------------- |
| `id`            | Yes      | Unique plugin ID (must match folder name)         |
| `name`          | Yes      | Display name                                      |
| `description`   | Yes      | Plugin description                                |
| `version`       | Yes      | Semantic version (x.y.z)                          |
| `minAppVersion` | Yes      | Minimum Obsidian version required                 |
| `author`        | Yes      | Author name                                       |
| `isDesktopOnly` | Yes      | `true` if using NodeJS/Electron APIs              |

**Documentation:** [/Users/zach/code/obsidian-developer-docs/en/Reference/Manifest.md](/Users/zach/code/obsidian-developer-docs/en/Reference/Manifest.md)
