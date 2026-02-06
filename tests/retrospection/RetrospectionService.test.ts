import { describe, it, expect } from "vitest";

import type { Conversation } from "../../src/context/types";
import type { SmartHoleSettings } from "../../src/settings";
import { RetrospectionService } from "../../src/retrospection/RetrospectionService";

/**
 * Minimal mock objects -- only the fields RetrospectionService actually reads.
 */
function makeSettings(overrides?: Partial<SmartHoleSettings>): SmartHoleSettings {
  return {
    retrospectionPrompt: "Reflect on this conversation.",
    ...overrides,
  } as SmartHoleSettings;
}

function makeConversation(overrides?: Partial<Conversation>): Conversation {
  return {
    id: "conv-1",
    startedAt: "2026-02-05T10:00:00.000Z",
    endedAt: "2026-02-05T10:30:00.000Z",
    title: "Test Conversation",
    summary: null,
    messages: [
      {
        id: "msg-1",
        timestamp: "2026-02-05T10:00:00.000Z",
        role: "user",
        content: "Create a note about cats",
      },
      {
        id: "msg-2",
        timestamp: "2026-02-05T10:01:00.000Z",
        role: "assistant",
        content: "I created a note about cats in the Notes folder.",
        toolsUsed: ["writeFile", "sendMessage"],
      },
    ],
    ...overrides,
  };
}

// RetrospectionService needs an App in its constructor but buildPrompt/formatEntry
// don't use it, so a null placeholder is safe for these unit tests.
function makeService(settings?: SmartHoleSettings): RetrospectionService {
  return new RetrospectionService(null as never, settings ?? makeSettings());
}

// =============================================================================
// buildPrompt
// =============================================================================

describe("RetrospectionService.buildPrompt", () => {
  it("includes the conversation title in the prompt", () => {
    const service = makeService();
    const prompt = service.buildPrompt(makeConversation());

    expect(prompt).toContain('"Test Conversation"');
  });

  it("includes each message with role labels", () => {
    const service = makeService();
    const prompt = service.buildPrompt(makeConversation());

    expect(prompt).toContain("User: Create a note about cats");
    expect(prompt).toContain("Assistant: I created a note about cats in the Notes folder.");
  });

  it("includes tool names for assistant messages that used tools", () => {
    const service = makeService();
    const prompt = service.buildPrompt(makeConversation());

    expect(prompt).toContain("(tools: writeFile, sendMessage)");
  });

  it("omits tool annotation for messages without tools", () => {
    const service = makeService();
    const prompt = service.buildPrompt(makeConversation());

    // The user message line should NOT have a "(tools: ...)" suffix
    const userLine = prompt.split("\n").find((line) => line.includes("User: Create a note"));
    expect(userLine).toBeDefined();
    expect(userLine).not.toContain("(tools:");
  });

  it("appends the retrospection prompt from settings at the end", () => {
    const settings = makeSettings({ retrospectionPrompt: "Custom retro prompt." });
    const service = makeService(settings);
    const prompt = service.buildPrompt(makeConversation());

    expect(prompt).toContain("Custom retro prompt.");
    // Retrospection prompt should be at the very end
    expect(prompt.trimEnd().endsWith("Custom retro prompt.")).toBe(true);
  });

  it("includes formatted timestamps for each message", () => {
    const service = makeService();
    const prompt = service.buildPrompt(makeConversation());

    // formatLocalTimestamp produces locale-dependent output, but should contain the year
    expect(prompt).toContain("2026");
  });

  it('uses "Untitled" when conversation title is null', () => {
    const service = makeService();
    const conversation = makeConversation({ title: null });
    const prompt = service.buildPrompt(conversation);

    expect(prompt).toContain('"Untitled"');
  });

  it("handles an empty messages array", () => {
    const service = makeService();
    const conversation = makeConversation({ messages: [] });
    const prompt = service.buildPrompt(conversation);

    // Should still have the structure with title and retrospection prompt
    expect(prompt).toContain('"Test Conversation"');
    expect(prompt).toContain("Reflect on this conversation.");
    // The messages section should be empty (just whitespace between separators)
    expect(prompt).toContain('titled "Test Conversation":\n\n\n\n---');
  });
});

// =============================================================================
// formatEntry
// =============================================================================

describe("RetrospectionService.formatEntry", () => {
  it("produces a Markdown section with title, formatted timestamp, content, and separator", () => {
    const service = makeService();
    const entry = service.formatEntry(
      "My Conversation",
      "Some retrospection insights here.",
      "2026-02-05T15:30:00.000Z"
    );

    // Should start with ## heading containing title and formatted timestamp
    expect(entry).toMatch(/^## My Conversation — .+2026/);
    // Should contain the content
    expect(entry).toContain("Some retrospection insights here.");
    // Should end with the horizontal rule separator and trailing newlines
    expect(entry).toContain("\n\n---\n\n");
  });

  it("formats the timestamp using formatLocalTimestamp (not raw ISO)", () => {
    const service = makeService();
    const entry = service.formatEntry("My chat", "Content", "2026-02-05T15:30:00.000Z");

    // Extract the timestamp portion after the em dash
    const heading = entry.split("\n")[0];
    const timestampPart = heading.split(" — ")[1] ?? "";
    // Formatted timestamp should not contain ISO markers "T" or "Z"
    expect(timestampPart).not.toContain("T");
    expect(timestampPart).not.toContain("Z");
    // But should contain the year
    expect(timestampPart).toContain("2026");
  });

  it("preserves multiline content", () => {
    const service = makeService();
    const multilineContent = "Line 1\n\nLine 2\n\nLine 3";
    const entry = service.formatEntry("Title", multilineContent, "2026-02-05T15:30:00.000Z");

    expect(entry).toContain("Line 1\n\nLine 2\n\nLine 3");
  });
});
