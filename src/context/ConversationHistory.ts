/**
 * ConversationHistory - Persistent conversation history across plugin restarts.
 *
 * Maintains a rolling window of recent conversations and generates summaries
 * for older conversations to provide context for the LLM while keeping
 * storage bounded.
 */

import type SmartHolePlugin from "../main";
import type { LLMService } from "../llm";
import type { HistoryEntry, ConversationSummary, PersistedHistory } from "./types";

/** Default maximum number of recent conversations to retain */
const DEFAULT_MAX_CONVERSATIONS = 50;

/**
 * Number of conversations to include in the LLM context prompt.
 * Limited to prevent the system prompt from becoming too large,
 * which would consume excessive tokens and slow down responses.
 */
const CONTEXT_PROMPT_LIMIT = 10;

/**
 * Minimum number of conversations to summarize at once.
 * Summarizing in batches is more efficient than summarizing one at a time,
 * and produces more coherent summaries by providing broader context.
 */
const MIN_SUMMARIZE_BATCH = 10;

/** Plugin data key for persisted history */
const HISTORY_DATA_KEY = "conversationHistory";

/**
 * ConversationHistory manages persistent conversation history for the plugin.
 *
 * Usage:
 * ```typescript
 * const history = new ConversationHistory(plugin);
 * await history.load();
 * await history.addConversation({
 *   id: "msg-123",
 *   timestamp: new Date().toISOString(),
 *   userMessage: "Create a note about cats",
 *   assistantResponse: "I created a new note...",
 *   toolsUsed: ["createNote"]
 * });
 * const context = history.getContextPrompt();
 * ```
 */
export class ConversationHistory {
  private plugin: SmartHolePlugin;
  private history: PersistedHistory;

  constructor(plugin: SmartHolePlugin) {
    this.plugin = plugin;
    this.history = this.createEmptyHistory();
  }

  /**
   * Load conversation history from plugin data.
   * Call this on plugin startup.
   */
  async load(): Promise<void> {
    const data = await this.plugin.loadData();
    if (data && data[HISTORY_DATA_KEY]) {
      this.history = this.validateHistory(data[HISTORY_DATA_KEY]);
    }
  }

  /**
   * Add a completed conversation to history.
   * Automatically triggers summarization if history exceeds the limit.
   *
   * @param entry - The conversation entry to add
   */
  async addConversation(entry: HistoryEntry): Promise<void> {
    this.history.recentConversations.push(entry);
    await this.save();
  }

  /**
   * Get formatted context prompt for the LLM.
   * Includes recent conversations and summaries of older conversations.
   *
   * @returns Formatted context string for inclusion in system prompt
   */
  getContextPrompt(): string {
    const sections: string[] = [];

    // Add summaries of older conversations
    if (this.history.summaries.length > 0) {
      const summarySection = this.history.summaries
        .map(
          (s) =>
            `[${s.startDate} to ${s.endDate}] (${s.conversationCount} conversations):\n${s.summary}`
        )
        .join("\n\n");
      sections.push(`## Previous Conversation Summaries\n${summarySection}`);
    }

    // Add recent conversations
    if (this.history.recentConversations.length > 0) {
      const recentSection = this.history.recentConversations
        .slice(-CONTEXT_PROMPT_LIMIT)
        .map((entry) => {
          const tools = entry.toolsUsed.length > 0 ? ` [used: ${entry.toolsUsed.join(", ")}]` : "";
          return `[${entry.timestamp}]\nUser: ${entry.userMessage}\nAssistant: ${entry.assistantResponse}${tools}`;
        })
        .join("\n\n");
      sections.push(`## Recent Conversations\n${recentSection}`);
    }

    if (sections.length === 0) {
      return "";
    }

    return `## Conversation History\nYou have had previous conversations with this user. Use this context to provide continuity.\n\n${sections.join("\n\n")}`;
  }

