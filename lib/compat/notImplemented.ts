import "server-only";

export function notImplemented(payload?: Record<string, any>) {
    return Response.json(
        {
            ok: false,
            error: "not_implemented",
            message: "This endpoint is a compatibility shim and is not implemented yet.",
            ...payload,
        },
        { status: 501 }
    );
}
