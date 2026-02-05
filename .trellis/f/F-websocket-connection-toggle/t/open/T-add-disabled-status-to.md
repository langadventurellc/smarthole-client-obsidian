---
id: T-add-disabled-status-to
title: Add disabled status to ConnectionStatus type
status: open
priority: medium
parent: F-websocket-connection-toggle
prerequisites: []
affectedFiles: {}
log: []
schema: v1.0
childrenIds: []
created: 2026-02-05T06:03:29.895Z
updated: 2026-02-05T06:03:29.895Z
---

## Summary
Extend the `ConnectionStatus` type to include a "disabled" value, distinguishing intentional user disabling from connection failures.

## Technical Details

### Update `src/types.ts`
Change the `ConnectionStatus` type from:
```typescript
export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";
```
to:
```typescript
export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error" | "disabled";
```

## Rationale
The "disabled" status represents a user's intentional choice to not connect to SmartHole, which is semantically different from:
- "disconnected" - connection was lost or failed
- "error" - a connection error occurred

This allows the UI to clearly communicate the difference to users.

## Acceptance Criteria
- [ ] `ConnectionStatus` type includes `"disabled"` as a valid value
- [ ] No breaking changes to existing code (additive change only)

## Files to Modify
- `src/types.ts`