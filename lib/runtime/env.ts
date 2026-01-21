export function isPreviewRuntime() {
    return (
        process.env.VERCEL_ENV === "preview" ||
        process.env.CI === "true" ||
        process.env.NODE_ENV === "test"
    );
}
