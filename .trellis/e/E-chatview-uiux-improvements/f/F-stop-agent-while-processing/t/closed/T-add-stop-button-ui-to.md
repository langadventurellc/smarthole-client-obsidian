---
id: T-add-stop-button-ui-to
title: Add stop button UI to ChatView with styles
status: done
priority: high
parent: F-stop-agent-while-processing
prerequisites:
  - T-add-cancellation-support-to
affectedFiles:
  src/views/ChatView.ts: Added isProcessing, sendButton, stopButton class fields.
    Promoted local sendButton to class field. Created hidden stop button with
    square icon and click handler that calls plugin.cancelCurrentProcessing()
    with isProcessing guard. Added setProcessingState(processing) method to
    toggle send/stop button visibility and manage typing indicator. Updated
    showTypingIndicator() to call setProcessingState(true). Replaced
    hideTypingIndicator() calls with setProcessingState(false) in response
    callback and error handler. Added cleanup of new fields in onClose().
  styles.css: "Added .smarthole-chat-stop styles: 40x40 flex-centered button with
    var(--text-error) background, var(--text-on-accent) icon color,
    brightness(1.1) hover effect, scale(0.95) active state, and 18x18 SVG
    sizing. Matches send button dimensions and positioning."
log:
  - "Research complete. Verified: ChatView.ts (589 lines), styles.css (263
    lines), cancelCurrentProcessing() exists on plugin (main.ts:270). Beginning
    implementation."
  - "Added stop button UI to ChatView that appears when the agent is processing,
    replacing the send button. The stop button uses Obsidian's \"square\" Lucide
    icon with destructive red styling (var(--text-error)). Clicking it calls
    plugin.cancelCurrentProcessing() and returns the UI to the ready state via
    setProcessingState(false). The implementation includes: (1) three new class
    fields (isProcessing, sendButton, stopButton), (2) promotion of the local
    sendButton variable to a class field, (3) a new setProcessingState() method
    that toggles button visibility and manages typing indicator, (4) integration
    with showTypingIndicator() to automatically enter processing state, (5)
    replacement of hideTypingIndicator() calls with setProcessingState(false) in
    response and error handlers, (6) proper cleanup in onClose(), and (7) CSS
    styles matching the send button dimensions with error-colored background.
    The guard check (if !this.isProcessing return) in the stop button click
    handler prevents redundant cancellation calls."
schema: v1.0
childrenIds: []
created: 2026-02-05T20:14:18.084Z
updated: 2026-02-05T20:14:18.084Z
---

# Add Stop Button UI to ChatView with Styles

## Purpose
Add a stop button to the ChatView input area that appears when the agent is processing, replacing the send button. Clicking it cancels the in-flight LLM request and returns the UI to the ready state.

## Files to Modify

### `src/views/ChatView.ts`

**Change 1: Add class fields for processing state and button references (after line 29, near other private fields)**
```typescript
private isProcessing = false;
private sendButton: HTMLButtonElement | null = null;
private stopButton: HTMLButtonElement | null = null;
```

**Change 2: Refactor `sendButton` from local variable to class field (line 83)**
Change the local variable declaration:
```typescript
// Before:
const sendButton = inputArea.createEl("button", { cls: "smarthole-chat-send" });
setIcon(sendButton, "send");

// After:
this.sendButton = inputArea.createEl("button", { cls: "smarthole-chat-send" });
setIcon(this.sendButton, "send");
```
Also update the click handler reference (line 99):
```typescript
// Before:
sendButton.addEventListener("click", () => {
// After:
this.sendButton.addEventListener("click", () => {
```

**Change 3: Create stop button after the send button (after the send button creation, around line 84)**
```typescript
this.stopButton = inputArea.createEl("button", { cls: "smarthole-chat-stop" });
setIcon(this.stopButton, "square");
this.stopButton.style.display = "none"; // Hidden by default

this.stopButton.addEventListener("click", () => {
  this.plugin.cancelCurrentProcessing();
  this.setProcessingState(false);
});
```

**Change 4: Add `setProcessingState()` private method (after `hideTypingIndicator()` at line 273)**
```typescript
/**
 * Update the processing state, toggling between send and stop buttons.
 * When processing starts: shows stop button, hides send button.
 * When processing ends: shows send button, hides stop button, hides typing indicator.
 */
private setProcessingState(processing: boolean): void {
  this.isProcessing = processing;

  if (this.sendButton) {
    this.sendButton.style.display = processing ? "none" : "flex";
  }
  if (this.stopButton) {
    this.stopButton.style.display = processing ? "flex" : "none";
  }

  if (!processing) {
    this.hideTypingIndicator();
  }
}
```

