---
id: T-implement-generate-description
title: Implement Generate Description from IA Feature
status: done
priority: medium
parent: F-conversation-history
prerequisites: []
affectedFiles:
  src/settings.ts: "Added imports for LLMService, LLMError, and extractTextContent
    from ./llm module. Replaced the placeholder Generate button onClick handler
    with full implementation: validation for API key and IA text, loading state
    management, LLM service initialization and message processing, settings
    update and save, UI refresh, and inline status display for success/error
    feedback."
log:
  - >-
    Completed research phase:

    - Analyzed src/settings.ts - found the existing Generate button placeholder
    at lines 118-127

    - Analyzed src/llm/LLMService.ts - understand how to initialize and use the
    service

    - Analyzed src/llm/types.ts - understand extractTextContent for getting text
    from LLM response

    - Analyzed src/main.ts - understand plugin structure and how settings are
    accessed

    - The LLMService requires initialize() before use, which fetches API key
    from Obsidian's secret storage

    - LLMError.authError is used for API key issues


    Implementation plan:

    1. Import LLMService, LLMError, extractTextContent in settings.ts

    2. Modify the Generate button onClick handler to:
       - Check if API key is configured (show inline error if not)
       - Check if IA text is empty (show inline error if so)
       - Create LLMService instance with app and settings
       - Initialize service (handles API key retrieval)
       - Call processMessage with a prompt asking for routing description
       - Extract text content from response
       - Update routingDescription setting
       - Save settings
       - Call display() to refresh UI
       - Handle errors with inline status text
  - >-
    Implemented the "Generate Description from IA" feature in the settings page.
    The Generate button now:

    1. Validates that an API key is configured (shows inline error if not)

    2. Validates that the Information Architecture text is not empty (shows
    inline error if empty)

    3. Shows a loading state (button disabled, text changes to "Generating...")

    4. Initializes LLMService with the plugin's app and settings

    5. Sends the IA to the LLM with a prompt requesting a concise routing
    description

    6. Updates the routingDescription setting with the generated text

    7. Saves settings automatically

    8. Refreshes the settings UI after a brief delay to show the new value

    9. Shows inline success/error status text next to the button (not SmartHole
    notifications)

    10. Properly handles all error cases including LLMError and generic errors
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