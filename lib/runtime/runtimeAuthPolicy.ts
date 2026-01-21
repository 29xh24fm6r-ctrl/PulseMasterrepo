// lib/runtime/runtimeAuthPolicy.ts

export type RuntimeAuthMode =
    | "required" // production + properly initialized auth
    | "optional" // local/dev where we may allow soft boot
    | "disabled"; // preview/CI/build where auth may not exist

export function getRuntimeAuthMode(): RuntimeAuthMode {
    // Vercel preview deployments frequently do not have Clerk initialized on the preview domain.
    // CI/build should also never hard-fail runtime endpoints.
    const vercelEnv = process.env.VERCEL_ENV; // "production" | "preview" | "development" (sometimes undefined)
    const isCI = process.env.CI === "true";
    const isPreview = vercelEnv === "preview";

    if (isCI || isPreview) return "disabled";

    // Optional: local development can be "optional" if you want runtime APIs to degrade gracefully
    // when developers forget to log in. If you want strict dev auth, set to "required".
    if (vercelEnv === "development") return "optional";

    return "required";
}

export function runtimeAuthIsRequired(): boolean {
    return getRuntimeAuthMode() === "required";
}
