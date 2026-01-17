export type RuntimePhase = "build" | "runtime";

export function getRuntimePhase(): RuntimePhase {
    if (process.env.NEXT_PHASE === "phase-production-build") return "build";

    const argv = process.argv.join(" ");
    if (argv.includes("next") && argv.includes("build")) return "build";

    if (process.env.CI === "true") return "build";

    return "runtime";
}

export function assertRuntimeOnly(name: string): void {
    if (getRuntimePhase() === "build") {
        throw new Error(
            `[RUNTIME VIOLATION] ${name} accessed during build phase`
        );
    }
}
