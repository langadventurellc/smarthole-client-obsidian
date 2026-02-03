---
id: T-implement-generate-description
title: Implement Generate Description from IA Feature
status: open
priority: medium
parent: F-conversation-history
prerequisites: []
affectedFiles: {}
log: []
schema: v1.0
childrenIds: []
created: 2026-02-03T17:23:04.576Z
updated: 2026-02-03T17:23:04.576Z
---

# Implement Generate Description from IA Feature

## Purpose

Enable the "Generate" button in settings to use the LLM to analyze the Information Architecture text and generate an effective routing description automatically.

## Current State

The "Generate" button already exists in `src/settings.ts` (lines 117-125) but has a placeholder `onClick` handler that only logs to console:

```typescript
new Setting(containerEl)
  .setName("Generate from IA")
  .setDesc("Generate routing description based on your Information Architecture")
  .addButton((button) =>
    button.setButtonText("Generate").onClick(() => {
      // MVP placeholder - feature requires API connection
      console.log("Generate description feature requires API connection (not yet implemented)");
    })
  );
```

## Implementation

### Update Settings Tab

1. **Modify the onClick handler** to:
   - Check if API key is configured (show error via inline status if not)
   - Show loading state on button (disable button, change text to "Generating...")
   - Initialize LLMService with the plugin's settings
   - Send the Information Architecture to the LLM with a specific prompt
   - Update the `routingDescription` setting with the generated text
   - Save settings
   - Refresh the settings UI to show the new value in the textarea (call `display()` again)
   - Show success/error status via inline text next to the button

2. **LLM Prompt**: Create a prompt that asks Claude to:
   - Analyze the Information Architecture text
   - Generate a concise routing description (similar to the default format)
   - Focus on what this client can do and when to use it
   - Keep it under ~150 words for effective routing

### Status Display

**Use inline status text next to the Generate button** (not SmartHole notifications):
- Add a status text element that shows generation progress and results
- Examples: "Generating...", "Description generated successfully!", "Error: API key not configured"
- Clear status after a few seconds or on next interaction
- This approach works regardless of SmartHole connection status

### Error Handling

- API key not configured: Show inline error message
- API call fails: Show inline error with details
- Empty IA text: Show message asking user to fill in IA first

## Acceptance Criteria

- [ ] "Generate" button initializes LLMService and calls API
- [ ] LLM receives Information Architecture text with appropriate prompt
- [ ] Generated description is concise and effective for routing
- [ ] routingDescription setting updated with generated text
- [ ] Settings saved automatically after generation
- [ ] Settings UI refreshed to show new value (via `display()`)
- [ ] **Inline status text shows success/error messages** (not SmartHole notifications)
- [ ] Handles missing API key gracefully (inline error message)
- [ ] Handles empty Information Architecture (inline error message)
- [ ] Button shows loading state during generation

## Technical Notes

- SmartHoleSettingTab has access to `this.plugin` which has `this.plugin.settings`
- LLMService is in `src/llm/LLMService.ts` and requires `initialize()` before use
- To refresh settings UI after update, call `this.display()` from within the setting tab
- Use `Setting.setDesc()` or add a separate status element for inline status messages