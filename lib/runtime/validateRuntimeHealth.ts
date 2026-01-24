/**
 * Runtime Health Validator
 *
 * Defensive checks to catch auth issues before they cascade
 *
 * Usage: Call from middleware or app layout to verify runtime health
 */

export interface RuntimeHealthCheck {
  pass: boolean;
  issues: string[];
  warnings: string[];
}

/**
 * Validates that runtime auth configuration is correct
 *
 * CRITICAL: Catches the apex/www split and Clerk config issues
 */
export function validateRuntimeHealth(): RuntimeHealthCheck {
  const issues: string[] = [];
  const warnings: string[] = [];

  // 1. Check: Canonical host enforcement
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;

    if (hostname === 'pulselifeos.com') {
      issues.push('CRITICAL: Running on apex domain (pulselifeos.com), should be www.pulselifeos.com');
      issues.push('ACTION: Check vercel.json redirect is deployed');
    }

    if (!hostname.includes('localhost') && !hostname.includes('vercel.app') && hostname !== 'www.pulselifeos.com') {
      warnings.push(`Unexpected hostname: ${hostname}`);
    }
  }

  // 2. Check: Clerk publishable key matches environment
  const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!clerkKey) {
    issues.push('CRITICAL: NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY not set');
  } else {
    // Verify preview deployments don't have production keys
    const isPreview = process.env.VERCEL_ENV === 'preview';
    const isProductionKey = clerkKey.includes('prod');

    if (isPreview && isProductionKey) {
      issues.push('CRITICAL: Production Clerk key on preview deployment');
      issues.push('ACTION: Check CLERK_DISABLED in middleware');
    }
  }

  // 3. Check: Runtime auth policy matches environment
  const vercelEnv = process.env.VERCEL_ENV;
  const isCI = process.env.CI === 'true';

  if (vercelEnv === 'preview' && !isCI) {
    // Preview should bypass auth
    warnings.push('Preview deployment - auth should be bypassed');
  }

  // 4. Check: Required env vars
  const requiredEnvVars = [
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    'CLERK_SECRET_KEY',
  ];

  requiredEnvVars.forEach(envVar => {
    if (!process.env[envVar] && !isCI && vercelEnv !== 'preview') {
      warnings.push(`Missing env var: ${envVar}`);
    }
  });

  return {
    pass: issues.length === 0,
    issues,
    warnings,
  };
}

/**
 * Logs runtime health check results to console
 * Call this on app startup to catch issues early
 */
export function logRuntimeHealth() {
  const health = validateRuntimeHealth();

  if (!health.pass) {
    console.error('🚨 RUNTIME HEALTH CHECK FAILED:');
    health.issues.forEach(issue => console.error(`  ❌ ${issue}`));
  }

  if (health.warnings.length > 0) {
    console.warn('⚠️  RUNTIME HEALTH WARNINGS:');
    health.warnings.forEach(warning => console.warn(`  ⚠️  ${warning}`));
  }

  if (health.pass && health.warnings.length === 0) {
    console.log('✅ Runtime health check passed');
  }

  return health;
}
