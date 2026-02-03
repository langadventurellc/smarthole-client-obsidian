---
id: T-create-core-configuration
title: Create Core Configuration Files (package.json, tsconfig.json, manifest.json)
status: done
priority: high
parent: F-project-scaffolding-and-build
prerequisites: []
affectedFiles:
  package.json: Created package.json with runtime dependency @anthropic-ai/sdk and
    dev dependencies for TypeScript/Obsidian development
  tsconfig.json: Created TypeScript configuration with strict mode, ES2018 target,
    and source maps for Obsidian plugin development
  manifest.json: "Created Obsidian plugin manifest with isDesktopOnly: true for
    WebSocket support"
log:
  - >-
    Created the three core configuration files for the SmartHole Client Obsidian
    plugin:


    1. **package.json** - Configured with:
       - Runtime dependency: @anthropic-ai/sdk ^0.39.0
       - Dev dependencies: obsidian ^1.7.2, typescript ^5.7.0, esbuild ^0.24.0, @types/node ^22.0.0
       - Metadata: name "smarthole-client-obsidian", version 1.0.0, private true, main "main.js"
       - Single build script for compatibility (actual scripts will be handled via mise)

    2. **tsconfig.json** - Configured for Obsidian plugin development:
       - Target ES2018 for Electron environment compatibility
       - CommonJS module format with node resolution
       - Strict TypeScript mode with additional quality checks (noImplicitAny, noUnusedLocals, etc.)
       - Source maps enabled for debugging
       - Include/exclude patterns for src directory

    3. **manifest.json** - Obsidian plugin manifest with:
       - ID: smarthole-client
       - isDesktopOnly: true (required for WebSocket)
       - All required metadata fields per Obsidian plugin conventions

    All files are valid JSON and ready for the build configuration task to be
    implemented next.
schema: v1.0
childrenIds: []
created: 2026-02-03T04:16:41.560Z
updated: 2026-02-03T04:16:41.560Z
---

# Create Core Configuration Files

## Purpose

Establish the fundamental project configuration files that all other build tooling and source code depends on.

## Deliverables

### 1. package.json

Create `package.json` with:

**Dependencies:**
- `@anthropic-ai/sdk` - Anthropic SDK (runtime dependency)

**Dev Dependencies:**
- `obsidian` - Obsidian plugin API types
- `typescript` - TypeScript compiler
- `esbuild` - Build tool
- `@types/node` - Node.js type definitions

**Metadata:**
- `name`: `smarthole-client-obsidian`
- `version`: `1.0.0`
- `private`: `true`
- `main`: `main.js`

**Note:** Scripts will be handled via mise, so minimal npm scripts needed (just a build script for compatibility).

### 2. tsconfig.json

Configure TypeScript for Obsidian plugin development:
- `target`: `ES2018` (Electron environment)
- `module`: `CommonJS`
- `strict`: `true`
- `moduleResolution`: `node`
- `lib`: `["DOM", "ES2018"]`
- `include`: `["src/**/*.ts"]`
- `exclude`: `["node_modules"]`
- Enable source maps for debugging

### 3. manifest.json

Create Obsidian plugin manifest:
- `id`: `smarthole-client`
- `name`: `SmartHole Client`
- `description`: `Voice and text-driven note management powered by Claude via SmartHole`
- `version`: `1.0.0`
- `minAppVersion`: `1.0.0` (widely compatible)
- `author`: `SmartHole`
- `isDesktopOnly`: `true` (required for WebSocket)

## Acceptance Criteria

- [ ] `package.json` is valid JSON with correct dependency structure
- [ ] `tsconfig.json` compiles TypeScript with strict mode
- [ ] `manifest.json` has `isDesktopOnly: true`
- [ ] All files follow Obsidian plugin conventions

## Technical Notes

- Do NOT run `npm install` in this task - that will happen after all config files are in place
- Follow patterns from `reference-docs/obsidian-plugin-docs/getting-started.md`