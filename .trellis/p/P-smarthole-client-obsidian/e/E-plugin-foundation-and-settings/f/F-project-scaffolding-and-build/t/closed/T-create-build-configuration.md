---
id: T-create-build-configuration
title: Create Build Configuration (esbuild and mise.toml)
status: done
priority: high
parent: F-project-scaffolding-and-build
prerequisites: []
affectedFiles:
  esbuild.config.mjs: Created esbuild build configuration with ESM syntax, entry
    point src/main.ts, output main.js, external modules for Obsidian, watch mode
    for dev and minification for production
  mise.toml: "Created mise task runner configuration with all commands from
    CLAUDE.md: dev, build, test, quality, lint, format, type-check"
log:
  - |-
    Research phase completed:
    - Verified package.json exists with esbuild 0.24.0 as dev dependency
    - tsconfig.json configured for ES2018/CommonJS target
    - No esbuild.config.mjs or mise.toml exists yet
    - package.json build script already references esbuild.config.mjs
    - Starting implementation of both configuration files
  - Created esbuild configuration and mise.toml task runner for the Obsidian
    plugin. The esbuild.config.mjs uses ESM syntax with context API for watch
    mode support, bundles from src/main.ts to main.js, externalizes all
    Obsidian-provided modules (obsidian, electron, @codemirror/*, @lezer/*),
    targets ES2018/CJS format, and includes inline sourcemaps for dev with
    minification for production. The mise.toml defines all seven commands from
    CLAUDE.md with proper task dependencies for the quality check.
schema: v1.0
childrenIds: []
created: 2026-02-03T04:16:52.142Z
updated: 2026-02-03T04:16:52.142Z
---

# Create Build Configuration

## Purpose

Set up esbuild for bundling the plugin and mise.toml for task running, enabling `mise run dev` and `mise run build` commands.

## Deliverables

### 1. esbuild.config.mjs

Create an esbuild configuration file:

```javascript
import esbuild from "esbuild";
import process from "process";

const prod = process.argv[2] === "production";

const context = await esbuild.context({
  entryPoints: ["src/main.ts"],
  bundle: true,
  external: [
    "obsidian",
    "electron",
    "@codemirror/autocomplete",
    "@codemirror/collab",
    "@codemirror/commands",
    "@codemirror/language",
    "@codemirror/lint",
    "@codemirror/search",
    "@codemirror/state",
    "@codemirror/view",
    "@lezer/common",
    "@lezer/highlight",
    "@lezer/lr",
  ],
  format: "cjs",
  target: "es2018",
  logLevel: "info",
  sourcemap: prod ? false : "inline",
  treeShaking: true,
  outfile: "main.js",
  minify: prod,
});

if (prod) {
  await context.rebuild();
  process.exit(0);
} else {
  await context.watch();
}
```

### 2. mise.toml

Create mise task runner configuration per CLAUDE.md:

```toml
[tasks.dev]
description = "Start dev mode with hot reload"
run = "node esbuild.config.mjs"

[tasks.build]
description = "Build for distribution"
run = "node esbuild.config.mjs production"

[tasks.test]
description = "Run tests"
run = "echo 'No tests configured yet'"

[tasks.quality]
description = "All quality checks (lint + format + type-check)"
depends = ["lint", "format", "type-check"]

[tasks.lint]
description = "ESLint only"
run = "npx eslint src --ext .ts"

[tasks.format]
description = "Prettier check"
run = "npx prettier --check src"

[tasks.type-check]
description = "TypeScript type checking"
run = "npx tsc --noEmit"
```

## Acceptance Criteria

- [ ] `esbuild.config.mjs` exists and is valid ES module syntax
- [ ] `mise.toml` defines all commands from CLAUDE.md
- [ ] External modules list matches Obsidian requirements
- [ ] Build outputs to `main.js` in project root

## Technical Notes

- esbuild config uses ESM syntax (`.mjs` extension)
- All Obsidian-provided modules must be marked external
- Watch mode for development, single build for production