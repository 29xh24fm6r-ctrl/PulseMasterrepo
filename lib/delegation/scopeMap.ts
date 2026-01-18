/**
 * Maps application routes to the Pulse Delegation Scope likely required to operate them fully.
 * Used to deterministically suggest delegations when user explicitly asks for help (Opening).
 */

const ROUTE_SCOPE_MAP: Record<string, string> = {
    '/calendar': 'calendar.read_write',
    '/calendar/day': 'calendar.read_write',
    '/calendar/week': 'calendar.read_write',
    '/calendar/month': 'calendar.read_write',
    '/mail': 'email.read_write',
    '/mail/inbox': 'email.read_write',
    '/tasks': 'tasks.read_write',
    '/contacts': 'contacts.read_write'
};

export function getLikelyScopeForPath(pathname: string): string | null {
    // Exact match
    if (ROUTE_SCOPE_MAP[pathname]) return ROUTE_SCOPE_MAP[pathname];

    // Prefix match (simple)
    for (const [route, scope] of Object.entries(ROUTE_SCOPE_MAP)) {
        if (pathname.startsWith(route)) return scope;
    }

    return null;
}
