# Performance Considerations

## Optimize Plugin Load Time

1. **Use production builds** - Minify code for releases
2. **Minimize `onload()` work** - Only register commands, settings, event handlers
3. **Use `onLayoutReady()`** - Defer heavy operations until after Obsidian loads
4. **Defer views** - Use lazy loading for custom views

## Avoid Common Pitfalls

**Problem:** Listening to `vault.on('create')` fires for every file during startup.

**Solution:** Wait for layout ready:

```typescript
async onload() {
  this.app.workspace.onLayoutReady(() => {
    this.registerEvent(
      this.app.vault.on('create', this.onFileCreate.bind(this))
    );
  });
}
```

**Documentation:** [/Users/zach/code/obsidian-developer-docs/en/Plugins/Guides/Optimize plugin load time.md](/Users/zach/code/obsidian-developer-docs/en/Plugins/Guides/Optimize%20plugin%20load%20time.md)
