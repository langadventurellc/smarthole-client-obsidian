---
id: T-add-retrospection-settings
title: Add retrospection settings
status: done
priority: high
parent: F-conversation-retrospection
prerequisites: []
affectedFiles:
  src/settings.ts: Added enableConversationRetrospection and retrospectionPrompt
    fields to SmartHoleSettings interface, created DEFAULT_RETROSPECTION_PROMPT
    constant, added both fields to DEFAULT_SETTINGS, and added toggle + textarea
    UI controls in the settings tab display() method
  src/main.ts: Added extraction logic for enableConversationRetrospection
    (boolean) and retrospectionPrompt (string) in extractSettings() method
log:
  - "Added two new settings for the conversation retrospection feature:
    `enableConversationRetrospection` (boolean toggle, default false) and
    `retrospectionPrompt` (textarea with a comprehensive default prompt).
    Updated the SmartHoleSettings interface, DEFAULT_SETTINGS constant, settings
    tab UI, and extractSettings() method. The default prompt asks the LLM to
    reflect on system prompt improvements, vault knowledge gaps, tooling
    opportunities, and workflow improvements."
schema: v1.0
childrenIds: []
created: 2026-02-05T23:04:55.547Z
updated: 2026-02-05T23:04:55.547Z
---

Add two new settings for the conversation retrospection feature:

1. **`enableConversationRetrospection: boolean`** — Toggle, default `false`
2. **`retrospectionPrompt: string`** — Textarea with a default prompt

## Implementation Plan

### File: `src/settings.ts`

**1. Update `SmartHoleSettings` interface** (line ~7-22)

Add two new fields after the existing `conversationStateTimeoutMinutes` field:

```typescript
/** Whether to run a background retrospection when conversations end */
enableConversationRetrospection: boolean;
/** Prompt used for the retrospection LLM call */
retrospectionPrompt: string;
```

**2. Define the default retrospection prompt** (around line ~24, near other default constants)

Create a `DEFAULT_RETROSPECTION_PROMPT` constant:

```typescript
const DEFAULT_RETROSPECTION_PROMPT = `Review this conversation and reflect on opportunities for improvement. Consider:

1. **System Prompt Improvements**: Were there missing instructions, unclear guidance, or information that should be added to the system prompt to handle this type of request better?

2. **Vault Knowledge Gaps**: What did you not know about the vault's structure, naming conventions, or content that would have helped? Were there files or folders you expected to exist but didn't?

3. **Tooling Opportunities**: Were there actions you wished you could take but couldn't? Tools that would have made the interaction smoother or more effective?

4. **Workflow Improvements**: Could this type of request be handled more efficiently? Are there patterns or shortcuts that would improve the experience?

Provide specific, actionable insights. Focus on what would make future similar conversations more effective.`;
```

**3. Update `DEFAULT_SETTINGS`** (line ~39-50)

Add to the defaults object:

```typescript
enableConversationRetrospection: false,
retrospectionPrompt: DEFAULT_RETROSPECTION_PROMPT,
```

**4. Add settings UI in `SmartHoleSettingTab.display()`** (around line ~302-340, after the "Conversation Idle Timeout" and before "Max Conversations Retained" or after "Clear Conversation History")

Insert a toggle and textarea, following the existing patterns:

```typescript
// Conversation Retrospection toggle
new Setting(containerEl)
  .setName("Enable Conversation Retrospection")
  .setDesc(
    "When enabled, the LLM will reflect on each completed conversation and log insights to .smarthole/retrospection.md"
  )
  .addToggle((toggle) =>
    toggle
      .setValue(this.plugin.settings.enableConversationRetrospection)
      .onChange(async (value) => {
        this.plugin.settings.enableConversationRetrospection = value;
        await this.plugin.saveSettings();
      })
  );

// Retrospection Prompt textarea
new Setting(containerEl)
  .setName("Retrospection Prompt")
  .setDesc("Prompt used when reflecting on completed conversations")
  .addTextArea((text) => {
    text.inputEl.rows = 8;
    text.inputEl.cols = 50;
    return text
      .setValue(this.plugin.settings.retrospectionPrompt)
      .onChange(async (value) => {
        this.plugin.settings.retrospectionPrompt = value;
        await this.plugin.saveSettings();
      });
  });
```

The textarea pattern already exists in the codebase (see `routingDescription` at line ~159-171 and `informationArchitecture` at line ~173-186). Follow the same `.addTextArea()` chain.

### File: `src/main.ts`

**5. Update `extractSettings()`** (line ~159-187)

Add extraction for both new fields following the exact pattern used by existing settings:

```typescript
if (typeof d.enableConversationRetrospection === "boolean")
  settings.enableConversationRetrospection = d.enableConversationRetrospection;
if (typeof d.retrospectionPrompt === "string")
  settings.retrospectionPrompt = d.retrospectionPrompt;
```

## Patterns to Follow

- The `SmartHoleSettings` interface at line 7 defines all settings fields with JSDoc comments
- `DEFAULT_SETTINGS` at line 39 provides defaults for every field
- `extractSettings()` in `main.ts` at line 159 maps each field individually with `typeof` type checking — this prevents loading stale/unrelated data from plugin storage
- Toggle settings use `.addToggle()` on a `new Setting(containerEl)` chain (see line 104-115)
- Textarea settings use `.addTextArea()` with `text.inputEl.rows` and `text.inputEl.cols` for sizing (see line 163-171 and 177-186)
- All settings changes call `await this.plugin.saveSettings()` in the onChange callback

## Acceptance Criteria

- [ ] `enableConversationRetrospection` field exists in `SmartHoleSettings` interface
- [ ] `retrospectionPrompt` field exists in `SmartHoleSettings` interface
- [ ] Both fields have defaults in `DEFAULT_SETTINGS`
- [ ] Toggle renders in settings tab UI
- [ ] Textarea renders in settings tab UI
- [ ] `extractSettings()` handles both fields
- [ ] `mise run quality` passes