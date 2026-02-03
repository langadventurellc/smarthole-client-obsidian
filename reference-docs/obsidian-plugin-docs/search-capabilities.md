# Search Capabilities

Obsidian provides both built-in search functions and metadata cache for searching notes.

## Fuzzy Search

Best for user-facing search with typo tolerance. Performance may degrade with thousands of searches.

```typescript
import { prepareFuzzySearch } from 'obsidian';

const search = prepareFuzzySearch('query');
const result = search('text to search in');

if (result) {
  // result.score - match quality
  // result.matches - matched character positions
}
```

## Simple Search

Better performance for large-scale searches:

```typescript
import { prepareSimpleSearch } from 'obsidian';

const search = prepareSimpleSearch('space separated words');
const result = search('text to search');
```

## MetadataCache

Access indexed metadata for all files:

```typescript
// Get cached metadata for a file
const cache = this.app.metadataCache.getFileCache(file);
// cache.frontmatter - YAML frontmatter
// cache.tags - tags in the file
// cache.links - internal links
// cache.headings - headings

// Resolve links
const destFile = this.app.metadataCache.getFirstLinkpathDest(linkpath, sourcePath);

// Access resolved/unresolved links
const resolved = this.app.metadataCache.resolvedLinks;
const unresolved = this.app.metadataCache.unresolvedLinks;
```

## Searching All Files

```typescript
// Example: Search all notes for a term
const query = prepareFuzzySearch('search term');
const results = [];

for (const file of this.app.vault.getMarkdownFiles()) {
  const content = await this.app.vault.cachedRead(file);
  const match = query(content);
  if (match) {
    results.push({ file, score: match.score });
  }
}

// Sort by relevance
results.sort((a, b) => b.score - a.score);
```

**Note:** For external search tools like ripgrep, you can access the vault's file system path via the Adapter API for direct file system operations (requires `isDesktopOnly: true` in manifest).

**Documentation:**
- [/Users/zach/code/obsidian-developer-docs/en/Reference/TypeScript API/MetadataCache.md](/Users/zach/code/obsidian-developer-docs/en/Reference/TypeScript%20API/MetadataCache.md)
- [/Users/zach/code/obsidian-developer-docs/en/Reference/TypeScript API/prepareFuzzySearch.md](/Users/zach/code/obsidian-developer-docs/en/Reference/TypeScript%20API/prepareFuzzySearch.md)
- [/Users/zach/code/obsidian-developer-docs/en/Reference/TypeScript API/prepareSimpleSearch.md](/Users/zach/code/obsidian-developer-docs/en/Reference/TypeScript%20API/prepareSimpleSearch.md)
