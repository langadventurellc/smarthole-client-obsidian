import type { App } from "obsidian";

import type { Conversation } from "../context/types";
import { extractTextContent, LLMService } from "../llm";
import type { SmartHoleSettings } from "../settings";
import { formatLocalTimestamp } from "../utils/time";

const RETROSPECTION_FILE = ".smarthole/retrospection.md";

export interface RetrospectionResult {
  conversationTitle: string;
  content: string;
  timestamp: string;
}

export class RetrospectionService {
  private app: App;
  private settings: SmartHoleSettings;

  constructor(app: App, settings: SmartHoleSettings) {
    this.app = app;
    this.settings = settings;
  }

  async runRetrospection(conversation: Conversation): Promise<RetrospectionResult> {
    // Build prompt from conversation messages + retrospection prompt
    const prompt = this.buildPrompt(conversation);

    // Create a fresh LLMService with no tools registered (read-only reflection).
    // Non-streaming: micro-agent call that doesn't need streaming benefits.
    const llmService = new LLMService(this.app, this.settings, { streaming: false });
    await llmService.initialize();

    // Call LLM -- no tools registered, so no tool_use loop
    const response = await llmService.processMessage(prompt);
    const content = extractTextContent(response);

    // Persist to vault file
    const timestamp = new Date().toISOString();
    const title = conversation.title || "Untitled";
    await this.persistRetrospection(title, content, timestamp);

    return { conversationTitle: title, content, timestamp };
  }

  buildPrompt(conversation: Conversation): string {
    const title = conversation.title || "Untitled";

    const messagesText = conversation.messages
      .map((msg) => {
        const tools = msg.toolsUsed?.length ? ` (tools: ${msg.toolsUsed.join(", ")})` : "";
        return `[${formatLocalTimestamp(msg.timestamp)}] ${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}${tools}`;
      })
      .join("\n\n");

    return `Here is a completed conversation titled "${title}":\n\n${messagesText}\n\n---\n\n${this.settings.retrospectionPrompt}`;
  }

  formatEntry(title: string, content: string, timestamp: string): string {
    return `## ${title} — ${formatLocalTimestamp(timestamp)}\n\n${content}\n\n---\n\n`;
  }

  private async persistRetrospection(
    title: string,
    content: string,
    timestamp: string
  ): Promise<void> {
    const entry = this.formatEntry(title, content, timestamp);

    const adapter = this.app.vault.adapter;
    let existingContent = "";

    try {
      existingContent = await adapter.read(RETROSPECTION_FILE);
    } catch {
      // File doesn't exist yet -- that's fine
    }

    // Prepend new entry at the top
    const newContent = entry + existingContent;
    await adapter.write(RETROSPECTION_FILE, newContent);
  }
}
