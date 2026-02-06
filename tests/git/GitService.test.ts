import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReadCommitResult, StatusRow } from "isomorphic-git";

// Mock isomorphic-git before importing GitService
vi.mock("isomorphic-git", () => {
  const mockGit = {
    init: vi.fn(),
    add: vi.fn(),
    remove: vi.fn(),
    commit: vi.fn(),
    log: vi.fn(),
    readCommit: vi.fn(),
    statusMatrix: vi.fn(),
    TREE: vi.fn((opts?: { ref?: string }) => ({ ref: opts?.ref ?? "HEAD" })),
    walk: vi.fn(),
    default: undefined as unknown,
  };
  // The default export is the namespace itself
  mockGit.default = mockGit;
  return mockGit;
});

vi.mock("fs", () => ({
  existsSync: vi.fn(),
  writeFileSync: vi.fn(),
  default: {
    existsSync: vi.fn(),
    writeFileSync: vi.fn(),
    // Include the fs methods isomorphic-git expects (callback-style)
    readFile: vi.fn(),
    writeFile: vi.fn(),
    unlink: vi.fn(),
    readdir: vi.fn(),
    mkdir: vi.fn(),
    rmdir: vi.fn(),
    stat: vi.fn(),
    lstat: vi.fn(),
  },
}));

import git, { walk } from "isomorphic-git";
import * as fs from "fs";

import { GitService } from "../../src/git/GitService";
import type { GitCommitOptions } from "../../src/git/types";

const TEST_DIR = "/test/vault";

function makeService(): GitService {
  return new GitService(TEST_DIR);
}

function makeCommitOptions(overrides?: Partial<GitCommitOptions>): GitCommitOptions {
  return {
    type: "vault",
    summary: "Update notes",
    body: "Updated several notes based on user request.",
    metadata: {
      conversationId: "conv-123",
      toolsUsed: ["writeFile", "editFile"],
      filesAffected: ["notes/test.md", "notes/other.md"],
      source: "agent",
    },
    authorName: "SmartHole Agent",
    ...overrides,
  };
}

function makeReadCommitResult(
  oid: string,
  overrides?: Partial<ReadCommitResult["commit"]>
): ReadCommitResult {
  return {
    oid,
    commit: {
      message: "vault(vault): test commit\n\nTest body",
      tree: "tree-oid-abc",
      parent: ["parent-oid-abc"],
      author: {
        name: "SmartHole Agent",
        email: "smarthole@local",
        timestamp: 1738800000,
        timezoneOffset: 0,
      },
      committer: {
        name: "SmartHole Agent",
        email: "smarthole@local",
        timestamp: 1738800000,
        timezoneOffset: 0,
      },
      ...overrides,
    },
    payload: "",
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// =============================================================================
// Initialization
// =============================================================================

describe("GitService.initialize", () => {
  it("calls git.init when .git/ does not exist", async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    const service = makeService();

    await service.initialize();

    expect(git.init).toHaveBeenCalledWith(expect.objectContaining({ dir: TEST_DIR }));
  });

  it("skips git.init when .git/ already exists", async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    const service = makeService();

    await service.initialize();

    expect(git.init).not.toHaveBeenCalled();
  });
});

describe("GitService.isInitialized", () => {
  it("returns true when .git/ exists", () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    const service = makeService();

    expect(service.isInitialized()).toBe(true);
  });

  it("returns false when .git/ does not exist", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    const service = makeService();

    expect(service.isInitialized()).toBe(false);
  });
});

// =============================================================================
// Gitignore Seeding
// =============================================================================

