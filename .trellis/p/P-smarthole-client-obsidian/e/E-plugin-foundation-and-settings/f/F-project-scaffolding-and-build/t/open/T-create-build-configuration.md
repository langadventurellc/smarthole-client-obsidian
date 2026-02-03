---
id: T-create-build-configuration
title: Create Build Configuration (esbuild and mise.toml)
status: open
priority: high
parent: F-project-scaffolding-and-build
prerequisites: []
affectedFiles: {}
log: []
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