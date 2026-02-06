import { describe, it, expect, vi, beforeEach } from "vitest";

import type { SmartHoleSettings } from "../../src/settings";
import type { GitService } from "../../src/git/GitService";
import type { GitCommitOptions } from "../../src/git/types";
import { MessageProcessor } from "../../src/processor/MessageProcessor";
import type { LLMResponse } from "../../src/llm/types";

// ---------------------------------------------------------------------------
// Mock LLMService -- must be defined before import so vi.mock can reference it
// ---------------------------------------------------------------------------

const mockLLMServiceInstance = {
  initialize: vi.fn(),
  processMessage: vi.fn(),
  registerTool: vi.fn(),
  setConversationContext: vi.fn(),
  getHistory: vi.fn().mockReturnValue([]),
  isWaitingForUserResponse: vi.fn().mockReturnValue(false),
  getConversationState: vi.fn().mockReturnValue({ isWaitingForResponse: false }),
  restoreConversationState: vi.fn(),
  abort: vi.fn(),
};

vi.mock("../../src/llm", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    // Must use function (not arrow) so `new LLMService(...)` works
    LLMService: vi.fn(function () {
      return mockLLMServiceInstance;
    }),
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSettings(overrides?: Partial<SmartHoleSettings>): SmartHoleSettings {
  return {
    enableSmartHoleConnection: true,
    anthropicApiKeyName: "test-key",
    model: "claude-haiku-4-5-20251001",
    clientName: "obsidian",
    routingDescription: "",
    informationArchitecture: "",
    maxConversationHistory: 50,
    conversationIdleTimeoutMinutes: 30,
    maxConversationsRetained: 1000,
    conversationStateTimeoutMinutes: 60,
    enableConversationRetrospection: false,
    retrospectionPrompt: "",
    enableGitVersionControl: true,
    autoCommitAfterProcessing: true,
    ...overrides,
  } as SmartHoleSettings;
}

function makeGitService(overrides?: Partial<GitService>): GitService {
  return {
    hasChanges: vi.fn().mockResolvedValue(true),
    getChangedFiles: vi.fn().mockResolvedValue(["notes/test.md", "notes/other.md"]),
    commitAll: vi.fn().mockResolvedValue("abc123"),
    initialize: vi.fn(),
    isInitialized: vi.fn().mockReturnValue(true),
    seedGitignore: vi.fn(),
    formatCommitMessage: vi.fn(),
    log: vi.fn(),
    searchCommits: vi.fn(),
    getCommitDetails: vi.fn(),
    getFileDiffs: vi.fn(),
    ...overrides,
  } as unknown as GitService;
}

function makeLLMResponse(text: string): LLMResponse {
  return {
    content: [{ type: "text", text }],
    stopReason: "end_turn",
  };
}

function makeProcessor(
  settings: SmartHoleSettings,
  gitService: GitService | null
): MessageProcessor {
  const plugin = {
    getGitService: vi.fn().mockReturnValue(gitService),
    loadData: vi.fn().mockResolvedValue({}),
    saveData: vi.fn().mockResolvedValue(undefined),
  };

  const connection = {
    sendAck: vi.fn(),
    sendNotification: vi.fn(),
  };

  const inboxManager = {
    save: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    listPending: vi.fn().mockResolvedValue([]),
  };

  const conversationManager = {
    getActiveConversation: vi.fn().mockReturnValue({ id: "conv-123" }),
    getContextPrompt: vi.fn().mockReturnValue(""),
    addMessage: vi.fn().mockResolvedValue(undefined),
    getConversation: vi.fn(),
    getRecentConversations: vi.fn().mockReturnValue([]),
  };

  return new MessageProcessor({
    connection: connection as any,
    inboxManager: inboxManager as any,
    app: { secretStorage: { getSecret: vi.fn().mockReturnValue("test-api-key") } } as any,
    settings,
    conversationManager: conversationManager as any,
    plugin: plugin as any,
  });
}

/**
 * Access the private autoCommit method for direct testing.
 * This is a common pattern in TypeScript tests for private method validation.
 */
function callAutoCommit(
  processor: MessageProcessor,
  messageText: string,
  toolsUsed: string[],
  conversationId: string
): Promise<void> {
  return (processor as any).autoCommit(messageText, toolsUsed, conversationId);
}

function callGenerateCommitMessage(
  processor: MessageProcessor,
  originalRequest: string,
  toolsUsed: string[],
  changedFiles: string[]
): Promise<{ type: "vault" | "organize" | "cleanup"; summary: string; body: string }> {
  return (processor as any).generateCommitMessage(originalRequest, toolsUsed, changedFiles);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
});

