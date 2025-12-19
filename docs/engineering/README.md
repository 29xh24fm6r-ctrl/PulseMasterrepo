# Pulse Engineering Documentation

This directory contains engineering standards, architectural rules, and operational documentation for Pulse OS.

## Core Documentation

### Architecture & Design Rules

- **[ARCHITECTURE_RULES.md](./ARCHITECTURE_RULES.md)** - Core architectural invariants and patterns
  - Server routes may NOT call other server routes via HTTP
  - Shared logic must live in `lib/` and be imported directly
  - Authentication and authorization patterns

### CI Guards & Enforcement

- **[CI_GUARDS.md](./CI_GUARDS.md)** - Automated code quality and security guards
  - No service role key leakage
  - No Notion runtime usage
  - UUID `user_id` enforcement
  - No internal HTTP between server routes

### Incident Reports & Fixes

- **[GOLDEN_PATH_404_FIX.md](./GOLDEN_PATH_404_FIX.md)** - Root cause analysis of Golden Path SLA escalation 404
  - Why internal HTTP calls are unsafe
  - Canonical solution pattern
  - Implementation details

- **[VIOLATIONS_FIXED.md](./VIOLATIONS_FIXED.md)** - Complete list of all 8 internal HTTP violations fixed
  - Each violation with file path and line number
  - Shared functions created
  - Verification status

- **[ENFORCEMENT_COMPLETE.md](./ENFORCEMENT_COMPLETE.md)** - Production readiness summary
  - All violations fixed
  - CI/CD integration complete
  - Guard status and verification

- **[PRODUCTION_READINESS.md](./PRODUCTION_READINESS.md)** - Production readiness checklist
  - All 5 checks completed
  - Verification commands
  - Next steps

- **[GITHUB_SETUP.md](./GITHUB_SETUP.md)** - GitHub branch protection setup guide
  - Step-by-step instructions
  - Required status checks
  - Troubleshooting

- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Production deployment guide
  - GitHub Environments setup
  - Vercel deploy hook configuration
  - Deployment workflows
  - Safety checks

- **[CONTRACTS.md](./CONTRACTS.md)** - API contract harness documentation
  - Zod schema validation
  - Request/response contracts
  - CI enforcement (strict mode)
  - Adding new contracts

- **[OBSERVABILITY.md](./OBSERVABILITY.md)** - Runtime observability guide
  - Request IDs
  - Structured logging
  - Route timing
  - Log aggregation

- **[MIGRATIONS.md](./MIGRATIONS.md)** - Database migration safety
  - Timestamped filenames
  - Schema change detection
  - Risky operation checks
  - CI enforcement

- **[BULLETPROOF_FOUNDATION.md](./BULLETPROOF_FOUNDATION.md)** - Complete foundation hardening summary
  - Contract strict mode
  - Runtime observability
  - Migration safety
  - All three sprints complete

- **[CONNECTIVITY_FIX.md](./CONNECTIVITY_FIX.md)** - Connectivity + orphan elimination pass
  - Fixed dead navigation links
  - Created missing pages and API routes
  - Fixed shape mismatches
  - Removed hardcoded API keys

- **[FEATURE_REGISTRY.md](./FEATURE_REGISTRY.md)** - Feature Registry + "No Page Left Behind"
  - Auto-generated from repo structure
  - Manual overrides for names/descriptions
  - Feature Hub UI for discovery
  - Health checks and orphan route detection
  - Settings landing page

## Quick Reference

### Running Guards Locally

```bash
# Run all guards
npm run guard

# Run specific guard
npm run guard:no-internal-http
npm run guard:no-service-role
npm run guard:user-id-uuid
npm run guard:no-notion-runtime
```

### Architectural Patterns

**✅ DO:**
- Extract shared logic to `lib/` modules
- Import server functions directly
- Use `"server-only"` directive in server modules
- Keep routes thin and declarative

**❌ DON'T:**
- Call internal API routes via HTTP from server code
- Duplicate business logic across routes
- Mix client and server code in shared modules

## Contributing

When adding new features or refactoring:

1. **Check guards first**: Run `npm run guard` before committing
2. **Follow patterns**: Review `ARCHITECTURE_RULES.md` for established patterns
3. **Update docs**: If you introduce new patterns or fix issues, document them here
4. **Test locally**: Ensure guards pass and TypeScript compiles

## Status

- ✅ All architectural rules documented
- ✅ All CI guards implemented and passing
- ✅ All known violations fixed
- ✅ Production-ready enforcement in place

