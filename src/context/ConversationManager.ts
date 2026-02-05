import type SmartHolePlugin from "../main";
import type { LLMService } from "../llm";
import { extractTextContent } from "../llm";
import type {
  Conversation,
  ConversationBranch,
  ConversationMessage,
  PersistedConversations,
  PersistedHistory,
  HistoryEntry,
  ConversationSummary,
} from "./types";

const CONVERSATION_DATA_KEY = "conversationData";
const HISTORY_DATA_KEY = "conversationHistory";
const RECENT_SUMMARY_COUNT = 2;

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

    // Check for existing new-format data
    if (data && data[CONVERSATION_DATA_KEY]) {
      this.loadFromPersistedConversations(data[CONVERSATION_DATA_KEY]);
      return;
    }

    // Check for old-format data that needs migration
    if (data && data[HISTORY_DATA_KEY]) {
      const validatedOldHistory = this.validateOldHistory(data[HISTORY_DATA_KEY]);
      await this.migrateFromOldFormat(validatedOldHistory);
      return;
    }

    // No existing data - start fresh
    this.conversations = [];
    this.activeConversationId = null;
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

  /**
   * Clear all conversation history.
   * Resets conversations to empty and persists the cleared state.
   */
  async clearAll(): Promise<void> {
    this.conversations = [];
    this.activeConversationId = null;
    await this.save();
  }

  /**
   * Fork the active conversation from a specific message point.
   * Archives messages from the fork point onward into a new branch and
   * removes them from the active conversation.
   *
   * @param messageId - The ID of the message to fork from (this message and all after it are archived)
   * @returns The archived messages and the fork point index
   * @throws Error if no active conversation or message not found
   */
  async forkConversation(
    messageId: string
  ): Promise<{ archivedMessages: ConversationMessage[]; forkPoint: number }> {
    const active = this.getActiveConversation();
    if (!active) {
      throw new Error("No active conversation to fork");
    }

    const forkPoint = active.messages.findIndex((msg) => msg.id === messageId);
    if (forkPoint === -1) {
      throw new Error(`Message not found in active conversation: ${messageId}`);
    }

    // Extract messages from fork point onward
    const archivedMessages = active.messages.slice(forkPoint);

    // Create new branch with archived messages
    const branch: ConversationBranch = {
      messages: archivedMessages,
      archivedAt: new Date().toISOString(),
    };

    // Initialize archivedBranches if needed, then add the new branch
    if (!active.archivedBranches) {
      active.archivedBranches = [];
    }
    active.archivedBranches.push(branch);

    // Remove archived messages from active conversation (truncate at fork point)
    active.messages = active.messages.slice(0, forkPoint);

    // Persist atomically
    await this.save();

    return { archivedMessages, forkPoint };
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
    const sections: string[] = [];

    // Build recent conversations section from ended conversations with summaries
    const recentConversations = this.getRecentConversations(RECENT_SUMMARY_COUNT).filter(
      (c) => c.title !== null && c.summary !== null
    );

    if (recentConversations.length > 0) {
      const summaries = recentConversations
        .map((c) => `### ${c.title} (ended ${c.endedAt})\n${c.summary}`)
        .join("\n\n");
      sections.push(`## Recent Conversations\n${summaries}`);
    }

    // Build current conversation section
    const active = this.getActiveConversation();
    if (active && active.messages.length > 0) {
      const messageSection = active.messages
        .map((msg) => {
          const tools = msg.toolsUsed?.length ? ` [used: ${msg.toolsUsed.join(", ")}]` : "";
          return `[${msg.timestamp}]\n${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}${tools}`;
        })
        .join("\n\n");
      sections.push(`## Current Conversation\n${messageSection}`);
    }

    return sections.join("\n\n");
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

  private async migrateFromOldFormat(oldHistory: PersistedHistory): Promise<void> {
    console.log("ConversationManager: Migrating from old conversation history format");

    const recentConversations = oldHistory.recentConversations || [];
    const summaries = oldHistory.summaries || [];

    if (recentConversations.length === 0 && summaries.length === 0) {
      // Nothing to migrate
      this.conversations = [];
      this.activeConversationId = null;
      await this.save();
      return;
    }

    // Create a single completed conversation from all old entries
    const migratedConversation: Conversation = {
      id: `conv-migrated-${Date.now()}`,
      startedAt: recentConversations[0]?.timestamp || new Date().toISOString(),
      endedAt: new Date().toISOString(),
      title: "Migrated Conversation History",
      summary: this.buildMigrationSummary(recentConversations, summaries),
      messages: this.convertOldEntriesToMessages(recentConversations),
    };

    this.conversations = [migratedConversation];
    this.activeConversationId = null;

    // Save in new format and clear old format data
    const data = (await this.plugin.loadData()) || {};
    delete data[HISTORY_DATA_KEY];
    const persisted = this.toPersistedFormat();
    persisted.lastMigrated = new Date().toISOString();
    data[CONVERSATION_DATA_KEY] = persisted;
    await this.plugin.saveData(data);

    console.log(
      `ConversationManager: Migrated ${recentConversations.length} entries to new format`
    );
  }

  private convertOldEntriesToMessages(entries: HistoryEntry[]): ConversationMessage[] {
    const messages: ConversationMessage[] = [];

    for (const entry of entries) {
      // Add user message
      messages.push({
        id: `${entry.id}-user`,
        timestamp: entry.timestamp,
        role: "user",
        content: entry.userMessage,
      });

      // Add assistant response
      const toolsUsed = entry.toolsUsed || [];
      messages.push({
        id: `${entry.id}-assistant`,
        timestamp: entry.timestamp,
        role: "assistant",
        content: entry.assistantResponse,
        toolsUsed: toolsUsed.length > 0 ? toolsUsed : undefined,
      });
    }

    return messages;
  }

  private buildMigrationSummary(
    entries: HistoryEntry[],
    oldSummaries: ConversationSummary[]
  ): string {
    const parts: string[] = [];

    if (oldSummaries.length > 0) {
      parts.push("Historical summaries:");
      for (const summary of oldSummaries) {
        parts.push(
          `- ${summary.startDate} to ${summary.endDate} (${summary.conversationCount} conversations): ${summary.summary}`
        );
      }
    }

    if (entries.length > 0) {
      parts.push(`\nMigrated ${entries.length} recent conversations from previous format.`);

      // Extract unique tools used
      const allTools = new Set<string>();
      for (const entry of entries) {
        const toolsUsed = entry.toolsUsed || [];
        for (const tool of toolsUsed) {
          allTools.add(tool);
        }
      }
      if (allTools.size > 0) {
        parts.push(`Tools used: ${Array.from(allTools).join(", ")}`);
      }
    }

    return parts.join("\n") || "Migrated from legacy conversation history format.";
  }

  private toPersistedFormat(): PersistedConversations {
    return {
      conversations: this.conversations,
    };
  }

  private validateOldHistory(data: unknown): PersistedHistory {
    if (!data || typeof data !== "object") {
      return { recentConversations: [], summaries: [], lastSummarized: "" };
    }

    const candidate = data as Partial<PersistedHistory>;

    return {
      recentConversations: Array.isArray(candidate.recentConversations)
        ? candidate.recentConversations.filter(this.isValidHistoryEntry)
        : [],
      summaries: Array.isArray(candidate.summaries)
        ? candidate.summaries.filter(this.isValidSummary)
        : [],
      lastSummarized: typeof candidate.lastSummarized === "string" ? candidate.lastSummarized : "",
    };
  }

  private isValidHistoryEntry(entry: unknown): entry is HistoryEntry {
    if (!entry || typeof entry !== "object") return false;
    const e = entry as Partial<HistoryEntry>;
    return (
      typeof e.id === "string" &&
      typeof e.timestamp === "string" &&
      typeof e.userMessage === "string" &&
      typeof e.assistantResponse === "string" &&
      Array.isArray(e.toolsUsed)
    );
  }

  private isValidSummary(summary: unknown): summary is ConversationSummary {
    if (!summary || typeof summary !== "object") return false;
    const s = summary as Partial<ConversationSummary>;
    return (
      typeof s.startDate === "string" &&
      typeof s.endDate === "string" &&
      typeof s.summary === "string" &&
      typeof s.conversationCount === "number"
    );
  }

  private loadFromPersistedConversations(data: unknown): void {
    const persisted = this.validatePersistedData(data);
    this.conversations = persisted.conversations;

    // Find active conversation (one without endedAt)
    const active = this.conversations.find((c) => c.endedAt === null);
    this.activeConversationId = active?.id ?? null;
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
