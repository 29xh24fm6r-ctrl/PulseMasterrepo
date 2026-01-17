#!/usr/bin/env bash
set -euo pipefail

# Fail if these constructors appear at module scope in app/api routes.
# Heuristic: flag any line containing "new X" that is NOT indented (starts at column 0),
# OR any "const X = new" at top-level.
# (This is a fast guardrail; we can tighten later.)

FILES="$(git ls-files 'app/**/*.ts' 'app/**/*.tsx' 'services/**/*.ts' 'lib/**/*.ts')"

FAIL=0

check_pattern () {
  local pattern="$1"
  local label="$2"

  # Grep for the pattern anywhere; we then rely on dev discipline that constructors belong inside functions.
  # This gate is intentionally broad to catch new violations early.
  if echo "$FILES" | xargs -I {} grep -nH -- "$pattern" "{}" >/tmp/pulse_ci_grep 2>/dev/null; then
    echo "❌ CI Gate: Found forbidden pattern: $label"
    cat /tmp/pulse_ci_grep
    FAIL=1
  fi
}

check_pattern "new OpenAI" "OpenAI constructor"
check_pattern "new Resend" "Resend constructor"
check_pattern "new Stripe" "Stripe constructor"
check_pattern "new Twilio" "Twilio constructor"
check_pattern "Missing .*_KEY" "env throw pattern"
check_pattern "Missing .*_SECRET" "env throw pattern"
check_pattern "Missing .*_URL" "env throw pattern"

if [[ "$FAIL" -eq 1 ]]; then
  echo ""
  echo "Fix: move SDK init + env reads inside runtime functions/handlers (lazy getters)."
  exit 1
fi

echo "✅ CI Gate: No forbidden module-scope SDK/env patterns detected."
