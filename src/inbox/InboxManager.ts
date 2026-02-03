/**
 * InboxManager - Message durability layer for SmartHole messages.
 *
 * Persists incoming messages to disk before processing to ensure
 * no messages are lost if processing fails or the plugin crashes.
 * Messages are stored as markdown files with YAML frontmatter.
 */

import type { TFile, Vault } from "obsidian";
import type { RoutedMessage } from "../websocket/types";
import type { InboxMessage } from "./types";

/** Path to the inbox folder within the vault */
const INBOX_PATH = ".smarthole/inbox";

/**
 * InboxManager handles message durability by persisting incoming SmartHole
 * messages to disk before processing.
 *
 * Usage:
 * ```typescript
 * const inbox = new InboxManager(vault);
 * const filePath = await inbox.save(routedMessage);
 * // ... process message ...
 * await inbox.delete(routedMessage.payload.id);
 * ```
 */
export class InboxManager {
  constructor(private vault: Vault) {}

  /**
   * Save a message to the inbox folder.
   * Creates the inbox folder if it doesn't exist.
   *
   * @param message - The routed message to save
   * @returns The file path where the message was saved
   */
  async save(message: RoutedMessage): Promise<string> {
    await this.ensureInboxFolder();

    const { id, text, timestamp, metadata } = message.payload;
    const receivedAt = new Date().toISOString();
    const filename = this.generateFilename(timestamp, id);
    const filePath = `${INBOX_PATH}/${filename}`;

    const content = this.formatMessageContent(id, timestamp, receivedAt, metadata, text);

    await this.vault.create(filePath, content);

    return filePath;
  }

  /**
   * Delete a message from the inbox after successful processing.
   * Silently succeeds if the message doesn't exist.
   *
   * @param messageId - The ID of the message to delete
   */
  async delete(messageId: string): Promise<void> {
    const file = await this.findFileByMessageId(messageId);
    if (file) {
      await this.vault.delete(file);
    }
  }

  /**
   * List all pending (unprocessed) messages in the inbox.
   * Returns messages sorted by timestamp (oldest first).
   *
   * @returns Array of inbox messages sorted by timestamp
   */
  async listPending(): Promise<InboxMessage[]> {
    const files = this.getInboxFiles();
    const messages: InboxMessage[] = [];

    for (const file of files) {
      const message = await this.parseInboxFile(file);
      if (message) {
        messages.push(message);
      }
    }

    // Sort by timestamp (oldest first)
    messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return messages;
  }

  /**
   * Get a specific message by ID.
   * Returns null if the message doesn't exist.
   *
   * @param messageId - The ID of the message to retrieve
   * @returns The inbox message or null if not found
   */
  async get(messageId: string): Promise<InboxMessage | null> {
    const file = await this.findFileByMessageId(messageId);
    if (!file) {
      return null;
    }
    return this.parseInboxFile(file);
  }

  /**
   * Ensures the inbox folder exists, creating it if necessary.
   * Handles race conditions where getFolderByPath returns null but folder exists.
   */
  private async ensureInboxFolder(): Promise<void> {
    // First ensure .smarthole folder exists
    const smartholePath = ".smarthole";
    const smartholeFolder = this.vault.getFolderByPath(smartholePath);
    if (!smartholeFolder) {
      try {
        await this.vault.createFolder(smartholePath);
      } catch (error) {
        // Ignore "Folder already exists" - this can happen if getFolderByPath
        // returns null before the vault has indexed the folder
        if (!(error instanceof Error && error.message.includes("Folder already exists"))) {
          throw error;
        }
      }
    }

    // Then ensure inbox subfolder exists
    const inboxFolder = this.vault.getFolderByPath(INBOX_PATH);
    if (!inboxFolder) {
      try {
        await this.vault.createFolder(INBOX_PATH);
      } catch (error) {
        if (!(error instanceof Error && error.message.includes("Folder already exists"))) {
          throw error;
        }
      }
    }
  }

  /**
   * Generates a filename for an inbox message.
   * Format: {timestamp}-{messageId}.md with colons replaced in timestamp.
   *
   * @param timestamp - ISO timestamp from the message
   * @param messageId - Unique message ID
   * @returns Filename string
   */
  private generateFilename(timestamp: string, messageId: string): string {
    // Replace colons in timestamp to make it filesystem-safe
    const safeTimestamp = timestamp.replace(/:/g, "-");
    return `${safeTimestamp}-${messageId}.md`;
  }

  /**
   * Formats message content with YAML frontmatter.
   *
   * @param id - Message ID
   * @param timestamp - Original message timestamp
   * @param receivedAt - Timestamp when saved to inbox
   * @param metadata - Message metadata
   * @param text - Message text
   * @returns Formatted file content
   */
  private formatMessageContent(
    id: string,
    timestamp: string,
    receivedAt: string,
    metadata: unknown,
    text: string
  ): string {
    const metadataJson = JSON.stringify(metadata);
    return `---
id: ${id}
timestamp: ${timestamp}
receivedAt: ${receivedAt}
metadata: ${metadataJson}
---

${text}
`;
  }

  /**
   * Gets all files in the inbox folder.
   *
   * @returns Array of TFile objects in the inbox folder
   */
  private getInboxFiles(): TFile[] {
    const allFiles = this.vault.getFiles();
    return allFiles.filter(
      (file) => file.path.startsWith(`${INBOX_PATH}/`) && file.extension === "md"
    );
  }

  /**
   * Finds an inbox file by message ID.
   * Searches filenames for the message ID suffix.
   *
   * @param messageId - The message ID to search for
   * @returns The TFile if found, null otherwise
   */
  private async findFileByMessageId(messageId: string): Promise<TFile | null> {
    const files = this.getInboxFiles();
    const targetSuffix = `-${messageId}.md`;

    for (const file of files) {
      if (file.name.endsWith(targetSuffix)) {
        return file;
      }
    }

    return null;
  }

  /**
   * Parses an inbox file into an InboxMessage.
   *
   * @param file - The file to parse
   * @returns Parsed InboxMessage or null if parsing fails
   */
  private async parseInboxFile(file: TFile): Promise<InboxMessage | null> {
    try {
      const content = await this.vault.read(file);
      return this.parseMessageContent(content, file.path);
    } catch {
      // Return null if we can't read or parse the file
      return null;
    }
  }

  /**
   * Parses message content from frontmatter format.
   *
   * @param content - Raw file content
   * @param filePath - File path for the InboxMessage
   * @returns Parsed InboxMessage or null if parsing fails
   */
  private parseMessageContent(content: string, filePath: string): InboxMessage | null {
    // Match YAML frontmatter between --- delimiters
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!frontmatterMatch) {
      return null;
    }

    const frontmatter = frontmatterMatch[1];
    const body = frontmatterMatch[2].trim();

    // Parse frontmatter fields using regex
    const idMatch = frontmatter.match(/^id:\s*(.+)$/m);
    const timestampMatch = frontmatter.match(/^timestamp:\s*(.+)$/m);
    const receivedAtMatch = frontmatter.match(/^receivedAt:\s*(.+)$/m);
    const metadataMatch = frontmatter.match(/^metadata:\s*(.+)$/m);

    if (!idMatch || !timestampMatch || !receivedAtMatch || !metadataMatch) {
      return null;
    }

    let metadata;
    try {
      metadata = JSON.parse(metadataMatch[1]);
    } catch {
      return null;
    }

    return {
      id: idMatch[1],
      timestamp: timestampMatch[1],
      receivedAt: receivedAtMatch[1],
      metadata,
      text: body,
      filePath,
    };
  }
}
