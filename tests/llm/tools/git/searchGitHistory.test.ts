import { describe, it, expect, vi, beforeEach } from "vitest";

import type { GitService } from "../../../../src/git";
import type { GitCommitInfo } from "../../../../src/git";
import { createSearchGitHistoryTool } from "../../../../src/llm/tools/git/searchGitHistory";

function makeCommitInfo(overrides?: Partial<GitCommitInfo>): GitCommitInfo {
  return {
    hash: "abc1234567890123456789012345678901234567",
    abbreviatedHash: "abc1234",
    message: "vault(vault): Update meeting notes\n\nBody text here",
    date: new Date("2026-02-05T12:00:00Z"),
    author: { name: "SmartHole Agent", email: "smarthole@local" },
    ...overrides,
  };
}

function makeMockGitService(): GitService {
  return {
    searchCommits: vi.fn().mockResolvedValue([]),
    log: vi.fn().mockResolvedValue([]),
    getCommitDetails: vi.fn(),
    getFileDiffs: vi.fn(),
  } as unknown as GitService;
}

let gitService: GitService;

beforeEach(() => {
  vi.clearAllMocks();
  gitService = makeMockGitService();
});

describe("search_git_history tool", () => {
  it("has the correct tool definition", () => {
    const tool = createSearchGitHistoryTool(gitService);

    expect(tool.definition.name).toBe("search_git_history");
    expect(tool.definition.inputSchema.required).toEqual([]);
  });

  it("returns error when neither query nor file_path is provided", async () => {
    const tool = createSearchGitHistoryTool(gitService);

    const result = await tool.execute({});

    expect(result).toContain("Error");
    expect(result).toContain("query");
    expect(result).toContain("file_path");
    expect(gitService.searchCommits).not.toHaveBeenCalled();
  });

  it("returns error for invalid since date", async () => {
    const tool = createSearchGitHistoryTool(gitService);

    const result = await tool.execute({ query: "test", since: "not-a-date" });

    expect(result).toContain("Error");
    expect(result).toContain("since");
  });

  it("returns error for invalid until date", async () => {
    const tool = createSearchGitHistoryTool(gitService);

    const result = await tool.execute({ query: "test", until: "not-a-date" });

    expect(result).toContain("Error");
    expect(result).toContain("until");
  });

  it("calls searchCommits with query and default maxResults", async () => {
    vi.mocked(gitService.searchCommits).mockResolvedValue([makeCommitInfo()]);
    const tool = createSearchGitHistoryTool(gitService);

    await tool.execute({ query: "meeting" });

    expect(gitService.searchCommits).toHaveBeenCalledWith(
      expect.objectContaining({
        query: "meeting",
        maxResults: 10,
      })
    );
  });

  it("calls searchCommits with file_path", async () => {
    vi.mocked(gitService.searchCommits).mockResolvedValue([makeCommitInfo()]);
    const tool = createSearchGitHistoryTool(gitService);

    await tool.execute({ file_path: "notes/daily.md" });

    expect(gitService.searchCommits).toHaveBeenCalledWith(
      expect.objectContaining({
        filepath: "notes/daily.md",
      })
    );
  });

  it("passes parsed since and until dates", async () => {
    vi.mocked(gitService.searchCommits).mockResolvedValue([]);
    const tool = createSearchGitHistoryTool(gitService);

    await tool.execute({
      query: "test",
      since: "2026-01-01T00:00:00Z",
      until: "2026-02-01T00:00:00Z",
    });

    const callArgs = vi.mocked(gitService.searchCommits).mock.calls[0][0];
    expect(callArgs.since).toEqual(new Date("2026-01-01T00:00:00Z"));
    expect(callArgs.until).toEqual(new Date("2026-02-01T00:00:00Z"));
  });

  it("passes custom maxResults", async () => {
    vi.mocked(gitService.searchCommits).mockResolvedValue([]);
    const tool = createSearchGitHistoryTool(gitService);

    await tool.execute({ query: "test", max_results: 25 });

    expect(gitService.searchCommits).toHaveBeenCalledWith(
      expect.objectContaining({ maxResults: 25 })
    );
  });

  it("returns 'no commits found' for empty results", async () => {
    vi.mocked(gitService.searchCommits).mockResolvedValue([]);
    const tool = createSearchGitHistoryTool(gitService);

    const result = await tool.execute({ query: "nonexistent" });

    expect(result).toContain("No commits found");
  });

  it("formats results with abbreviated hash and first line of message", async () => {
    const commits = [
      makeCommitInfo({
        abbreviatedHash: "abc1234",
        date: new Date("2026-02-05T12:00:00Z"),
        message: "vault(vault): Update meeting notes\n\nDetailed body",
      }),
      makeCommitInfo({
        abbreviatedHash: "def5678",
        date: new Date("2026-02-04T10:00:00Z"),
        message: "organize(vault): Move files to archive",
      }),
    ];
    vi.mocked(gitService.searchCommits).mockResolvedValue(commits);
    const tool = createSearchGitHistoryTool(gitService);

    const result = await tool.execute({ query: "vault" });

    expect(result).toContain("Found 2 matching commit(s)");
    expect(result).toContain("[abc1234] 2026-02-05 -- vault(vault): Update meeting notes");
    expect(result).toContain("[def5678] 2026-02-04 -- organize(vault): Move files to archive");
    // Body text should NOT appear in the listing
    expect(result).not.toContain("Detailed body");
  });

  it("handles gitService errors gracefully", async () => {
    vi.mocked(gitService.searchCommits).mockRejectedValue(new Error("Git error"));
    const tool = createSearchGitHistoryTool(gitService);

    const result = await tool.execute({ query: "test" });

    expect(result).toContain("Error searching git history");
    expect(result).toContain("Git error");
  });
});
