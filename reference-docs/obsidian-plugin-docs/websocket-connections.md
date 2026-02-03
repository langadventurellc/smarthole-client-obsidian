# WebSocket Connections

**Important:** The Obsidian API does not provide a native WebSocket abstraction. However, since Obsidian runs in an Electron environment, you can use the standard browser WebSocket API directly.

```typescript
export default class MyPlugin extends Plugin {
  private ws: WebSocket | null = null;

  async onload() {
    this.connectToLocalServer();
  }

  async onunload() {
    // Clean up WebSocket connection
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  connectToLocalServer() {
    try {
      this.ws = new WebSocket('ws://localhost:8080');

      this.ws.onopen = () => {
        console.log('Connected to local server');
        // Register as client
        this.ws?.send(JSON.stringify({ type: 'register', client: 'obsidian-plugin' }));
      };

      this.ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        this.handleVoiceCommand(message);
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      this.ws.onclose = () => {
        console.log('WebSocket connection closed');
        // Optionally implement reconnection logic
      };
    } catch (error) {
      console.log('Local server not available');
    }
  }

  async handleVoiceCommand(message: { command: string }) {
    // Process voice command through LLM
    // Execute resulting actions on notes
  }
}
```

## Considerations for WebSocket Implementation

1. **Connection Management:** Always close WebSocket connections in `onunload()`
2. **Reconnection:** Implement retry logic for when the local server restarts
3. **Error Handling:** Gracefully handle connection failures (server not running)
4. **Desktop Only:** Set `isDesktopOnly: true` in manifest if using Node.js WebSocket libraries
