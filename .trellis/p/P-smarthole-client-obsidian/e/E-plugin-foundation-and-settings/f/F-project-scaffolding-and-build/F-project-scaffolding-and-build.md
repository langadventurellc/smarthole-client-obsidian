---
id: F-project-scaffolding-and-build
title: Project Scaffolding and Build Configuration
status: in-progress
priority: high
parent: E-plugin-foundation-and-settings
prerequisites: []
affectedFiles:
  package.json: Created package.json with runtime dependency @anthropic-ai/sdk and
    dev dependencies for TypeScript/Obsidian development
  tsconfig.json: Created TypeScript configuration with strict mode, ES2018 target,
    and source maps for Obsidian plugin development
  manifest.json: "Created Obsidian plugin manifest with isDesktopOnly: true for
    WebSocket support"
  esbuild.config.mjs: Created esbuild build configuration with ESM syntax, entry
    point src/main.ts, output main.js, external modules for Obsidian, watch mode
    for dev and minification for production
  mise.toml: "Created mise task runner configuration with all commands from
    CLAUDE.md: dev, build, test, quality, lint, format, type-check"
log: []
schema: v1.0
childrenIds:
  - T-create-build-configuration
  - T-create-initial-source
  - T-set-up-code-quality-tooling
  - T-create-core-configuration
created: 2026-02-03T04:11:47.524Z
updated: 2026-02-03T04:11:47.524Z
---

# Project Scaffolding and Build Configuration

## Purpose

Set up the complete project infrastructure including all configuration files, build tooling, and development environment. This creates the foundation that all plugin code will build upon.

## Deliverables

### 1. Package Configuration (`package.json`)

Create `package.json` with:

**Dependencies:**
- `obsidian` - Obsidian plugin API (dev dependency)
- `typescript` - TypeScript compiler (dev dependency)
- `esbuild` - Build tool (dev dependency)
- `@anthropic-ai/sdk` - Anthropic SDK (runtime dependency)
- `@types/node` - Node.js type definitions (dev dependency)

**Scripts (via mise):**
- `mise run dev` - Start dev mode with hot reload (esbuild watch)
- `mise run build` - Build for distribution (esbuild production)
- `mise run quality` - Run all quality checks

**Metadata:**
- Name: `smarthole-client-obsidian`
- Version: `1.0.0`
- Private: `true`

### 2. TypeScript Configuration (`tsconfig.json`)

Configure TypeScript for Obsidian plugin development:
- Target: ES2018 or higher (Electron environment)
- Module: CommonJS
- Strict mode enabled
- Include `src/**/*.ts`
- Exclude `node_modules`
- Type roots for Obsidian types

### 3. Plugin Manifest (`manifest.json`)

Create Obsidian plugin manifest:
- `id`: `smarthole-client`
- `name`: `SmartHole Client`
- `description`: Voice and text-driven note management via SmartHole
- `version`: `1.0.0`
- `minAppVersion`: Current stable Obsidian version
- `author`: Appropriate author
- `isDesktopOnly`: `true` (WebSocket requirement)

### 4. Build Configuration

Create esbuild configuration:
- Entry point: `src/main.ts`
- Output: `main.js`
- Bundle all dependencies
- External: `obsidian`, `electron`, `@codemirror/*`, `@lezer/*`
- Platform: `node`
- Format: `cjs`
- Watch mode for development
- Minification for production

### 5. Mise Configuration (`mise.toml`)

Configure mise task runner with commands from CLAUDE.md:
```
dev         - Start dev mode with hot reload
build       - Build for distribution
test        - Run tests (placeholder for now)
quality     - All quality checks (lint + format + type-check)
lint        - ESLint only
format      - Prettier only
type-check  - TypeScript only
```

### 6. Code Quality Tools

Set up linting and formatting:
- ESLint configuration for TypeScript
- Prettier configuration
- `.gitignore` updates for build artifacts

### 7. Project Structure

Create the directory structure:
```
src/
├── main.ts  (empty placeholder or minimal export)
```

## Acceptance Criteria

- [ ] `npm install` succeeds without errors
- [ ] `mise run build` produces `main.js` in project root
- [ ] `mise run dev` starts watch mode
- [ ] `mise run quality` runs all quality checks
- [ ] TypeScript compilation succeeds with strict mode
- [ ] ESLint passes with no errors
- [ ] Prettier formats code correctly
- [ ] `manifest.json` has correct metadata and `isDesktopOnly: true`
- [ ] All configuration files follow Obsidian plugin conventions

## Technical Notes

- Follow the patterns from `reference-docs/obsidian-plugin-docs/getting-started.md`
- Use modern esbuild patterns (not webpack or rollup)
- Ensure hot-reload compatibility for development
- Keep build output minimal (single `main.js` file)

## Dependencies

None - this is the first feature to implement.