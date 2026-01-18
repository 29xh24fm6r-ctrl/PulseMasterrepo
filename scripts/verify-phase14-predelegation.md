# Phase 14 Manual Verification: Predictive Pre-Delegation

## 1. Setup
- Ensure you are logged into Pulse.
- Navigate to `/calendar` (or any route triggered by mock logic).

## 2. Verify "Silent by Default"
- Load the page.
- **Expectation**: No "Ready" card appears.
- **Expectation**: Avatar is "Idle" (Breathing slowly).

## 3. Verify "Opening" Trigger
- Click the "Copy for help" button OR Open "Behind the scenes".
- **Expectation**:
    - A "PreDelegationReadyCard" appears at the top of the scroll area.
    - Text: "I can make this easier."
    - Buttons: "Allow", "Not now".

## 4. Verify "Dismiss"
- Click "Not now".
- **Expectation**: Card disappears immediately.
- Reload page and trigger opening again.
- **Expectation**: Card DOES NOT appear (Dismissed).

## 5. Verify "Accept"
- Click "Allow" (if not dismissed).
- **Expectation**:
    - Card disappears.
    - Database `delegation_edges` updated.

## 6. Verify Rate Limiting
- **Expectation**: Card does NOT appear if shown > 3 times or within 10 mins.
