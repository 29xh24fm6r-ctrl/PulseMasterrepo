# Pulse Window UX Verification

## Pre-requisites
- App running locally.
- Pulse Window visible (Sidebar or Pop-out).

## Verification Checklist

### 1. Identity & Presence
- [ ] **Check:** Is the Pulse Avatar (Orb) visible in the header?
- [ ] **Check:** Does the header say "Pulse" with a dynamic subtitle (e.g. "Here with you")?
- [ ] **Check:** Is the old "Live" status dot integrated subtly (or replaced by the subtitle)?

### 2. Presence States (Visuals)
- **Idle State**:
    - [ ] Avatar glow is soft/slow.
    - [ ] Subtitle: "Here with you".
- **Engaged State**:
    - [ ] Click window. Avatar gets slightly brighter?
    - [ ] Subtitle: "Listening".
- **Active State**:
    - [ ] Avatar pulses/glows more actively (if triggerable).
    - [ ] Subtitle: "Thinking" or "Working".

### 3. "Calm" Audit (No Debug Noise)
- [ ] **Check:** "Share" button is now "Copy for help" (or similar).
- [ ] **Check:** NO raw telemetry or log lists visible by default.
- [ ] **Check:** "Recent Actions" or extra content is hidden behind a "Details" toggle.


### 3. "Calm" Audit (No Debug Noise)
- [ ] **Check:** No raw JSON dumps visible by default.
- [ ] **Check:** No "Event Log" scrolling rapidly by default (should be hidden or subtle).
- [ ] **Check:** Status text says "I'm here" or "Live" rather than "Socket Connected".

### 4. Pop-out Mirroring
- [ ] Open Pop-out.
- [ ] Navigate main app.
- [ ] **Check:** Pop-out header updates context label immediately.

## Acceptance
- [ ] Pulse feels like a **Companion**, not a **Debugger**.
- [ ] "Where am I?" is answered by the header.
- [ ] "Is it working?" is answered by the subtle "Live" dot.
