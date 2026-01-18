# Pulse Context Export Verification

## Pre-requisites
- App running locally.
- Pulse Window visible.

## Verification Checklist

### 1. Button Visibility
- [ ] Inspect Pulse Window header.
- [ ] **Check:** Is there a "Share" button (text or icon) visible?
- [ ] **Check:** Is it unobtrusive?

### 2. Export Functionality
- [ ] Click "Share".
- [ ] **Check:** Do you see a brief "Copied" confirmation (or button text change)?
- [ ] **Check:** No errors in console.

### 3. Content Validation
- [ ] Paste the clipboard content into a text editor.
- [ ] **Check:** Does it start with "Pulse Context Snapshot"?
- [ ] **Check:** Is the "Viewing" field correct?
- [ ] **Check:** Are "Recent Actions" populated (e.g. click logs)?
- [ ] **Check:** Is "System Response" accurate (e.g. "No active run")?

## Acceptance
- [ ] The export is clean, plain text.
- [ ] Contains all info needed to debug/reason without asking the user.
