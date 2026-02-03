# Network Requests

## HTTP/HTTPS Requests

Obsidian provides `requestUrl()` which works like `fetch()` but bypasses CORS restrictions:

```typescript
import { requestUrl } from 'obsidian';

// Simple GET request
const response = await requestUrl('https://api.example.com/data');
const data = response.json;

// POST request with headers and body
const response = await requestUrl({
  url: 'https://api.anthropic.com/v1/messages',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01'
  },
  body: JSON.stringify({
    model: 'claude-3-sonnet-20240229',
    max_tokens: 1024,
    messages: [{ role: 'user', content: 'Hello' }]
  }),
  throw: false  // Don't throw on 4xx/5xx errors
});

if (response.status === 200) {
  const result = response.json;
}
```

## RequestUrlParam Options

| Property      | Type                      | Description                             |
| ------------- | ------------------------- | --------------------------------------- |
| `url`         | `string`                  | Required. The URL to request            |
| `method`      | `string`                  | HTTP method (GET, POST, etc.)           |
| `headers`     | `Record<string, string>`  | Request headers                         |
| `body`        | `string \| ArrayBuffer`   | Request body                            |
| `contentType` | `string`                  | Content-Type header shortcut            |
| `throw`       | `boolean`                 | Throw on 4xx+ status (default: true)    |

**Documentation:**
- [/Users/zach/code/obsidian-developer-docs/en/Reference/TypeScript API/requestUrl.md](/Users/zach/code/obsidian-developer-docs/en/Reference/TypeScript%20API/requestUrl.md)
- [/Users/zach/code/obsidian-developer-docs/en/Reference/TypeScript API/RequestUrlParam.md](/Users/zach/code/obsidian-developer-docs/en/Reference/TypeScript%20API/RequestUrlParam.md)
