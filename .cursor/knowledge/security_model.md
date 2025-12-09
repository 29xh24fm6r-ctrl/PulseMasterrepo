# Security Model

## User-Owned Data Vault

- All data belongs to the user.
- Users can export everything at any time.
- Pulse cannot access private data without consent.

## Architecture

- Supabase Row-Level Security on all tables.
- Edge Functions enforce scoped access.
- Client-side AES-256 encryption for journals/emotion data (future phase).
- Data separation per-user ensured in all queries.

## Principles

1. Privacy by design.
2. No dark patterns.
3. Clear consent for data capture.
4. Secure storage across all layers.
