// lib/obs/log.ts
// Sprint 4: Structured logging for observability
import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type LogLevel = "info" | "warn" | "error" | "debug";

export interface LogContext {
  user_id?: string;
  correlation_id?: string;
  job_id?: string;
  run_id?: string;
  action_id?: string;
  agent_id?: string;
  [key: string]: any;
}

/**
 * Structured logging for Pulse operations
 * 
 * All logs include:
 * - Timestamp
 * - Level
 * - Message
 * - Context (user_id, correlation_id, etc.)
 * - Error stack (if error)
 */
export class PulseLogger {
  private context: LogContext;

  constructor(context: LogContext = {}) {
    this.context = context;
  }

  /**
   * Create a child logger with additional context
   */
  child(additionalContext: LogContext): PulseLogger {
    return new PulseLogger({ ...this.context, ...additionalContext });
  }

  /**
   * Log an info message
   */
  info(message: string, data?: Record<string, any>) {
    this.log("info", message, data);
  }

  /**
   * Log a warning
   */
  warn(message: string, data?: Record<string, any>) {
    this.log("warn", message, data);
  }

  /**
   * Log an error
   */
  error(message: string, error?: Error | unknown, data?: Record<string, any>) {
    const errorData: Record<string, any> = { ...data };
    
    if (error instanceof Error) {
      errorData.error_message = error.message;
      errorData.error_stack = error.stack;
      errorData.error_name = error.name;
    } else if (error) {
      errorData.error = String(error);
    }

    this.log("error", message, errorData);
  }

  /**
   * Log a debug message (only in development)
   */
  debug(message: string, data?: Record<string, any>) {
    if (process.env.NODE_ENV === "development") {
      this.log("debug", message, data);
    }
  }

  /**
   * Internal log method
   */
  private log(level: LogLevel, message: string, data?: Record<string, any>) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...this.context,
      ...data,
    };

    // Console output (structured JSON)
    const output = JSON.stringify(logEntry);
    
    switch (level) {
      case "error":
        console.error(output);
        break;
      case "warn":
        console.warn(output);
        break;
      case "debug":
        console.debug(output);
        break;
      default:
        console.log(output);
    }

    // Optionally write to audit_log for critical operations
    // (This can be async and fire-and-forget to avoid blocking)
    if (level === "error" && this.context.user_id) {
      this.writeToAuditLog(level, message, data).catch((err) => {
        // Don't throw - logging failures shouldn't break the app
        console.error("Failed to write to audit log:", err);
      });
    }
  }

  /**
   * Write critical errors to audit_log
   */
  private async writeToAuditLog(
    level: LogLevel,
    message: string,
    data?: Record<string, any>
  ) {
    if (!this.context.user_id) return;

    try {
      await supabaseAdmin.from("audit_log").insert({
        user_id: this.context.user_id,
        action_type: "system_log",
        action: level,
        payload: {
          message,
          ...data,
        },
        source: "system",
        correlation_id: this.context.correlation_id,
      });
    } catch (err) {
      // Silent fail - don't break app if audit log fails
    }
  }
}

/**
 * Create a logger with context
 */
export function createLogger(context: LogContext = {}): PulseLogger {
  return new PulseLogger(context);
}

/**
 * Default logger (no context)
 */
export const logger = createLogger();

