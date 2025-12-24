export type FailureClass = {
  failure_code:
    | "invalid_mailbox"
    | "invalid_domain"
    | "invalid_address"
    | "auth_failed"
    | "rate_limited"
    | "provider_down"
    | "rejected"
    | "unknown";
  fixable: boolean;
};

export function classifySendFailure(input: { code?: string; message?: string }): FailureClass {
  const msg = (input.message || "").toLowerCase();
  const code = (input.code || "").toLowerCase();

  if (code === "auth_failed" || msg.includes("unauthorized") || msg.includes("forbidden")) {
    return { failure_code: "auth_failed", fixable: false };
  }
  if (code === "rate_limited" || msg.includes("rate") && msg.includes("limit")) {
    return { failure_code: "rate_limited", fixable: false };
  }
  if (code === "provider_down" || msg.includes("timeout") || msg.includes("temporarily unavailable")) {
    return { failure_code: "provider_down", fixable: false };
  }
  if (code === "rejected" || msg.includes("rejected") || msg.includes("blocked") || msg.includes("denied")) {
    return { failure_code: "rejected", fixable: false };
  }

  if (msg.includes("no such user") || msg.includes("mailbox unavailable") || msg.includes("user unknown")) {
    return { failure_code: "invalid_mailbox", fixable: false };
  }

  if (msg.includes("domain") && (msg.includes("not found") || msg.includes("does not exist") || msg.includes("nxdomain"))) {
    return { failure_code: "invalid_domain", fixable: true };
  }

  if (msg.includes("invalid") && msg.includes("address")) {
    return { failure_code: "invalid_address", fixable: true };
  }

  return { failure_code: "unknown", fixable: false };
}
