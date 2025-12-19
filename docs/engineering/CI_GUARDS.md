# CI Guards

Pulse uses automated CI guards to enforce architectural rules and prevent regressions.

## Available Guards

### `guard:no-service-role`
Prevents service role key leakage in client code.

```bash
npm run guard:no-service-role
```

### `guard:no-notion-runtime`
Prevents Notion runtime usage in production code.

```bash
npm run guard:no-notion-runtime
```

### `guard:user-id-uuid`
Enforces UUID `user_id` usage (canonical ownership).

```bash
npm run guard:user-id-uuid
```

### `guard:no-internal-http` (NEW)
Detects internal HTTP calls in server routes.

```bash
npm run guard:no-internal-http
```

**Purpose**: Enforces the architectural rule that server routes must NOT call other server routes via HTTP.

**See**: `docs/ARCHITECTURE_RULES.md`

## Run All Guards

```bash
npm run guard
```

This runs all guards in sequence and fails if any violation is detected.

## Integration with CI/CD

Add to your CI pipeline:

```yaml
# .github/workflows/ci.yml (example)
- name: Run guards
  run: npm run guard
```

## Adding New Guards

1. Create guard script in `scripts/guards/guard-[name].js`
2. Add script to `package.json`:
   ```json
   "guard:[name]": "node scripts/guards/guard-[name].js"
   ```
3. Add to `guard` script chain
4. Document in this file

## Guard Script Template

```javascript
#!/usr/bin/env node
/**
 * CI Guard: [Description]
 * 
 * Usage:
 *   npm run guard:[name]
 * 
 * Exit codes:
 *   0 = No violations found
 *   1 = Violations found (CI should fail)
 */

const fs = require("fs");
const path = require("path");

// ... guard logic ...

function main() {
  // ... scan and detect violations ...
  
  if (VIOLATIONS.length === 0) {
    console.log("✅ No violations detected.\n");
    process.exit(0);
  }

  console.error(`❌ Found ${VIOLATIONS.length} violation(s):\n`);
  // ... report violations ...
  process.exit(1);
}

main();
```

