/**
 * BARRIER FILE
 *
 * This directory (lib/runtime) is the ONLY place where SDKs (Supabase, Stripe, etc.)
 * are allowed to be imported.
 *
 * All exports from this directory must be SAFE to import during build time,
 * but their retrieval functions must throw if called during build time.
 */
