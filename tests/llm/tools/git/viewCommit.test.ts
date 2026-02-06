import { describe, it, expect, vi, beforeEach } from "vitest";

import type { GitService } from "../../../../src/git";
import type { GitCommitInfo } from "../../../../src/git";
import { createViewCommitTool } from "../../../../src/llm/tools/git/viewCommit";

function makeCommitInfo(overrides?: Partial<GitCommitInfo>): GitCommitInfo {
  return {
    hash: "abc1234567890123456789012345678901234567",
    abbreviatedHash: "abc1234",
    message: "vault(vault): Update meeting notes\n\nDetailed body description",
    date: new Date("2026-02-05T12:00:00Z"),
    author: { name: "SmartHole Agent", email: "smarthole@local" },
    filesChanged: [
      { filepath: "notes/meeting.md", type: "modify" },
      { filepath: "notes/new-note.md", type: "add" },
      { filepath: "notes/old-note.md", type: "delete" },
    ],
    ...overrides,
  };
}

function makeMockGitService(): GitService {
  return {
    searchCommits: vi.fn(),
    log: vi.fn(),
    getCommitDetails: vi.fn().mockResolvedValue(makeCommitInfo()),
    getFileDiffs: vi.fn(),
  } as unknown as GitService;
}

let gitService: GitService;

beforeEach(() => {
  vi.clearAllMocks();
  gitService = makeMockGitService();
});

describe("view_commit tool", () => {
  it("has the correct tool definition", () => {
    const tool = createViewCommitTool(gitService);

    expect(tool.definition.name).toBe("view_commit");
    expect(tool.definition.inputSchema.required).toEqual(["commit_hash"]);
  });

  it("returns error when commit_hash is missing", async () => {
    const tool = createViewCommitTool(gitService);

    const result = await tool.execute({});

    expect(result).toContain("Error");
    expect(result).toContain("commit_hash");
    expect(gitService.getCommitDetails).not.toHaveBeenCalled();
  });

  it("returns error when commit_hash is empty string", async () => {
    const tool = createViewCommitTool(gitService);

    const result = await tool.execute({ commit_hash: "   " });

    expect(result).toContain("Error");
    expect(result).toContain("commit_hash");
  });

  it("calls getCommitDetails with the trimmed hash", async () => {
    const tool = createViewCommitTool(gitService);

    await tool.execute({ commit_hash: "  abc1234  " });

    expect(gitService.getCommitDetails).toHaveBeenCalledWith("abc1234");
  });

  it("formats output with full hash, author, date, and message", async () => {
    const commit = makeCommitInfo();
    vi.mocked(gitService.getCommitDetails).mockResolvedValue(commit);
    const tool = createViewCommitTool(gitService);

    const result = await tool.execute({ commit_hash: "abc1234567890123456789012345678901234567" });

    expect(result).toContain("## Commit abc1234567890123456789012345678901234567");
    expect(result).toContain("Author: SmartHole Agent <smarthole@local>");
    expect(result).toContain("Date: 2026-02-05T12:00:00.000Z");
    expect(result).toContain("vault(vault): Update meeting notes");
    expect(result).toContain("Detailed body description");
  });

  it("formats files changed with types", async () => {
    const commit = makeCommitInfo();
    vi.mocked(gitService.getCommitDetails).mockResolvedValue(commit);
    const tool = createViewCommitTool(gitService);

    const result = await tool.execute({ commit_hash: "abc1234" });

    expect(result).toContain("### Files Changed (3)");
    expect(result).toContain("MODIFY notes/meeting.md");
    expect(result).toContain("ADD notes/new-note.md");
    expect(result).toContain("DELETE notes/old-note.md");
  });

  it("handles commit with no files changed", async () => {
    const commit = makeCommitInfo({ filesChanged: [] });
    vi.mocked(gitService.getCommitDetails).mockResolvedValue(commit);
    const tool = createViewCommitTool(gitService);

    const result = await tool.execute({ commit_hash: "abc1234" });

    expect(result).not.toContain("### Files Changed");
  });

  it("handles commit where filesChanged is undefined", async () => {
    const commit = makeCommitInfo({ filesChanged: undefined });
    vi.mocked(gitService.getCommitDetails).mockResolvedValue(commit);
    const tool = createViewCommitTool(gitService);

    const result = await tool.execute({ commit_hash: "abc1234" });

    expect(result).not.toContain("### Files Changed");
  });

  it("handles gitService errors gracefully", async () => {
    vi.mocked(gitService.getCommitDetails).mockRejectedValue(new Error("Commit not found"));
    const tool = createViewCommitTool(gitService);

    const result = await tool.execute({ commit_hash: "nonexistent" });

    expect(result).toContain("Error viewing commit");
    expect(result).toContain("Commit not found");
  });
});
