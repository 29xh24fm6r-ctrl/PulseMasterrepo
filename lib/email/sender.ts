import { Resend } from "resend";

/**
 * Canonical outbound email sender.
 * - Provider-agnostic API
 * - Normalized errors
 * - Optional reply/thread headers
 */

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;

  /**
   * Optional reply/thread headers.
   * These are best-effort and provider-dependent.
   */
  inReplyTo?: string; // message-id being replied to (raw value, usually includes <>)
  references?: string[]; // chain of message-ids
};

export type SendEmailResult = {
  provider: "resend";
  provider_message_id: string;
};

export type NormalizedSendError = {
  code:
    | "auth_failed"
    | "invalid_to"
    | "invalid_from"
    | "rate_limited"
    | "provider_down"
    | "rejected"
    | "unknown";
  message: string;
  provider?: string;
  raw?: unknown;
};

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`missing_env:${name}`);
  return v;
}

function safeBool(v: string | undefined, fallback = false) {
  if (!v) return fallback;
  return ["1", "true", "yes", "on"].includes(v.toLowerCase());
}

function normalizeResendError(err: unknown): NormalizedSendError {
  // Resend may throw { name, message, statusCode } or return errors on response.
  const anyErr = err as any;

  const status: number | undefined =
    typeof anyErr?.statusCode === "number" ? anyErr.statusCode : undefined;

  const msg =
    typeof anyErr?.message === "string" ? anyErr.message : "Email provider error";

  // heuristic mappings
  if (status === 401 || status === 403) {
    return { code: "auth_failed", message: msg, provider: "resend", raw: err };
  }
  if (status === 429) {
    return { code: "rate_limited", message: msg, provider: "resend", raw: err };
  }
  if (status && status >= 500) {
    return { code: "provider_down", message: msg, provider: "resend", raw: err };
  }

  // Common invalid addressing text patterns
  const lower = msg.toLowerCase();
  if (lower.includes("to") && (lower.includes("invalid") || lower.includes("malformed"))) {
    return { code: "invalid_to", message: msg, provider: "resend", raw: err };
  }
  if (lower.includes("from") && (lower.includes("invalid") || lower.includes("not verified"))) {
    return { code: "invalid_from", message: msg, provider: "resend", raw: err };
  }
  if (lower.includes("rejected") || lower.includes("blocked") || lower.includes("denied")) {
    return { code: "rejected", message: msg, provider: "resend", raw: err };
  }

  return { code: "unknown", message: msg, provider: "resend", raw: err };
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const realSendEnabled = safeBool(process.env.EMAIL_REAL_SEND_ENABLED, false);
  if (!realSendEnabled) {
    // Hard stop: prevents accidental real email sends.
    throw <NormalizedSendError>{
      code: "rejected",
      message: "Real sending is disabled (EMAIL_REAL_SEND_ENABLED=false).",
      provider: "resend",
    };
  }

  const apiKey = requireEnv("RESEND_API_KEY");
  const from = requireEnv("EMAIL_FROM");

  const resend = new Resend(apiKey);

  // Reply/thread headers are best-effort.
  // Resend supports "headers" on send calls.
  const headers: Record<string, string> = {};
  if (input.inReplyTo) headers["In-Reply-To"] = input.inReplyTo;
  if (input.references?.length) headers["References"] = input.references.join(" ");

  try {
    const resp = await resend.emails.send({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      headers: Object.keys(headers).length ? headers : undefined,
    });

    // Resend returns { id: string } on success.
    const provider_message_id = (resp as any)?.id;
    if (!provider_message_id) {
      throw new Error("resend_no_message_id");
    }

    return {
      provider: "resend",
      provider_message_id,
    };
  } catch (err) {
    throw normalizeResendError(err);
  }
}

// Legacy function name for backward compatibility with tick route
export async function sendEmailViaProvider(input: {
  to_email: string;
  subject: string;
  body_text: string;
  email_thread_id?: string;
}): Promise<{ provider: string; provider_message_id?: string | null }> {
  // Convert body_text to HTML (simple plaintext wrapper)
  const html = input.body_text.replace(/\n/g, "<br>\n");

  const result = await sendEmail({
    to: input.to_email,
    subject: input.subject,
    html,
    text: input.body_text,
  });

  return {
    provider: result.provider,
    provider_message_id: result.provider_message_id,
  };
}
