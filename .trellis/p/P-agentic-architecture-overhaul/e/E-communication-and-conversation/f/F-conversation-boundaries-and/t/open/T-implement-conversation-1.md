---
id: T-implement-conversation-1
title: Implement Conversation Summary Generation
status: open
priority: medium
parent: F-conversation-boundaries-and
prerequisites:
  - T-implement-conversationmanager
affectedFiles: {}
log: []
schema: v1.0
childrenIds: []
created: 2026-02-04T17:11:49.998Z
updated: 2026-02-04T17:11:49.998Z
---

# Implement Conversation Summary Generation

## Purpose

Generate title and summary for conversations when they end, using the user's configured LLM model. This provides context for the `get_conversation` tool and allows efficient browsing of past conversations.

## Implementation

### Extend ConversationManager

Add summary generation method to `ConversationManager`:

```typescript
async generateConversationSummary(
  conversationId: string, 
  llmService: LLMService
): Promise<{ title: string; summary: string }>;
```

### Summary Generation Logic

```typescript
async generateConversationSummary(
  conversationId: string,
  llmService: LLMService
): Promise<{ title: string; summary: string }> {
  const conversation = this.getConversation(conversationId);
  if (!conversation) {
    throw new Error(`Conversation not found: ${conversationId}`);
  }
  
  const messagesText = conversation.messages
    .map(msg => {
      const tools = msg.toolsUsed?.length ? ` (tools: ${msg.toolsUsed.join(", ")})` : "";
      return `[${msg.timestamp}]\n${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}${tools}`;
    })
    .join("\n\n---\n\n");

  const prompt = `Analyze this conversation between a user and an Obsidian vault assistant.

Conversation:
${messagesText}

Generate:
1. A brief title (5-8 words max) that captures the main topic
2. A concise summary (2-3 sentences) covering: topics discussed, actions taken, and outcomes

Format your response as:
TITLE: [your title here]
SUMMARY: [your summary here]`;

  const response = await llmService.processMessage(prompt);
  
  // Extract text content
  const textBlocks = response.content.filter(
    (block): block is { type: "text"; text: string } => block.type === "text"
  );
  const responseText = textBlocks.map(block => block.text).join("\n");
  
  // Parse response
  const titleMatch = responseText.match(/TITLE:\s*(.+?)(?:\n|$)/i);
  const summaryMatch = responseText.match(/SUMMARY:\s*(.+)/is);
  
  return {
    title: titleMatch?.[1]?.trim() || "Untitled Conversation",
    summary: summaryMatch?.[1]?.trim() || "No summary available."
  };
}
```

### Update endConversation Method

Modify the `endConversation` method to accept an optional `LLMService` and generate summary:

```typescript
async endConversation(llmService?: LLMService): Promise<void> {
  const active = this.getActiveConversation();
  if (!active) return;
  
  active.endedAt = new Date().toISOString();
  
  // Generate summary if LLM service provided and conversation has messages
  if (llmService && active.messages.length > 0) {
    try {
      const { title, summary } = await this.generateConversationSummary(active.id, llmService);
      active.title = title;
      active.summary = summary;
    } catch (error) {
      console.error("Failed to generate conversation summary:", error);
      active.title = "Conversation";
      active.summary = "Summary generation failed.";
    }
  }
  
  this.activeConversationId = null;
  this.enforceConversationLimit();
  await this.save();
}
```

### Automatic Summary on Idle Timeout

When `shouldStartNewConversation()` returns true due to idle timeout, the previous conversation should be ended with summary generation. Update `addMessage()`:

```typescript
async addMessage(message: ConversationMessage, llmService?: LLMService): Promise<Conversation> {
  if (this.shouldStartNewConversation()) {
    // End previous conversation with summary if it exists
    if (this.activeConversationId && llmService) {
      await this.endConversation(llmService);
    } else if (this.activeConversationId) {
      // End without summary if no LLM service available
      const active = this.getActiveConversation();
      if (active) {
        active.endedAt = new Date().toISOString();
        this.activeConversationId = null;
      }
    }
    
    // Start new conversation
    this.createNewConversation();
  }
  
  // ... rest of addMessage logic
}
```

## Acceptance Criteria

- [ ] `generateConversationSummary()` generates title and summary using LLM
- [ ] Summary generated immediately when conversation ends via `endConversation(llmService)`
- [ ] Summary uses user's configured model (via passed LLMService)
- [ ] Title limited to ~5-8 words, summary to 2-3 sentences
- [ ] Graceful fallback if summary generation fails (sets default title/summary)
- [ ] Summary generated on idle timeout when new conversation starts
- [ ] `addMessage()` accepts optional `llmService` parameter for automatic summary generation

## Dependencies

- Requires T-implement-conversationmanager-core (ConversationManager must exist)

## Technical Notes

- LLMService is passed in rather than stored to avoid circular dependencies
- Summary generation is async - callers should await if they need the summary
- Consider caching: don't regenerate summary if conversation already has one