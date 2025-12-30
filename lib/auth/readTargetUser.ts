export function readTargetUserId(req: Request) {
    const url = new URL(req.url);
    // Admin-only override
    return url.searchParams.get("target_user_id");
}