  /**
   * Clear all conversation history.
   */
  async clear(): Promise<void> {
    this.history = this.createEmptyHistory();
    await this.save();
  }

  /**
   * Summarize old conversations when history exceeds the limit.
   * Uses the LLM to generate a summary of older conversations before
   * removing them from the recent list.
   *
   * @param llmService - Initialized LLM service to use for summarization
   */
  async summarizeOld(llmService: LLMService): Promise<void> {
    const maxConversations = this.getMaxConversations();

    if (this.history.recentConversations.length <= maxConversations) {
      return; // No summarization needed
    }

    const overflow = this.history.recentConversations.length - maxConversations;
    // Summarize at least MIN_SUMMARIZE_BATCH conversations to create meaningful summaries
    const toSummarize = Math.max(overflow, MIN_SUMMARIZE_BATCH);
    const conversationsToSummarize = this.history.recentConversations.slice(0, toSummarize);

    if (conversationsToSummarize.length === 0) {
      return;
    }

    // Generate summary using LLM
    const summary = await this.generateSummary(llmService, conversationsToSummarize);

    // Create summary entry
    const conversationSummary: ConversationSummary = {
      startDate: conversationsToSummarize[0].timestamp,
      endDate: conversationsToSummarize[conversationsToSummarize.length - 1].timestamp,
      summary,
      conversationCount: conversationsToSummarize.length,
    };

    // Update history
    this.history.summaries.push(conversationSummary);
    this.history.recentConversations = this.history.recentConversations.slice(toSummarize);
    this.history.lastSummarized = new Date().toISOString();

    await this.save();
  }

  /**
   * Get the current number of recent conversations.
   */
  getRecentCount(): number {
    return this.history.recentConversations.length;
  }

  /**
   * Get the current number of summaries.
   */
  getSummaryCount(): number {
    return this.history.summaries.length;
  }

  /**
   * Check if summarization is needed based on current settings.
   */
  needsSummarization(): boolean {
    return this.history.recentConversations.length > this.getMaxConversations();
  }

  private async save(): Promise<void> {
    const data = (await this.plugin.loadData()) || {};
    data[HISTORY_DATA_KEY] = this.history;
    await this.plugin.saveData(data);
  }

  private createEmptyHistory(): PersistedHistory {
    return {
      recentConversations: [],
      summaries: [],
      lastSummarized: "",
    };
  }

  private getMaxConversations(): number {
    return (
      (this.plugin.settings as { maxConversationHistory?: number }).maxConversationHistory ||
      DEFAULT_MAX_CONVERSATIONS
    );
  }

  private validateHistory(data: unknown): PersistedHistory {
    // Basic validation - return empty history if data is invalid
    if (!data || typeof data !== "object") {
      return this.createEmptyHistory();
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

  private async generateSummary(
    llmService: LLMService,
    conversations: HistoryEntry[]
  ): Promise<string> {
    const conversationText = conversations
      .map((entry) => {
        const tools = entry.toolsUsed.length > 0 ? ` (tools: ${entry.toolsUsed.join(", ")})` : "";
        return `[${entry.timestamp}]\nUser: ${entry.userMessage}\nAssistant: ${entry.assistantResponse}${tools}`;
      })
      .join("\n\n---\n\n");

    const prompt = `Please summarize the following ${conversations.length} conversations between a user and an Obsidian vault assistant. Focus on:
1. Key topics and themes discussed
2. Important notes or files created/modified
3. User preferences or patterns observed
4. Any ongoing tasks or projects mentioned

Keep the summary concise (2-3 paragraphs) but capture the essential context that would help continue conversations with this user.

Conversations:
${conversationText}`;

    const response = await llmService.processMessage(prompt);

    // Extract text content from response
    const textBlocks = response.content.filter(
      (block): block is { type: "text"; text: string } => block.type === "text"
    );

    return textBlocks.map((block) => block.text).join("\n") || "No summary generated.";
  }
}
