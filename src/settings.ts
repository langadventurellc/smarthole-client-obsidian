import type { ClaudeModelId } from "./types";

export interface SmartHoleSettings {
  anthropicApiKeyName: string;
  model: ClaudeModelId;
  clientName: string;
  routingDescription: string;
  informationArchitecture: string;
}

const DEFAULT_ROUTING_DESCRIPTION = `I manage personal notes, journals, lists, and knowledge in Obsidian. I can create notes, update existing ones, search for information, and organize files. Use me for anything related to remembering things, note-taking, or personal knowledge management.`;

const DEFAULT_INFORMATION_ARCHITECTURE = `This is a personal knowledge notebook. Notes can be organized flexibly based on content:

- Daily notes and journals go in the "Journal" folder
- Lists (shopping, todos, etc.) go in the "Lists" folder
- Project-related notes go in the "Projects" folder
- General reference and wiki-style notes go in the root or "Notes" folder

When encountering information that doesn't fit clearly into existing categories, create a new note in the most logical location and use descriptive naming. Prefer linking related notes together using [[wiki links]].

The goal is an evolving personal wiki where information is easy to find and naturally connected.`;

export const DEFAULT_SETTINGS: SmartHoleSettings = {
  anthropicApiKeyName: "",
  model: "claude-haiku-4-5-20251001",
  clientName: "Miss Simone",
  routingDescription: DEFAULT_ROUTING_DESCRIPTION,
  informationArchitecture: DEFAULT_INFORMATION_ARCHITECTURE,
};
