import type SmartHolePlugin from "../main";
import type { LLMService } from "../llm";
import { extractTextContent } from "../llm";
import type { Conversation, ConversationMessage, PersistedConversations } from "./types";

const CONVERSATION_DATA_KEY = "conversationData";

export class ConversationManager {
  private plugin: SmartHolePlugin;
  private conversations: Conversation[];
  private activeConversationId: string | null;

  constructor(plugin: SmartHolePlugin) {
    this.plugin = plugin;
    this.conversations = [];
    this.activeConversationId = null;
  }

  async load(): Promise<void> {
    const data = await this.plugin.loadData();
    if (data && data[CONVERSATION_DATA_KEY]) {
      const persisted = this.validatePersistedData(data[CONVERSATION_DATA_KEY]);
      this.conversations = persisted.conversations;

      const active = this.conversations.find((c) => c.endedAt === null);
      this.activeConversationId = active?.id ?? null;
    }
  }

  private async save(): Promise<void> {
    const data = (await this.plugin.loadData()) || {};
    const persisted: PersistedConversations = {
      conversations: this.conversations,
    };
    data[CONVERSATION_DATA_KEY] = persisted;
    await this.plugin.saveData(data);
  }

  getActiveConversation(): Conversation | null {
    if (!this.activeConversationId) {
      return null;
    }
    return this.conversations.find((c) => c.id === this.activeConversationId) ?? null;
  }

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

      const newConversation = this.createConversation();
      this.conversations.push(newConversation);
      this.activeConversationId = newConversation.id;

      this.enforceConversationLimit();
    }

    const activeConversation = this.getActiveConversation();
    if (!activeConversation) {
      throw new Error("No active conversation available");
    }

    activeConversation.messages.push(message);
    await this.save();

    return activeConversation;
  }

  async endConversation(llmService?: LLMService): Promise<void> {
    const active = this.getActiveConversation();
    if (!active) {
      return;
    }

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

  async generateConversationSummary(
    conversationId: string,
    llmService: LLMService
  ): Promise<{ title: string; summary: string }> {
    const conversation = this.getConversation(conversationId);
    if (!conversation) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }

    const messagesText = conversation.messages
      .map((msg) => {
        const tools = msg.toolsUsed?.length ? ` (tools: ${msg.toolsUsed.join(", ")})` : "";
        return `[${msg.timestamp}]\n${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}${tools}`;
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

    // Extract text content using the utility function
    const responseText = extractTextContent(response);

    // Parse response
    const titleMatch = responseText.match(/TITLE:\s*(.+?)(?:\n|$)/i);
    const summaryMatch = responseText.match(/SUMMARY:\s*(.+)/is);

    return {
      title: titleMatch?.[1]?.trim() || "Untitled Conversation",
      summary: summaryMatch?.[1]?.trim() || "No summary available.",
    };
  }

  private shouldStartNewConversation(): boolean {
    if (!this.activeConversationId) {
      return true;
    }

    const active = this.getActiveConversation();
    if (!active || active.messages.length === 0) {
      return true;
    }

    const lastMessage = active.messages[active.messages.length - 1];
    const lastMessageTime = new Date(lastMessage.timestamp).getTime();
    const now = Date.now();
    const idleMs = this.getIdleTimeoutMs();

    return now - lastMessageTime > idleMs;
  }

  private getIdleTimeoutMs(): number {
    const minutes = this.plugin.settings.conversationIdleTimeoutMinutes ?? 30;
    return minutes * 60 * 1000;
  }

  private enforceConversationLimit(): void {
    const maxRetained = this.plugin.settings.maxConversationsRetained ?? 1000;

    const endedConversations = this.conversations.filter((c) => c.endedAt !== null);

    if (endedConversations.length > maxRetained) {
      const sorted = [...endedConversations].sort(
        (a, b) => new Date(a.endedAt!).getTime() - new Date(b.endedAt!).getTime()
      );
      const toRemove = sorted.slice(0, endedConversations.length - maxRetained);
      const idsToRemove = new Set(toRemove.map((c) => c.id));
      this.conversations = this.conversations.filter((c) => !idsToRemove.has(c.id));
    }
  }

  getContextPrompt(): string {
    const active = this.getActiveConversation();
    if (!active || active.messages.length === 0) {
      return "";
    }

    const messageSection = active.messages
      .map((msg) => {
        const tools = msg.toolsUsed?.length ? ` [used: ${msg.toolsUsed.join(", ")}]` : "";
        return `[${msg.timestamp}]\n${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}${tools}`;
      })
      .join("\n\n");

    return `## Current Conversation\n${messageSection}`;
  }

  getConversation(id: string): Conversation | null {
    return this.conversations.find((c) => c.id === id) ?? null;
  }

  getRecentConversations(limit: number = 10): Conversation[] {
    return this.conversations
      .filter((c) => c.endedAt !== null)
      .sort((a, b) => new Date(b.endedAt!).getTime() - new Date(a.endedAt!).getTime())
      .slice(0, limit);
  }

  private createConversation(): Conversation {
    const now = new Date().toISOString();
    return {
      id: `conv-${Date.now()}`,
      startedAt: now,
      endedAt: null,
      title: null,
      summary: null,
      messages: [],
    };
  }

  private validatePersistedData(data: unknown): PersistedConversations {
    if (!data || typeof data !== "object") {
      return { conversations: [] };
    }

    const candidate = data as Partial<PersistedConversations>;

    return {
      conversations: Array.isArray(candidate.conversations)
        ? candidate.conversations.filter(this.isValidConversation)
        : [],
      lastMigrated: typeof candidate.lastMigrated === "string" ? candidate.lastMigrated : undefined,
    };
  }

  private isValidConversation(conv: unknown): conv is Conversation {
    if (!conv || typeof conv !== "object") return false;
    const c = conv as Partial<Conversation>;
    return (
      typeof c.id === "string" &&
      typeof c.startedAt === "string" &&
      (c.endedAt === null || typeof c.endedAt === "string") &&
      (c.title === null || typeof c.title === "string") &&
      (c.summary === null || typeof c.summary === "string") &&
      Array.isArray(c.messages)
    );
  }
}
