---
id: T-update-smarthole-registration
title: Update SmartHole registration defaults to use slug name and rich description
status: done
priority: high
parent: none
prerequisites: []
affectedFiles:
  src/settings.ts: Updated DEFAULT_SETTINGS.clientName from 'Miss Simone' to
    'obsidian', updated DEFAULT_ROUTING_DESCRIPTION to include 'Miss Simone -'
    prefix, updated Client Name placeholder from 'Miss Simone' to 'obsidian',
    and updated Client Name description to 'Identifier used when registering
    with SmartHole (lowercase, no spaces)'
log:
  - Updated SmartHole registration defaults to use slug name and rich
    description. Changed DEFAULT_SETTINGS.clientName from "Miss Simone" to
    "obsidian" (valid slug format). Updated DEFAULT_ROUTING_DESCRIPTION to
    include "Miss Simone" at the beginning for LLM routing. Updated the Client
    Name setting placeholder to show "obsidian" and updated the setting
    description to clarify that it must be lowercase with no spaces.
schema: v1.0
childrenIds: []
created: 2026-02-03T06:09:20.199Z
updated: 2026-02-03T06:09:20.199Z
---

# Update SmartHole registration defaults to use slug name and rich description

## Purpose

The SmartHole server requires the `name` field in registration to be a slug (no spaces, lowercase identifier). Currently, the default is `"Miss Simone"` which is invalid. Additionally, the routing description should mention "Miss Simone" so that when users say "Miss Simone, please do X", the LLM routing correctly matches this client.

## Background

From SmartHole documentation:
> Use a slug + rich description (recommended):
> - Name: `miss-simone` or `obsidian`
> - Description: "Miss Simone - My personal assistant that handles task management and reminders"
> - When you say "Miss Simone, please do X", the LLM routing will match based on the description

## Scope

### Changes Required

**File: `src/settings.ts`**

1. **Update `DEFAULT_SETTINGS.clientName`**
   - Change from: `"Miss Simone"`
   - Change to: `"obsidian"` (slug format)

2. **Update `DEFAULT_ROUTING_DESCRIPTION`**
   - Add "Miss Simone" context at the beginning so LLM routing matches when users reference Miss Simone
   - Example: `"Miss Simone - I manage personal notes, journals, lists, and knowledge in Obsidian. I can create notes, update existing ones, search for information, and organize files. Use me for anything related to remembering things, note-taking, or personal knowledge management."`

3. **Update the placeholder in the Client Name setting UI**
   - Change from: `"Miss Simone"`
   - Change to: `"obsidian"` (to reflect slug format expectation)

4. **Update the setting description for Client Name**
   - Current: `"Name used when registering with SmartHole"`
   - Update to clarify it must be a slug: `"Identifier used when registering with SmartHole (lowercase, no spaces)"`

## Acceptance Criteria

- [ ] `DEFAULT_SETTINGS.clientName` is `"obsidian"` (valid slug)
- [ ] `DEFAULT_ROUTING_DESCRIPTION` starts with "Miss Simone" or otherwise includes the name for LLM routing
- [ ] Client Name setting placeholder shows slug format example
- [ ] Client Name setting description clarifies slug requirement
- [ ] Plugin successfully registers with SmartHole using the new defaults
- [ ] Quality checks pass (`mise run quality`)

## Out of Scope

- Validation logic to enforce slug format on user input (future enhancement)
- Migration of existing user settings (users will keep their current values)
- Changes to SmartHole protocol or server-side behavior