import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

export function env(name: string): string {
    const v = process.env[name];
    if (!v) throw new Error(`Missing env: ${name}`);
    return v;
}

export function envOptional(name: string): string | undefined {
    return process.env[name];
}
