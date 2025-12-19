import "server-only";

type LogLevel = "debug" | "info" | "warn" | "error";

type LogFields = Record<string, unknown>;

function base(level: LogLevel, message: string, fields?: LogFields) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    message,
    ...fields,
  };
  // single-line JSON for log drains
  // eslint-disable-next-line no-console
  console[level === "debug" ? "log" : level](JSON.stringify(payload));
}

export const log = {
  debug: (message: string, fields?: LogFields) => base("debug", message, fields),
  info: (message: string, fields?: LogFields) => base("info", message, fields),
  warn: (message: string, fields?: LogFields) => base("warn", message, fields),
  error: (message: string, fields?: LogFields) => base("error", message, fields),
};

