import * as Sentry from "@sentry/nextjs";

export function sentrySetUser(userId?: string | null) {
    if (!userId) return;
    Sentry.setUser({ id: userId });
}