// =============================================================================
// autoCommit - Trigger Conditions
// =============================================================================

describe("autoCommit triggers correctly", () => {
  it("calls gitService.commitAll when git is enabled, auto-commit is on, and there are changes", async () => {
    const gitService = makeGitService();
    const processor = makeProcessor(makeSettings(), gitService);

    mockLLMServiceInstance.processMessage.mockResolvedValue(
      makeLLMResponse("vault\nUpdate notes\n\nUpdated test and other notes.")
    );

    await callAutoCommit(processor, "Update my notes", ["writeFile"], "conv-123");

    expect(gitService.hasChanges).toHaveBeenCalled();
    expect(gitService.getChangedFiles).toHaveBeenCalled();

    const commitCallArgs = vi.mocked(gitService.commitAll).mock.calls[0][0] as GitCommitOptions;
    expect(commitCallArgs.type).toBe("vault");
    expect(commitCallArgs.summary).toBe("Update notes");
    expect(commitCallArgs.body).toBe("Updated test and other notes.");
    expect(commitCallArgs.metadata).toEqual({
      conversationId: "conv-123",
      toolsUsed: ["writeFile"],
      filesAffected: ["notes/test.md", "notes/other.md"],
      source: "agent",
    });
    expect(commitCallArgs.authorName).toBe("obsidian");
  });
});

// =============================================================================
// autoCommit - Skip Conditions
// =============================================================================

describe("autoCommit skip conditions", () => {
  it("skips when git service is null (git disabled)", async () => {
    const processor = makeProcessor(makeSettings(), null);

    await callAutoCommit(processor, "Update notes", ["writeFile"], "conv-123");

    // No errors thrown, method returns silently
    expect(mockLLMServiceInstance.processMessage).not.toHaveBeenCalled();
  });

  it("skips when autoCommitAfterProcessing is false", async () => {
    const gitService = makeGitService();
    const processor = makeProcessor(makeSettings({ autoCommitAfterProcessing: false }), gitService);

    await callAutoCommit(processor, "Update notes", ["writeFile"], "conv-123");

    expect(gitService.hasChanges).not.toHaveBeenCalled();
    expect(gitService.commitAll).not.toHaveBeenCalled();
  });

  it("skips when there are no changes", async () => {
    const gitService = makeGitService({
      hasChanges: vi.fn().mockResolvedValue(false),
    } as any);
    const processor = makeProcessor(makeSettings(), gitService);

    await callAutoCommit(processor, "Update notes", ["writeFile"], "conv-123");

    expect(gitService.hasChanges).toHaveBeenCalled();
    expect(gitService.getChangedFiles).not.toHaveBeenCalled();
    expect(gitService.commitAll).not.toHaveBeenCalled();
  });
});

// =============================================================================
// autoCommit - Error Handling
// =============================================================================