describe("GitService.seedGitignore", () => {
  it("creates .gitignore with defaults when none exists", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    const service = makeService();

    service.seedGitignore();

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining(".gitignore"),
      expect.stringContaining(".obsidian/"),
      "utf-8"
    );
    const content = vi.mocked(fs.writeFileSync).mock.calls[0][1] as string;
    expect(content).toContain(".smarthole/");
    expect(content).toContain(".trash/");
    expect(content).toContain(".DS_Store");
    expect(content).toContain("Thumbs.db");
    expect(content).toContain("desktop.ini");
  });

  it("does not modify existing .gitignore", () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    const service = makeService();

    service.seedGitignore();

    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Change Detection
// =============================================================================

describe("GitService.hasChanges", () => {
  it("returns true when statusMatrix has non-[1,1,1] rows", async () => {
    const matrix: StatusRow[] = [
      ["file1.md", 1, 1, 1],
      ["file2.md", 0, 2, 0], // new untracked file
    ];
    vi.mocked(git.statusMatrix).mockResolvedValue(matrix);
    const service = makeService();

    expect(await service.hasChanges()).toBe(true);
  });

  it("returns false when all rows are [1,1,1]", async () => {
    const matrix: StatusRow[] = [
      ["file1.md", 1, 1, 1],
      ["file2.md", 1, 1, 1],
    ];
    vi.mocked(git.statusMatrix).mockResolvedValue(matrix);
    const service = makeService();

    expect(await service.hasChanges()).toBe(false);
  });

  it("returns false when statusMatrix is empty", async () => {
    vi.mocked(git.statusMatrix).mockResolvedValue([]);
    const service = makeService();

    expect(await service.hasChanges()).toBe(false);
  });
});

describe("GitService.getChangedFiles", () => {
  it("returns filepaths of changed files only", async () => {
    const matrix: StatusRow[] = [
      ["unchanged.md", 1, 1, 1],
      ["modified.md", 1, 2, 1],
      ["new-file.md", 0, 2, 0],
    ];
    vi.mocked(git.statusMatrix).mockResolvedValue(matrix);
    const service = makeService();

    const result = await service.getChangedFiles();

    expect(result).toEqual(["modified.md", "new-file.md"]);
  });
});

// =============================================================================
// Commit Operations
// =============================================================================

describe("GitService.commitAll", () => {
  it("stages changed files, removes deleted files, and commits", async () => {
    const matrix: StatusRow[] = [
      ["unchanged.md", 1, 1, 1],
      ["modified.md", 1, 2, 1],
      ["deleted.md", 1, 0, 1], // workdir=0 means deleted
      ["new-file.md", 0, 2, 0],
    ];
    vi.mocked(git.statusMatrix).mockResolvedValue(matrix);
    vi.mocked(git.commit).mockResolvedValue("abc1234567890");

    const service = makeService();
    const sha = await service.commitAll(makeCommitOptions());

    // Should add modified and new files
    expect(git.add).toHaveBeenCalledWith(expect.objectContaining({ filepath: "modified.md" }));
    expect(git.add).toHaveBeenCalledWith(expect.objectContaining({ filepath: "new-file.md" }));

    // Should remove deleted files
    expect(git.remove).toHaveBeenCalledWith(expect.objectContaining({ filepath: "deleted.md" }));

    // Should not add unchanged files
    expect(git.add).not.toHaveBeenCalledWith(expect.objectContaining({ filepath: "unchanged.md" }));

    // Should commit
    expect(git.commit).toHaveBeenCalledWith(
      expect.objectContaining({
        dir: TEST_DIR,
        author: { name: "SmartHole Agent", email: "smarthole@local" },
      })
    );

    expect(sha).toBe("abc1234567890");
  });

  it("returns null when there are no changes", async () => {
    vi.mocked(git.statusMatrix).mockResolvedValue([["file.md", 1, 1, 1]] as StatusRow[]);

    const service = makeService();
    const sha = await service.commitAll(makeCommitOptions());

    expect(sha).toBeNull();
    expect(git.commit).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Commit Message Formatting
// =============================================================================

describe("GitService.formatCommitMessage", () => {
  it("produces the correct structured format with metadata block", () => {
    const service = makeService();
    const message = service.formatCommitMessage(makeCommitOptions());

    expect(message).toContain("vault(vault): Update notes");
    expect(message).toContain("Updated several notes based on user request.");
    expect(message).toContain("smarthole-metadata:");
    expect(message).toContain("conversation: conv-123");
    expect(message).toContain("tools-used: [writeFile, editFile]");
    expect(message).toContain("files-affected: [notes/test.md, notes/other.md]");
    expect(message).toContain("source: agent");
  });

  it("includes the type in the headline", () => {
    const service = makeService();
    const message = service.formatCommitMessage(
      makeCommitOptions({ type: "organize", summary: "Reorganize folders" })
    );

    expect(message.split("\n")[0]).toBe("organize(vault): Reorganize folders");
  });

  it("omits body section when body is empty", () => {
    const service = makeService();
    const message = service.formatCommitMessage(makeCommitOptions({ body: "" }));

    // The headline should be followed by the metadata block without an extra body section
    const lines = message.split("\n");
    expect(lines[0]).toContain("vault(vault):");
    expect(message).toContain("smarthole-metadata:");
    // No empty body paragraph between headline and metadata
    expect(message).not.toContain("Update notes\n\n\n");
  });
});

// =============================================================================
// Log Operations
// =============================================================================

describe("GitService.log", () => {
  it("delegates to git.log with correct options", async () => {
    const commits = [
      makeReadCommitResult("aaa1111111111111111111111111111111111111"),
      makeReadCommitResult("bbb2222222222222222222222222222222222222"),
    ];
    vi.mocked(git.log).mockResolvedValue(commits);
    const service = makeService();

    const result = await service.log({ maxCount: 5, filepath: "notes/test.md" });

    expect(git.log).toHaveBeenCalledWith(
      expect.objectContaining({
        dir: TEST_DIR,
        depth: 5,
        filepath: "notes/test.md",
      })
    );
    expect(result).toHaveLength(2);
    expect(result[0].hash).toBe("aaa1111111111111111111111111111111111111");
    expect(result[0].abbreviatedHash).toBe("aaa1111");
  });

  it("returns commits with correct date conversion", async () => {
    const commit = makeReadCommitResult("abc1234567890123456789012345678901234567");
    vi.mocked(git.log).mockResolvedValue([commit]);
    const service = makeService();

    const result = await service.log();

    // timestamp 1738800000 seconds -> Date
    expect(result[0].date).toEqual(new Date(1738800000 * 1000));
    expect(result[0].author.name).toBe("SmartHole Agent");
    expect(result[0].author.email).toBe("smarthole@local");
  });
});

// =============================================================================
// Search Operations
// =============================================================================

describe("GitService.searchCommits", () => {
  it("filters log results by query text (case-insensitive)", async () => {
    const commits = [
      makeReadCommitResult("aaa0000000000000000000000000000000000000", {
        message: "vault(vault): Update meeting notes",
      }),
      makeReadCommitResult("bbb0000000000000000000000000000000000000", {
        message: "organize(vault): Reorganize folders",
      }),
    ];
    vi.mocked(git.log).mockResolvedValue(commits.map((c) => ({ ...c })));
    const service = makeService();

    const result = await service.searchCommits({ query: "meeting" });

    expect(result).toHaveLength(1);
    expect(result[0].hash).toBe("aaa0000000000000000000000000000000000000");
  });

  it("filters by date range", async () => {
    const commits = [
      makeReadCommitResult("aaa0000000000000000000000000000000000000", {
        author: {
          name: "Agent",
          email: "a@b.c",
          timestamp: 1738900000, // Feb 7, 2025
          timezoneOffset: 0,
        },
      }),
      makeReadCommitResult("bbb0000000000000000000000000000000000000", {
        author: {
          name: "Agent",
          email: "a@b.c",
          timestamp: 1738700000, // Feb 5, 2025
          timezoneOffset: 0,
        },
      }),
    ];
    vi.mocked(git.log).mockResolvedValue(commits.map((c) => ({ ...c })));
    const service = makeService();

    const result = await service.searchCommits({
      since: new Date(1738800000 * 1000), // Only commits after this
    });

    expect(result).toHaveLength(1);
    expect(result[0].hash).toBe("aaa0000000000000000000000000000000000000");
  });

  it("respects maxResults", async () => {
    const commits = Array.from({ length: 20 }, (_, i) =>
      makeReadCommitResult(`${String(i).padStart(40, "0")}`, {
        message: `commit ${i}`,
      })
    );
    vi.mocked(git.log).mockResolvedValue(commits.map((c) => ({ ...c })));
    const service = makeService();

    const result = await service.searchCommits({ query: "commit", maxResults: 3 });

    expect(result).toHaveLength(3);
  });
});

// =============================================================================
// Commit Details
// =============================================================================

describe("GitService.getCommitDetails", () => {
  it("returns commit info with file diffs", async () => {
    const commitResult = makeReadCommitResult("abc1234567890123456789012345678901234567");
    vi.mocked(git.readCommit).mockResolvedValue(commitResult);

    // Mock walk to simulate diff entries
    vi.mocked(walk).mockImplementation(async (opts) => {
      const mapFn = opts.map!;
      // Simulate walking and calling map for each file
      await mapFn(".", [
        makeMockWalkerEntry("tree", "root-parent"),
        makeMockWalkerEntry("tree", "root-commit"),
      ]);
      await mapFn("added.md", [null, makeMockWalkerEntry("blob", "new-oid")]);
      await mapFn("modified.md", [
        makeMockWalkerEntry("blob", "old-oid"),
        makeMockWalkerEntry("blob", "new-oid-2"),
      ]);
      await mapFn("deleted.md", [makeMockWalkerEntry("blob", "old-oid-2"), null]);
      return undefined;
    });

    const service = makeService();
    const details = await service.getCommitDetails("abc1234567890123456789012345678901234567");

    expect(details.hash).toBe("abc1234567890123456789012345678901234567");
    expect(details.filesChanged).toBeDefined();
    expect(details.filesChanged).toHaveLength(3);

    const types = details.filesChanged!.map((d) => d.type);
    expect(types).toContain("add");
    expect(types).toContain("modify");
    expect(types).toContain("delete");
  });
});

// =============================================================================
// File Diffs
// =============================================================================

describe("GitService.getFileDiffs", () => {
  it("detects added, modified, and deleted files between parent and commit", async () => {
    const commitResult = makeReadCommitResult("commit-oid", {
      parent: ["parent-oid"],
    });
    vi.mocked(git.readCommit).mockResolvedValue(commitResult);

    vi.mocked(walk).mockImplementation(async (opts) => {
      const mapFn = opts.map!;
      await mapFn(".", [makeMockWalkerEntry("tree", "t1"), makeMockWalkerEntry("tree", "t2")]);
      // Added file: only in commit tree
      await mapFn("new.md", [null, makeMockWalkerEntry("blob", "b1")]);
      // Deleted file: only in parent tree
      await mapFn("removed.md", [makeMockWalkerEntry("blob", "b2"), null]);
      // Modified file: different OIDs
      await mapFn("changed.md", [
        makeMockWalkerEntry("blob", "b3"),
        makeMockWalkerEntry("blob", "b4"),
      ]);
      // Unchanged file: same OID
      await mapFn("same.md", [
        makeMockWalkerEntry("blob", "b5"),
        makeMockWalkerEntry("blob", "b5"),
      ]);
      return undefined;
    });

    const service = makeService();
    const diffs = await service.getFileDiffs("commit-oid");

    expect(diffs).toHaveLength(3);
    expect(diffs.find((d) => d.filepath === "new.md")?.type).toBe("add");
    expect(diffs.find((d) => d.filepath === "removed.md")?.type).toBe("delete");
    expect(diffs.find((d) => d.filepath === "changed.md")?.type).toBe("modify");
    // "same.md" should not appear
    expect(diffs.find((d) => d.filepath === "same.md")).toBeUndefined();
  });

  it("treats all files as 'add' for initial commits (no parent)", async () => {
    const commitResult = makeReadCommitResult("initial-oid", {
      parent: [], // No parent = initial commit
    });
    vi.mocked(git.readCommit).mockResolvedValue(commitResult);

    vi.mocked(walk).mockImplementation(async (opts) => {
      const mapFn = opts.map!;
      await mapFn(".", [makeMockWalkerEntry("tree", "t1")]);
      await mapFn("file1.md", [makeMockWalkerEntry("blob", "b1")]);
      await mapFn("file2.md", [makeMockWalkerEntry("blob", "b2")]);
      return undefined;
    });

    const service = makeService();
    const diffs = await service.getFileDiffs("initial-oid");

    expect(diffs).toHaveLength(2);
    expect(diffs.every((d) => d.type === "add")).toBe(true);
  });
});

// =============================================================================
// Test Helpers
// =============================================================================

function makeMockWalkerEntry(entryType: "tree" | "blob", entryOid: string) {
  return {
    type: () => Promise.resolve(entryType),
    oid: () => Promise.resolve(entryOid),
    mode: () => Promise.resolve(entryType === "tree" ? 0o040000 : 0o100644),
    content: () => Promise.resolve(undefined),
    stat: () =>
      Promise.resolve({
        ctimeSeconds: 0,
        ctimeNanoseconds: 0,
        mtimeSeconds: 0,
        mtimeNanoseconds: 0,
        dev: 0,
        ino: 0,
        mode: 0,
        uid: 0,
        gid: 0,
        size: 0,
      }),
  };
}