**Change 5: Update `showTypingIndicator()` to also set processing state (line 260)**
Add `this.setProcessingState(true)` call. But be careful about infinite recursion -- `setProcessingState(false)` calls `hideTypingIndicator()`, but `showTypingIndicator()` calling `setProcessingState(true)` does NOT call `hideTypingIndicator()`, so there is no cycle. Update:
```typescript
showTypingIndicator(): void {
  if (!this.messagesEl || this.typingEl) return;

  this.typingEl = this.messagesEl.createEl("div", { cls: "smarthole-chat-typing" });
  this.typingEl.setText("Thinking...");
  this.scrollToBottom();
  this.setProcessingState(true);
}
```

**Change 6: Replace `this.hideTypingIndicator()` calls with `this.setProcessingState(false)` in three locations:**

Location 1 -- Response callback (line 166):
```typescript
// Before:
this.hideTypingIndicator();
// After:
this.setProcessingState(false);
```

Location 2 -- Error handler in send callback (line 210):
```typescript
// Before:
this.hideTypingIndicator();
// After:
this.setProcessingState(false);
```

Location 3 -- Note: The `showTypingIndicator()` method at line 205 in the send callback does NOT need changing. It already calls `showTypingIndicator()` which will now call `setProcessingState(true)` internally.

**Change 7: Clean up button references in `onClose()` (after line 237)**
Add cleanup for the new fields:
```typescript
this.sendButton = null;
this.stopButton = null;
this.isProcessing = false;
```

### `styles.css`

**Change 1: Add stop button styles (after `.smarthole-chat-send svg` at line 195)**
```css
/* Stop button - same dimensions as send, destructive color */
.smarthole-chat-stop {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 0;
  border: none;
  border-radius: var(--radius-s);
  background-color: var(--text-error);
  color: var(--text-on-accent);
  cursor: pointer;
  transition: background-color 0.15s ease;
  flex-shrink: 0;
}

.smarthole-chat-stop:hover {
  filter: brightness(1.1);
}

.smarthole-chat-stop:active {
  transform: scale(0.95);
}

.smarthole-chat-stop svg {
  width: 18px;
  height: 18px;
}
```
Design rationale:
- Same dimensions (40x40), border-radius, centering, and SVG size as `.smarthole-chat-send`
- Uses `var(--text-error)` for the background color -- this is Obsidian's standard error/destructive color variable (typically red)
- Uses `var(--text-on-accent)` for the icon color for contrast
- Hover uses `filter: brightness(1.1)` instead of a specific variable since there is no `--text-error-hover` variable in Obsidian
- Active state with `scale(0.95)` matches the send button pattern

## Important Implementation Notes

### Button Toggle Pattern
The send and stop buttons occupy the same position in the input area. Only one is visible at a time, toggled via `display: none` vs `display: flex`. This is simpler than adding/removing DOM elements and avoids layout shifts.

### Event Flow
1. User sends message -> `handleSend()` -> `onSendCallback()` -> `showTypingIndicator()` -> `setProcessingState(true)` -> stop button appears
2. Response arrives -> response callback -> `setProcessingState(false)` -> send button reappears
3. User clicks stop -> `cancelCurrentProcessing()` + `setProcessingState(false)` -> send button reappears immediately
4. Error occurs -> error handler -> `setProcessingState(false)` -> send button reappears

### Race Condition Notes
If the user clicks stop and a response callback fires at nearly the same time:
- `setProcessingState(false)` is idempotent -- calling it twice just sets the same state
- `cancelCurrentProcessing()` is a no-op if processing already completed
- The response callback will still call `addMessage()` and `setProcessingState(false)` regardless of whether stop was clicked, which is correct behavior

### Obsidian Icon
The `setIcon(element, "square")` call uses Obsidian's built-in Lucide icon set. The "square" icon (a filled/outlined square) is the standard "stop" affordance in media player UIs.

## Acceptance Criteria
- [ ] Stop button (square icon) appears when "Thinking..." indicator is shown
- [ ] Send button is hidden while processing
- [ ] Clicking stop calls `plugin.cancelCurrentProcessing()`
- [ ] After clicking stop: typing indicator disappears, send button reappears, stop button hides
- [ ] UI returns to ready state after normal response completion
- [ ] UI returns to ready state after error
- [ ] Stop button has appropriate destructive-action styling (red-toned)
- [ ] Stop button is not visible when not processing
- [ ] Rapid start/stop sequences don't cause race conditions or broken UI state