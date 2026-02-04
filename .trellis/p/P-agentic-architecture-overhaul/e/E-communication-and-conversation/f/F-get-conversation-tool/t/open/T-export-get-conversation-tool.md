---
id: T-export-get-conversation-tool
title: Export get_conversation tool from tools index
status: open
priority: medium
parent: F-get-conversation-tool
prerequisites:
  - T-create-get-conversation-tool
affectedFiles: {}
log: []
schema: v1.0
childrenIds: []
created: 2026-02-04T18:39:52.081Z
updated: 2026-02-04T18:39:52.081Z
---

# Export get_conversation tool from tools index

## Overview
Add exports for the new `get_conversation` tool to `src/llm/tools/index.ts`.

## Location
`src/llm/tools/index.ts`

## Implementation Details

### Add Import
```typescript
import { createGetConversationTool } from "./getConversation";
```

### Add Exports
Following the pattern of `endConversation` and `sendMessage`, add:

```typescript
// Get Conversation Tool (separate from vault tools - requires runtime context)
export { createGetConversationTool } from "./getConversation";
export type { GetConversationContext, GetConversationInput } from "./getConversation";
```

### Placement
Add after the existing `endConversation` exports (at the end of the file), maintaining the pattern of grouping context-dependent tools separately from vault tools.

## Acceptance Criteria
- [ ] Factory function exported
- [ ] Context interface type exported
- [ ] Input type exported
- [ ] Follows existing export pattern for context-dependent tools