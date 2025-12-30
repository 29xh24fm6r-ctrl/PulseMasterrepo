import * as Sentry from "@sentry/nextjs";

export async function withJourney<T>(input: {
    area: string;
    feature: string;
    name: string; // e.g. "quests.claim"
    data?: Record<string, any>;
    run: () => Promise<T>;
}): Promise<T> {
    const { area, feature, name, data, run } = input;

    Sentry.addBreadcrumb({
        category: "pulse.journey",
        message: name,
        level: "info",
        data: data ?? {},
    });

    return await Sentry.startSpan(
        {
            name,
            op: "pulse.journey",
            attributes: {
                area,
                feature,
                ...(data ?? {}),
            },
        },
        async () => await run()
    );
}
