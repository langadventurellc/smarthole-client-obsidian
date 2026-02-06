import { describe, it, expect, vi, beforeEach } from "vitest";

import type { GitService } from "../../../../src/git";
import type { GitCommitInfo, GitDiffEntry } from "../../../../src/git";
import { createViewFileHistoryTool } from "../../../../src/llm/tools/git/viewFileHistory";

function makeCommitInfo(overrides?: Partial<GitCommitInfo>): GitCommitInfo {
  return {
    hash: "abc1234567890123456789012345678901234567",
    abbreviatedHash: "abc1234",
    message: "vault(vault): Update meeting notes",
    date: new Date("2026-02-05T12:00:00Z"),
    author: { name: "SmartHole Agent", email: "smarthole@local" },
    ...overrides,
  };
}

function makeMockGitService(): GitService {
  return {
    searchCommits: vi.fn(),
    log: vi.fn().mockResolvedValue([]),
    getCommitDetails: vi.fn(),
    getFileDiffs: vi.fn().mockResolvedValue([]),
  } as unknown as GitService;
}

let gitService: GitService;

beforeEach(() => {
  vi.clearAllMocks();
  gitService = makeMockGitService();
});

describe("view_file_history tool", () => {
  it("has the correct tool definition", () => {
    const tool = createViewFileHistoryTool(gitService);

    expect(tool.definition.name).toBe("view_file_history");
    expect(tool.definition.inputSchema.required).toEqual(["file_path"]);
  });

  it("returns error when file_path is missing", async () => {
    const tool = createViewFileHistoryTool(gitService);

    const result = await tool.execute({});

    expect(result).toContain("Error");
    expect(result).toContain("file_path");
    expect(gitService.log).not.toHaveBeenCalled();
  });

  it("returns error when file_path is empty string", async () => {
    const tool = createViewFileHistoryTool(gitService);

    const result = await tool.execute({ file_path: "  " });

    expect(result).toContain("Error");
    expect(result).toContain("file_path");
  });

  it("calls gitService.log with filepath and default limit", async () => {
    vi.mocked(gitService.log).mockResolvedValue([makeCommitInfo()]);
    const tool = createViewFileHistoryTool(gitService);

    await tool.execute({ file_path: "notes/test.md" });

    expect(gitService.log).toHaveBeenCalledWith({
      maxCount: 5,
      filepath: "notes/test.md",
    });
  });

  it("calls gitService.log with custom max_results", async () => {
    vi.mocked(gitService.log).mockResolvedValue([]);
    const tool = createViewFileHistoryTool(gitService);

    await tool.execute({ file_path: "notes/test.md", max_results: 15 });

    expect(gitService.log).toHaveBeenCalledWith({
      maxCount: 15,
      filepath: "notes/test.md",
    });
  });

  it("returns 'no commits found' for empty results", async () => {
    vi.mocked(gitService.log).mockResolvedValue([]);
    const tool = createViewFileHistoryTool(gitService);

    const result = await tool.execute({ file_path: "notes/missing.md" });

    expect(result).toContain("No commits found");
    expect(result).toContain("notes/missing.md");
  });

  it("formats results with commit hashes and dates", async () => {
    const commits = [
      makeCommitInfo({
        abbreviatedHash: "abc1234",
        date: new Date("2026-02-05T12:00:00Z"),
        message: "vault(vault): Update meeting notes",
      }),
      makeCommitInfo({
        abbreviatedHash: "def5678",
        date: new Date("2026-02-04T10:00:00Z"),
        message: "vault(vault): Initial creation",
      }),
    ];
    vi.mocked(gitService.log).mockResolvedValue(commits);
    const tool = createViewFileHistoryTool(gitService);

    const result = await tool.execute({ file_path: "notes/test.md" });

    expect(result).toContain('History for "notes/test.md"');
    expect(result).toContain("[abc1234] 2026-02-05");
    expect(result).toContain("[def5678] 2026-02-04");
    expect(result).toContain("vault(vault): Update meeting notes");
  });

  it("does not call getFileDiffs when include_diff is false", async () => {
    vi.mocked(gitService.log).mockResolvedValue([makeCommitInfo()]);
    const tool = createViewFileHistoryTool(gitService);

    await tool.execute({ file_path: "notes/test.md", include_diff: false });

    expect(gitService.getFileDiffs).not.toHaveBeenCalled();
  });

  it("calls getFileDiffs for each commit when include_diff is true", async () => {
    const commits = [makeCommitInfo({ hash: "hash-1" }), makeCommitInfo({ hash: "hash-2" })];
    const diffs: GitDiffEntry[] = [
      { filepath: "notes/test.md", type: "modify" },
      { filepath: "notes/other.md", type: "add" },
    ];
    vi.mocked(gitService.log).mockResolvedValue(commits);
    vi.mocked(gitService.getFileDiffs).mockResolvedValue(diffs);
    const tool = createViewFileHistoryTool(gitService);

    const result = await tool.execute({ file_path: "notes/test.md", include_diff: true });

    expect(gitService.getFileDiffs).toHaveBeenCalledTimes(2);
    expect(gitService.getFileDiffs).toHaveBeenCalledWith("hash-1");
    expect(gitService.getFileDiffs).toHaveBeenCalledWith("hash-2");
    // Only the matching file's diff should appear
    expect(result).toContain("MODIFY notes/test.md");
    expect(result).not.toContain("notes/other.md");
  });

  it("handles gitService errors gracefully", async () => {
    vi.mocked(gitService.log).mockRejectedValue(new Error("Git error"));
    const tool = createViewFileHistoryTool(gitService);

    const result = await tool.execute({ file_path: "notes/test.md" });

    expect(result).toContain("Error viewing file history");
    expect(result).toContain("Git error");
  });
});
