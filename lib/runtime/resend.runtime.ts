import { Resend } from "resend";
import { assertRuntimeOnly } from "@/lib/env/runtime-phase";

let _client: Resend | null = null;

export function getResendRuntime() {
    assertRuntimeOnly("Resend");
    if (_client) return _client;

    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("Missing env var: RESEND_API_KEY");

    _client = new Resend(key);
    return _client;
}
