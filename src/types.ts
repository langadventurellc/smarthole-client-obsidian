export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error" | "disabled";

export const CLAUDE_MODELS = {
  "claude-haiku-4-5-20251001": "Claude Haiku 4.5 (Fast, cost-efficient)",
  "claude-sonnet-4-5-20250929": "Claude Sonnet 4.5 (Balanced)",
  "claude-opus-4-5-20251101": "Claude Opus 4.5 (Most capable)",
} as const;

export type ClaudeModelId = keyof typeof CLAUDE_MODELS;

export const CLAUDE_MODEL_MAX_OUTPUT_TOKENS: Record<ClaudeModelId, number> = {
  "claude-haiku-4-5-20251001": 64000,
  "claude-sonnet-4-5-20250929": 64000,
  "claude-opus-4-5-20251101": 64000,
} as const;
