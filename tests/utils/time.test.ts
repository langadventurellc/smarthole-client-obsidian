import { describe, it, expect } from "vitest";
import { formatLocalTimestamp, formatLocalDate } from "../../src/utils/time";

describe("formatLocalTimestamp", () => {
  it("converts a valid ISO string to a local time string", () => {
    const result = formatLocalTimestamp("2026-02-05T15:30:00.000Z");

    // Should contain expected components (exact format varies by locale)
    expect(result).toContain("2026");
    expect(result).toContain("30");
    // Should not be the raw ISO string
    expect(result).not.toContain("T");
    expect(result).not.toContain("Z");
  });

  it("returns the original string for invalid input", () => {
    expect(formatLocalTimestamp("not-a-date")).toBe("not-a-date");
    expect(formatLocalTimestamp("12345-garbage")).toBe("12345-garbage");
  });

  it("returns empty string for empty string input", () => {
    expect(formatLocalTimestamp("")).toBe("");
  });
});

describe("formatLocalDate", () => {
  it("converts a valid epoch ms to a local date string", () => {
    // 2026-02-05 in epoch ms
    const result = formatLocalDate(1770249000000);

    expect(result).toContain("2026");
    // Should not contain time components or ISO format
    expect(result).not.toContain("T");
    expect(result).not.toContain("Z");
  });

  it("returns the stringified input for NaN", () => {
    expect(formatLocalDate(NaN)).toBe("NaN");
  });
});
