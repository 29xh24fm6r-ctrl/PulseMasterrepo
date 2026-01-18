
# Pulse Window Presence Verification

## Pre-requisites
1. Application running locally.
2. Logged in user.

## Verification Steps (Manual)

### 1. Global Presence
- [ ] Open the application dashboard (desktop width > 1280px).
- [ ] Observe the Pulse sidebar on the right.
- [ ] **Check:** Does the header show a green dot and "LIVE" status?
- [ ] **Check:** Does the "Context" section show the current route (e.g. `/` or `/tasks`)?

### 2. Navigation Awareness
- [ ] Navigate to a different page (e.g. `/achievements`).
- [ ] **Check:** Does the "Context" in the sidebar update immediately?
- [ ] **Check:** Is the status still "LIVE"?

### 3. Pop-out Persistence
- [ ] Click "Pop out" in the sidebar header.
- [ ] A new window (`/pulse/companion`) should open.
- [ ] **Check:** Does this new window also show the green "LIVE" dot?
- [ ] Navigate in the MAIN window.
- [ ] **Check:** Does the POP-OUT window update its context to match the main window?

### 4. Code Integrity
- [ ] Confirmed `PulseContextTracker` is mounted in `app/layout.tsx`.
- [ ] Confirmed `PulseCompanionShell` listens to `pulse_context_bus_v1`.
- [ ] Confirmed no errors in console related to `usePulseContext`.

## Success Criteria
- [ ] **Pulse is always present**: Sidebar or Pop-out is always visible.
- [ ] **Pulse is always aware**: Context updates automatically on navigation.
- [ ] **Pulse is connected**: Status indicator confirms active link.
