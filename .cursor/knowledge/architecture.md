# Pulse OS Architecture Overview

## High-Level Structure

### Frontend
- Next.js 16 App Router.
- Server components are default.
- Client components only where interactive UI is required.
- Layouts define Life Dashboard, Weekly Dashboard, Coaching interfaces.

### Backend / API
- API routes under `app/api/*`.
- Organized by functional domains:
  - `/api/memory`
  - `/api/coach`
  - `/api/dashboard`
  - `/api/identity`
  - `/api/butler`
  - `/api/email`
  - `/api/xp`

### Database (Supabase)
Core tables:
- `users`
- `memory_items`
- `memory_embeddings`
- `xp_ledger`
- `identity_profiles`
- `relationships`
- `email_intelligence`
- `butler_campaigns`
- `philosophy_progress`

Edge Functions:
- Memory compression
- Daily summary creation
- Weekly recap generation

### Key Architectural Principles

1. **Composable UI** — all dashboard widgets must be components.
2. **Separation of Concerns** — business logic never sits in React components.
3. **LLM Abstraction** — all models use a central wrapper for consistency.
4. **Event-Driven** — user actions → memory items → XP → insights.
5. **Multi-Modal Input** — text, voice, file upload, page scraping.

---

# System Map

Front Door → Dashboard → Modules → Coaches → Memory → XP → Identity → Life Evolution
