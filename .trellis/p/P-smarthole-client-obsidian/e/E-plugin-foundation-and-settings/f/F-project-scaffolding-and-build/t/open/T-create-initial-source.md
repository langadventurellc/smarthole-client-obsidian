---
id: T-create-initial-source
title: Create Initial Source Structure and Verify Build
status: open
priority: high
parent: F-project-scaffolding-and-build
prerequisites:
  - T-create-core-configuration
  - T-create-build-configuration
  - T-set-up-code-quality-tooling
affectedFiles: {}
log: []
schema: v1.0
childrenIds: []
created: 2026-02-03T04:17:09.624Z
updated: 2026-02-03T04:17:09.624Z
---

# Create Initial Source Structure and Verify Build

## Purpose

Create the minimal source structure with a placeholder main.ts, install dependencies, and verify the entire build pipeline works end-to-end.

## Deliverables

### 1. Create src/main.ts

Create `src/main.ts` with minimal plugin skeleton:

```typescript
import { Plugin } from "obsidian";

export default class SmartHolePlugin extends Plugin {
  async onload() {
    console.log("SmartHole Client plugin loaded");
  }

  async onunload() {
    console.log("SmartHole Client plugin unloaded");
  }
}
```

### 2. Install Dependencies

Run `npm install` to install all dependencies defined in package.json.

### 3. Verify All Build Commands

Run and verify each command succeeds:

- [ ] `mise run build` - Should produce `main.js` in project root
- [ ] `mise run type-check` - Should pass with no errors
- [ ] `mise run lint` - Should pass with no errors
- [ ] `mise run format` - Should show all files formatted (or format them)
- [ ] `mise run quality` - Should run all checks successfully

### 4. Verify Build Output

Confirm `main.js` is generated and contains bundled code.

## Acceptance Criteria

- [ ] `src/main.ts` exists with valid plugin class extending `Plugin`
- [ ] `npm install` completes without errors
- [ ] `mise run build` produces `main.js`
- [ ] `mise run quality` passes all checks
- [ ] TypeScript strict mode is satisfied
- [ ] ESLint reports no errors
- [ ] Prettier reports files are formatted

## Technical Notes

- This task should be done AFTER all config files are in place
- The plugin class must export as default
- The plugin class must extend Obsidian's Plugin class
- Keep the implementation minimal - just lifecycle methods

## Dependencies

This task depends on all three previous tasks being completed first.