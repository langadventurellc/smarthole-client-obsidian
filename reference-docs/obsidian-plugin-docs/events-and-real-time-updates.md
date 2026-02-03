# Events and Real-time Updates

Register event handlers to respond to vault changes and app events.

## Vault Events

```typescript
export default class MyPlugin extends Plugin {
  async onload() {
    // File created
    this.registerEvent(
      this.app.vault.on('create', (file) => {
        if (file instanceof TFile) {
          console.log('New file:', file.path);
        }
      })
    );

    // File modified
    this.registerEvent(
      this.app.vault.on('modify', (file) => {
        console.log('Modified:', file.path);
      })
    );

    // File deleted
    this.registerEvent(
      this.app.vault.on('delete', (file) => {
        console.log('Deleted:', file.path);
      })
    );

    // File renamed
    this.registerEvent(
      this.app.vault.on('rename', (file, oldPath) => {
        console.log('Renamed from', oldPath, 'to', file.path);
      })
    );
  }
}
```

## MetadataCache Events

```typescript
// File indexed and cache available
this.registerEvent(
  this.app.metadataCache.on('changed', (file) => {
    const cache = this.app.metadataCache.getFileCache(file);
    // Process updated metadata
  })
);

// All files resolved
this.registerEvent(
  this.app.metadataCache.on('resolved', () => {
    console.log('All files have been indexed');
  })
);
```

## Timing Events

```typescript
// Register interval (auto-cleaned on unload)
this.registerInterval(
  window.setInterval(() => {
    // Check for server connection, etc.
  }, 5000)
);
```

## Layout Ready

Wait for Obsidian to fully load before running startup code:

```typescript
async onload() {
  this.app.workspace.onLayoutReady(() => {
    // Safe to interact with workspace
    // Initialize connections, etc.
  });
}

// Or check in event handlers
if (this.app.workspace.layoutReady) {
  // Workspace is ready
}
```

**Documentation:** [/Users/zach/code/obsidian-developer-docs/en/Plugins/Events.md](/Users/zach/code/obsidian-developer-docs/en/Plugins/Events.md)
