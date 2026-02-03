---
id: T-set-up-code-quality-tooling
title: Set Up Code Quality Tooling (ESLint, Prettier, .gitignore)
status: done
priority: medium
parent: F-project-scaffolding-and-build
prerequisites:
  - T-create-core-configuration
affectedFiles:
  eslint.config.mjs: Created ESLint flat config with typescript-eslint recommended
    rules, ignores for build output, and configured
    @typescript-eslint/no-unused-vars with argsIgnorePattern
  .prettierrc: Created Prettier config with semi, double quotes, 2-space tabs, es5
    trailing commas, and 100 char print width
  .prettierignore: Created Prettier ignore file excluding main.js, node_modules,
    reference-docs, docs, .trellis, and markdown files
  .gitignore: Created gitignore excluding node_modules, build output (main.js,
    main.js.map), IDE files, OS files, and logs
  package.json: "Added dev dependencies: eslint ^9.39.2, @eslint/js ^9.39.2,
    typescript-eslint ^8.54.0, prettier ^3.8.1"
  mise.toml: Updated lint task to use ESLint 9 syntax (removed deprecated --ext flag)
log:
  - |-
    Starting implementation. Research findings:
    - package.json exists with base dependencies
    - mise.toml has lint/format tasks but needs ESLint 9 syntax update
    - No ESLint, Prettier, or .gitignore files exist yet
    - Will create all config files and install dependencies
  - Set up code quality tooling with ESLint 9 flat config format, Prettier, and
    .gitignore. All configuration files are in place and dev dependencies are
    installed. The quality checks will pass once the src directory is created by
    the T-create-initial-source task.
schema: v1.0
childrenIds: []
created: 2026-02-03T04:17:01.469Z
updated: 2026-02-03T04:17:01.469Z
---

# Set Up Code Quality Tooling

## Purpose

Configure ESLint and Prettier for consistent code quality and formatting, and update .gitignore for build artifacts.

## Deliverables

### 1. ESLint Configuration

Create `eslint.config.js` (ESLint flat config format):

```javascript
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ["main.js", "*.config.mjs"],
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-explicit-any": "warn",
    },
  }
);
```

**Required dev dependencies to add to package.json:**
- `eslint`
- `@eslint/js`
- `typescript-eslint`

### 2. Prettier Configuration

Create `.prettierrc`:

```json
{
  "semi": true,
  "singleQuote": false,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

Create `.prettierignore`:
```
main.js
node_modules
```

**Required dev dependency to add to package.json:**
- `prettier`

### 3. Update .gitignore

Create/update `.gitignore`:

```
# Dependencies
node_modules/

# Build output
main.js
main.js.map

# IDE
.idea/
*.sublime-*
.vscode/

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*
```

## Acceptance Criteria

- [ ] ESLint config uses flat config format (ESLint 9+)
- [ ] Prettier config exists with consistent settings
- [ ] `.gitignore` excludes `main.js`, `node_modules/`, and common artifacts
- [ ] All required dev dependencies are listed in package.json

## Technical Notes

- Use ESLint flat config (not legacy `.eslintrc`) for modern ESLint
- Update package.json to include the linting dependencies
- Prettier and ESLint configs should not conflict