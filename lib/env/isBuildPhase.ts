export function isBuildPhase(): boolean {
    return (
        process.env.NEXT_PHASE === "phase-production-build" ||
        process.env.NEXT_PHASE === "phase-export" ||
        process.env.CI === "true"
    );
}
