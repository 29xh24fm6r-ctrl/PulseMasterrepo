
export function isCiSmoke(): boolean {
    return process.env.CI === "true" && process.env.PULSE_SMOKE === "1";
}
