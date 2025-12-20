// lib/simulation/server/log.ts
import "server-only";

export interface SimLogMeta {
  requestId: string;
  userId?: string;
  mode?: string;
  [key: string]: any;
}

export function simLog(requestId: string) {
  const prefix = `[Simulation:${requestId}]`;
  
  return {
    info: (msg: string, meta: Record<string, any> = {}) => {
      console.log(`${prefix} INFO: ${msg}`, meta);
    },
    warn: (msg: string, meta: Record<string, any> = {}) => {
      console.warn(`${prefix} WARN: ${msg}`, meta);
    },
    error: (msg: string, meta: Record<string, any> = {}) => {
      console.error(`${prefix} ERROR: ${msg}`, meta);
    },
  };
}

export function makeRequestId(): string {
  // short, sortable enough for logs
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

