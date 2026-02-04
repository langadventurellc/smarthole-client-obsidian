---
id: E-agentic-conversation-state
title: Agentic Conversation State
status: open
priority: high
parent: P-agentic-architecture-overhaul
prerequisites:
  - E-agentic-tools-infrastructure
affectedFiles: {}
log: []
schema: v1.0
childrenIds: []
created: 2026-02-04T00:47:09.507Z
updated: 2026-02-04T00:47:09.507Z
---

Enable fully autonomous multi-step execution with conversational state management, allowing the agent to ask questions and wait for user responses.

## Scope

This epic covers the changes needed to support agentic autonomy:

1. **Conversation state tracking** - Distinguish between "task complete" and "waiting for response"
2. **Message processor updates** - Support ongoing conversations, not just one-shot processing
3. **State persistence** - Store conversation state appropriately
4. **Multi-turn tool chaining** - Agent can chain multiple tool calls without user intervention

## Key Requirements

- Agent can ask questions and wait for user responses
- Track "conversation in progress" state
- Clear distinction between "task complete" and "awaiting response"
- Safety limit on tool iterations remains in place (existing MAX_TOOL_ITERATIONS=10)
- State persists between messages when agent is "waiting"

## Technical Approach

- Add conversation state types to `src/processor/types.ts`
- Update `MessageProcessor` to handle ongoing conversation state
- Integrate with `send_message` tool for real-time question delivery
- Store conversation state in PersistedHistory or separate storage

## Files to Modify

- `src/llm/LLMService.ts` - Handle conversation state, sendMessage integration
- `src/processor/MessageProcessor.ts` - Support ongoing conversations
- `src/processor/types.ts` - Add conversation state types

## Acceptance Criteria (from requirements)

- Agent executes multi-step tool chains autonomously
- Agent can ask questions and receive follow-up responses
- Conversation state persists between messages when agent is "waiting"
- Clear distinction between "task complete" and "awaiting response"
- Safety limit on tool iterations remains in place