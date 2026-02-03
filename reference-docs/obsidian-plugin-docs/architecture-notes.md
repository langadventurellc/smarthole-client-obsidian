# Architecture Notes for Voice-LLM Plugin

Based on your requirements, here's a suggested high-level architecture:

```
┌─────────────────────────────────────────────────────────────────┐
│                     Obsidian Plugin                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  WebSocket   │  │   LLM API    │  │    Vault     │          │
│  │   Client     │  │   Client     │  │  Operations  │          │
│  │  (Standard)  │  │ (requestUrl) │  │   (CRUD)     │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                 │                   │
│         └────────────┬────┴────────────────┘                   │
│                      │                                          │
│              ┌───────▼───────┐                                  │
│              │   Command     │                                  │
│              │   Handler     │                                  │
│              │ (Tool Calls)  │                                  │
│              └───────────────┘                                  │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Settings   │  │   Status     │  │   Events     │          │
│  │ (API Key,    │  │   Bar        │  │ (File ops)   │          │
│  │  Prompts)    │  │              │  │              │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
              ┌─────────────────────────┐
              │   Local Voice Server    │
              │    (ws://localhost)     │
              └─────────────────────────┘
```

## Key Components

1. **WebSocket Client**: Connects to local voice transcription server, receives user commands
2. **LLM Client**: Sends interpreted commands to Claude API using `requestUrl()`
3. **Command Handler**: Maps LLM tool calls to vault operations
4. **Vault Operations**: Create, read, update, delete notes based on LLM output
5. **Settings**: Configure API keys (SecretStorage), model, prompts, server port
6. **Status Bar**: Show connection status, processing state
7. **Events**: React to file changes if needed for context

This architecture allows flexible voice-driven note creation with LLM interpretation while keeping all sensitive data secure.
