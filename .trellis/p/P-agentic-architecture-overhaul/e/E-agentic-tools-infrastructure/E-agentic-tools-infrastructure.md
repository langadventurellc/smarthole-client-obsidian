---
id: E-agentic-tools-infrastructure
title: Agentic Tools Infrastructure
status: open
priority: high
parent: P-agentic-architecture-overhaul
prerequisites: []
affectedFiles: {}
log: []
schema: v1.0
childrenIds: []
created: 2026-02-04T00:46:59.323Z
updated: 2026-02-04T00:46:59.323Z
---

Implement the new tool set that replaces the MVP Obsidian API-based tools with direct filesystem access and enhanced capabilities.

## Scope

This epic covers creating all six new tools:

1. **bash** - Vault-scoped bash command execution with allowlist/blocklist security
2. **read_file** - Safe file reading with optional line range support
3. **write_file** - File creation/overwriting with automatic parent directory creation
4. **edit_file** - Targeted file editing (search/replace, line operations)
5. **list_files** - Directory listing with glob pattern support
6. **send_message** - Real-time notification/message delivery tool

## Key Requirements

- All file operations must be vault-scoped (cannot escape vault directory)
- Bash execution needs two-layer security: base command allowlist + dangerous pattern blocking
- Commands must have reasonable timeout (30 seconds suggested)
- send_message must work with both WebSocket and direct message sources
- Tools follow the existing ToolHandler pattern for registration with LLMService

## Technical Approach

- Use Node.js `child_process.exec` for bash with vault as cwd
- Implement path validation to prevent directory traversal attacks
- send_message needs a callback mechanism for real-time delivery

## Acceptance Criteria (from requirements)

### Bash Execution
- Bash tool executes commands within vault directory only
- Commands outside vault are rejected with clear error
- Dangerous commands (rm -rf, chmod, etc.) are blocked
- Allowlist is configurable or well-documented
- Command output is captured and returned to agent
- Reasonable timeout prevents hung commands

### File Operations
- read_file reads file contents, supports line ranges
- write_file creates/overwrites files, creates parent directories
- edit_file applies targeted changes without full rewrite
- list_files lists files with glob pattern support
- All operations are vault-scoped

### Notification Tool
- send_message tool sends message to user via SmartHole or ChatView
- Agent can call send_message multiple times during execution
- Messages appear in real-time (not batched until end)
- Works for both WebSocket and direct message sources