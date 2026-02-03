---
id: T-set-up-code-quality-tooling
title: Set Up Code Quality Tooling (ESLint, Prettier, .gitignore)
status: open
priority: medium
parent: F-project-scaffolding-and-build
prerequisites:
  - T-create-core-configuration
affectedFiles: {}
log: []
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