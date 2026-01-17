#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

echo "CI Gate: forbid module-scope SDK constructors/imports"

# Allow ONLY these files to import SDK constructors directly:
ALLOW_OPENAI_IMPORT_REGEX='^services/ai/openai\.ts$'
ALLOW_RESEND_IMPORT_REGEX='^services/email/resend\.ts$'

fail=0

# 1) Forbid importing OpenAI SDK anywhere except services/ai/openai.ts
while IFS= read -r line; do
  file="${line%%:*}"
  if [[ ! "$file" =~ $ALLOW_OPENAI_IMPORT_REGEX ]]; then
    echo "❌ Forbidden OpenAI SDK import: $line"
    fail=1
  fi
done < <(git grep -nE 'from ["'\'']openai["'\'']' -- '*.ts' '*.tsx' || true)

# 2) Forbid `new OpenAI(` anywhere except services/ai/openai.ts
while IFS= read -r line; do
  file="${line%%:*}"
  if [[ ! "$file" =~ $ALLOW_OPENAI_IMPORT_REGEX ]]; then
    echo "❌ Forbidden OpenAI constructor: $line"
    fail=1
  fi
done < <(git grep -nE 'new[[:space:]]+OpenAI[[:space:]]*\(' -- '*.ts' '*.tsx' || true)

# 3) Forbid Resend SDK imports anywhere except services/email/resend.ts
while IFS= read -r line; do
  file="${line%%:*}"
  if [[ ! "$file" =~ $ALLOW_RESEND_IMPORT_REGEX ]]; then
    echo "❌ Forbidden Resend SDK import: $line"
    fail=1
  fi
done < <(git grep -nE 'from ["'\'']resend["'\'']' -- '*.ts' '*.tsx' || true)

# 4) Forbid `new Resend(` anywhere except services/email/resend.ts
while IFS= read -r line; do
  file="${line%%:*}"
  if [[ ! "$file" =~ $ALLOW_RESEND_IMPORT_REGEX ]]; then
    echo "❌ Forbidden Resend constructor: $line"
    fail=1
  fi
done < <(git grep -nE 'new[[:space:]]+Resend[[:space:]]*\(' -- '*.ts' '*.tsx' || true)

if [[ "$fail" -ne 0 ]]; then
  echo ""
  echo "CI Gate failed: SDK constructors/imports must be centralized in factories."
  exit 1
fi

echo "✅ CI Gate passed"
