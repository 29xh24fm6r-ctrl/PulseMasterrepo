export type DelegationDenialSignal = {
    code: 'DELEGATION_NOT_FOUND' | 'DELEGATION_SCOPE_VIOLATION' | 'DELEGATION_REVOKED';
    scope?: string;
    target_principal_id?: string; // If known from the failed call
    context_path?: string;
};

export function isDelegationError(err: any): boolean {
    if (!err) return false;
    const msg = typeof err === 'string' ? err : err.message || err.code;
    return (
        msg.includes('DelegationNotFound') ||
        msg.includes('DelegationScopeViolation') ||
        msg.includes('DelegationRevoked') ||
        // Also check standard Postgres/RLS error codes if they map to denials
        msg.includes('PGRST116') // sometimes RLS silent fail looks like this (0 rows)
    );
}

export function toDenialSignal(err: any, context?: { scope?: string, target?: string, path?: string }): DelegationDenialSignal | null {
    if (!isDelegationError(err)) return null;

    // Naive classification for now - can be enriched with specific error types later
    let code: DelegationDenialSignal['code'] = 'DELEGATION_NOT_FOUND';
    const msg = (err.message || '').toLowerCase();

    if (msg.includes('scope')) code = 'DELEGATION_SCOPE_VIOLATION';
    if (msg.includes('revoked')) code = 'DELEGATION_REVOKED';

    return {
        code,
        scope: context?.scope,
        target_principal_id: context?.target,
        context_path: context?.path
    };
}
