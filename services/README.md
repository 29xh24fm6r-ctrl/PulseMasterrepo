# Services Directory

**Rule: `services/` = IO / External Systems**

This directory contains integrations with external services and third-party APIs (Stripe, Twilio, Email, etc.).
All code that performs I/O or calls external networks should live here.

**Rule: `lib/` = Pure Utilities**
The `lib/` directory should contain pure utility functions, shared types, and internal logic that does not directly interact with external systems.

**Legacy Exceptions:**
* `lib/supabase.ts` - Maintains Supabase client initialization. (Authorized exception due to high reference count).
