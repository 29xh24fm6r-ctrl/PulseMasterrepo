import "server-only";

/**
 * Use this when the UI expects a 200 + JSON shape and will crash/toast on 501/4xx.
 * Still explicitly marks the response as compat + not implemented.
 */
export function compatOk(data: Record<string, any> = {}) {
    return Response.json(
        {
            ok: true,
            compat: true,
            not_implemented: true,
            ...data,
        },
        { status: 200 }
    );
}

/**
 * Standard strict shim: use when callers can handle 501 cleanly.
 */
export function compat501(data: Record<string, any> = {}) {
    return Response.json(
        {
            ok: false,
            compat: true,
            error: "not_implemented",
            message: "This endpoint is a compatibility shim and is not implemented yet.",
            ...data,
        },
        { status: 501 }
    );
}