describe("autoCommit error handling", () => {
  it("propagates errors (caller wraps in .catch())", async () => {
    const gitService = makeGitService({
      commitAll: vi.fn().mockRejectedValue(new Error("Git commit failed")),
    } as any);
    const processor = makeProcessor(makeSettings(), gitService);

    mockLLMServiceInstance.processMessage.mockResolvedValue(
      makeLLMResponse("vault\nUpdate notes\n\nBody text.")
    );

    await expect(
      callAutoCommit(processor, "Update notes", ["writeFile"], "conv-123")
    ).rejects.toThrow("Git commit failed");
  });

  it("propagates LLM errors from commit message generation", async () => {
    const gitService = makeGitService();
    const processor = makeProcessor(makeSettings(), gitService);

    mockLLMServiceInstance.processMessage.mockRejectedValue(new Error("LLM unavailable"));

    await expect(
      callAutoCommit(processor, "Update notes", ["writeFile"], "conv-123")
    ).rejects.toThrow("LLM unavailable");
  });
});

// =============================================================================
// generateCommitMessage - Message Formatting
// =============================================================================

describe("generateCommitMessage", () => {
  it("parses vault type and plain summary from well-formed LLM response", async () => {
    const processor = makeProcessor(makeSettings(), makeGitService());

    mockLLMServiceInstance.processMessage.mockResolvedValue(
      makeLLMResponse("vault\nCreate meeting notes\n\nCreated new meeting notes file.")
    );

    const result = await callGenerateCommitMessage(
      processor,
      "Create meeting notes",
      ["writeFile"],
      ["notes/meeting.md"]
    );

    expect(result.type).toBe("vault");
    expect(result.summary).toBe("Create meeting notes");
    expect(result.body).toBe("Created new meeting notes file.");
  });

  it("parses organize type from LLM response", async () => {
    const processor = makeProcessor(makeSettings(), makeGitService());

    mockLLMServiceInstance.processMessage.mockResolvedValue(
      makeLLMResponse("organize\nMove files to archive\n\nMoved old notes to archive folder.")
    );

    const result = await callGenerateCommitMessage(
      processor,
      "Archive old notes",
      ["moveFile"],
      ["archive/old-note.md"]
    );

    expect(result.type).toBe("organize");
    expect(result.summary).toBe("Move files to archive");
    expect(result.body).toBe("Moved old notes to archive folder.");
  });

  it("parses cleanup type from LLM response", async () => {
    const processor = makeProcessor(makeSettings(), makeGitService());

    mockLLMServiceInstance.processMessage.mockResolvedValue(
      makeLLMResponse("cleanup\nRemove duplicates\n\nDeleted duplicate note files.")
    );

    const result = await callGenerateCommitMessage(
      processor,
      "Clean up duplicates",
      ["deleteFile"],
      ["notes/duplicate.md"]
    );

    expect(result.type).toBe("cleanup");
    expect(result.summary).toBe("Remove duplicates");
  });

  it("handles inline type(scope): summary fallback and strips prefix", async () => {
    const processor = makeProcessor(makeSettings(), makeGitService());

    // LLM ignores instructions and produces type(scope): summary on one line
    mockLLMServiceInstance.processMessage.mockResolvedValue(
      makeLLMResponse("vault(vault): Create meeting notes\n\nCreated notes file.")
    );

    const result = await callGenerateCommitMessage(
      processor,
      "Create meeting notes",
      ["writeFile"],
      ["notes/meeting.md"]
    );

    expect(result.type).toBe("vault");
    expect(result.summary).toBe("Create meeting notes");
    expect(result.body).toBe("Created notes file.");
  });

  it("handles inline type: summary fallback without scope", async () => {
    const processor = makeProcessor(makeSettings(), makeGitService());

    mockLLMServiceInstance.processMessage.mockResolvedValue(
      makeLLMResponse("organize: Move files to archive\n\nMoved old notes.")
    );

    const result = await callGenerateCommitMessage(
      processor,
      "Archive old notes",
      ["moveFile"],
      ["archive/old-note.md"]
    );

    expect(result.type).toBe("organize");
    expect(result.summary).toBe("Move files to archive");
  });

  it("defaults to vault type when LLM returns unrecognized type", async () => {
    const processor = makeProcessor(makeSettings(), makeGitService());

    mockLLMServiceInstance.processMessage.mockResolvedValue(
      makeLLMResponse("fix(vault): Correct typos\n\nFixed several typos.")
    );

    const result = await callGenerateCommitMessage(
      processor,
      "Fix typos",
      ["editFile"],
      ["notes/test.md"]
    );

    expect(result.type).toBe("vault");
    expect(result.summary).toBe("fix(vault): Correct typos");
    expect(result.body).toBe("Fixed several typos.");
  });

  it("defaults to vault type and fallback summary when LLM returns empty response", async () => {
    const processor = makeProcessor(makeSettings(), makeGitService());

    mockLLMServiceInstance.processMessage.mockResolvedValue(makeLLMResponse(""));

    const result = await callGenerateCommitMessage(
      processor,
      "Do something",
      ["writeFile"],
      ["notes/test.md"]
    );

    expect(result.type).toBe("vault");
    expect(result.summary).toBe("update files");
    expect(result.body).toBe("");
  });

  it("handles type-only first line with no summary line", async () => {
    const processor = makeProcessor(makeSettings(), makeGitService());

    mockLLMServiceInstance.processMessage.mockResolvedValue(makeLLMResponse("vault"));

    const result = await callGenerateCommitMessage(
      processor,
      "Update notes",
      ["editFile"],
      ["notes/test.md"]
    );

    expect(result.type).toBe("vault");
    expect(result.summary).toBe("update files");
    expect(result.body).toBe("");
  });
});

