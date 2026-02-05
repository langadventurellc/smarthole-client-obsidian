# SmartHole Client for Obsidian

An Obsidian plugin that acts as a SmartHole client, receiving voice and text commands to intelligently manage notes in your vault. The plugin connects to the SmartHole desktop application via WebSocket and uses Claude (Anthropic) to interpret commands and execute actions.

## Features

- **Voice & Text Commands**: Speak or type natural language commands like "remember to buy milk tomorrow" or "add this to my project notes"
- **Chat Sidebar**: Direct in-Obsidian chat interface for interacting with the agent without routing through SmartHole
- **Intelligent Note Management**: Claude interprets your commands and decides where to create, update, or organize notes
- **Customizable Organization**: Define your own "information architecture" to guide how notes are organized
- **Message Durability**: Commands are saved to an inbox before processing, so nothing is lost if the API is temporarily unavailable
- **Conversation Context**: Groups messages into discrete conversations with automatic boundaries and LLM-generated summaries

## Requirements

- [Obsidian](https://obsidian.md/) (desktop only - mobile not supported)
- [SmartHole Desktop](https://github.com/langadventurellc/smarthole-desktop) running locally
- [Anthropic API key](https://console.anthropic.com/)

## Installation

> **Note**: This plugin is currently in development and not yet available in the Obsidian Community Plugins directory.

### Manual Installation

1. Download the latest release from the [releases page](https://github.com/langadventurellc/smarthole-client-obsidian/releases)
2. Extract the files to your vault's `.obsidian/plugins/smarthole-client/` folder
3. Enable the plugin in Obsidian Settings → Community plugins

### Development Installation

```bash
cd path/to/vault/.obsidian/plugins
git clone https://github.com/langadventurellc/smarthole-client-obsidian.git smarthole-client
cd smarthole-client
npm install
mise run dev
```

## Configuration

After enabling the plugin, go to Settings → SmartHole Client to configure:

| Setting | Description |
|---------|-------------|
| **Enable SmartHole Connection** | Toggle WebSocket connection to SmartHole desktop app (enabled by default) |
| **API Key** | Your Anthropic API key |
| **Model** | Claude model to use (Haiku 4.5, Sonnet 4.5, or Opus 4.5) |
| **Client Name** | Name shown in SmartHole (default: "Miss Simone") |
| **Routing Description** | Tells SmartHole what kinds of commands to route to this plugin |
| **Information Architecture** | Defines how you want your notes organized |
| **Clear Conversation History** | Permanently delete all stored conversations (with confirmation) |

## Usage

### Via SmartHole (Voice/Text)

1. Start the SmartHole desktop application
2. The plugin will automatically connect (status shown in Obsidian's status bar)
3. Use voice or text commands through SmartHole:
   - "Remember to call mom tomorrow"
   - "Add eggs to my shopping list"
   - "What's on my todo list?"
   - "Move my project notes to the Archive folder"

### Via Chat Sidebar (Direct)

1. Click the chat icon in the left ribbon, or use command palette: "SmartHole: Open Chat"
2. Type messages directly in the sidebar
3. Press Enter or click the send button to submit
4. Drag files or folders from the file explorer into the input to reference them by path
5. View conversation history, tool usage, and message sources (typed vs voice)

The chat sidebar shows a unified view of all conversations, whether they came from SmartHole voice commands or direct typing in the sidebar.

The plugin uses your Information Architecture prompt to decide where to put things. The default organizes notes into Journal, Lists, Projects, and Notes folders, but you can customize this to match your workflow.

## How It Works

### Via SmartHole

```
Voice/Text → SmartHole → WebSocket → Plugin → Claude → Vault
                                        ↓
                              SmartHole Notification
```

1. You speak or type a command to SmartHole
2. SmartHole routes the message to this plugin via WebSocket
3. The plugin saves the message to `.smarthole/inbox/` for durability
4. Claude interprets the command using your Information Architecture
5. The plugin executes vault operations (create, modify, search, organize)
6. A notification is sent back through SmartHole

### Via Chat Sidebar

```
Chat Sidebar → Plugin → Claude → Vault
                  ↓
            Sidebar Response
```

1. You type a command in the chat sidebar
2. The message goes directly to the plugin (bypassing WebSocket)
3. Claude interprets the command and executes vault operations
4. The response appears in the sidebar with tool usage details

## Supported Commands

Claude can perform these operations on your vault:

- **Create notes**: Create new notes with appropriate names and locations
- **Modify notes**: Append content, update sections, or edit existing notes
- **Search notes**: Find and read notes matching your query
- **Organize notes**: Rename or move notes between folders

## Troubleshooting

### Plugin shows "Disabled"

- The SmartHole connection is intentionally turned off in settings
- Go to Settings → SmartHole Client and toggle "Enable SmartHole Connection" on
- The plugin will immediately attempt to connect

### Plugin shows "Disconnected"

- Ensure SmartHole desktop is running
- Check that SmartHole is listening on `ws://127.0.0.1:9473`
- The plugin will automatically reconnect when SmartHole becomes available

### Commands aren't being processed

- Verify your Anthropic API key in settings
- Check the inbox folder (`.smarthole/inbox/`) for unprocessed messages
- Look in the developer console for error messages

### Notes aren't being created where expected

- Review your Information Architecture prompt in settings
- Claude uses this as guidance, so make your organizational preferences clear

## Development

See [CLAUDE.md](CLAUDE.md) for development guidelines and architecture details.

```bash
mise run dev         # Start dev mode
mise run build       # Build for distribution
mise run test        # Run tests
mise run quality     # All quality checks
```

## License

MIT License - see [LICENSE](LICENSE) for details.

## Related Projects

- [SmartHole Desktop](https://github.com/langadventurellc/smarthole-desktop) - The voice/text command router
- [SmartHole Client Docs](reference-docs/smarthole-client-docs/) - Protocol documentation