// =============================================================================
// generateCommitMessage - Haiku Model Enforcement
// =============================================================================

describe("generateCommitMessage forces Haiku model", () => {
  it("creates LLMService with Haiku model regardless of user setting", async () => {
    const { LLMService: MockLLMService } = await import("../../src/llm");

    const processor = makeProcessor(
      makeSettings({ model: "claude-opus-4-5-20251101" as any }),
      makeGitService()
    );

    mockLLMServiceInstance.processMessage.mockResolvedValue(makeLLMResponse("vault\nUpdate notes"));

    await callGenerateCommitMessage(processor, "Update", ["writeFile"], ["test.md"]);

    // Verify the LLMService constructor was called with Haiku model
    const constructorCalls = vi.mocked(MockLLMService).mock.calls;
    const lastCall = constructorCalls[constructorCalls.length - 1];
    expect(lastCall[1].model).toBe("claude-haiku-4-5-20251001");
  });
});

// =============================================================================
// autoCommit - Metadata Structure
// =============================================================================

describe("autoCommit metadata", () => {
  it("passes correct metadata, summary, and body to commitAll", async () => {
    const gitService = makeGitService({
      getChangedFiles: vi.fn().mockResolvedValue(["file1.md", "file2.md", "folder/file3.md"]),
    } as any);
    const processor = makeProcessor(makeSettings({ clientName: "my-agent" }), gitService);

    mockLLMServiceInstance.processMessage.mockResolvedValue(
      makeLLMResponse("vault\nMulti-file update\n\nUpdated three files.")
    );

    await callAutoCommit(processor, "Update several files", ["writeFile", "editFile"], "conv-456");

    const commitCallArgs = vi.mocked(gitService.commitAll).mock.calls[0][0] as GitCommitOptions;

    expect(commitCallArgs.type).toBe("vault");
    expect(commitCallArgs.summary).toBe("Multi-file update");
    expect(commitCallArgs.body).toBe("Updated three files.");
    expect(commitCallArgs.metadata).toEqual({
      conversationId: "conv-456",
      toolsUsed: ["writeFile", "editFile"],
      filesAffected: ["file1.md", "file2.md", "folder/file3.md"],
      source: "agent",
    });
    expect(commitCallArgs.authorName).toBe("my-agent");
  });
});
