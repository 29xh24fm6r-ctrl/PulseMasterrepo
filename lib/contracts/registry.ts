import "server-only";
import { z } from "zod";
import { GoldenPathRequest, GoldenPathResponse } from "./admin-scheduler.contracts";
import { RunHealthRequest, RunHealthResponse } from "./admin-scheduler.contracts";

export type RouteContract = {
  id: string; // e.g. "POST /api/admin/scheduler/golden-path"
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string; // e.g. "/api/admin/scheduler/golden-path"
  // req can be null for GET/no-body
  req: z.ZodTypeAny | null;
  res: z.ZodTypeAny;
};

export const CONTRACTS: RouteContract[] = [
  {
    id: "POST /api/admin/scheduler/golden-path",
    method: "POST",
    path: "/api/admin/scheduler/golden-path",
    req: GoldenPathRequest,
    res: GoldenPathResponse,
  },
  {
    id: "POST /api/scheduler/run-health",
    method: "POST",
    path: "/api/scheduler/run-health",
    req: RunHealthRequest,
    res: RunHealthResponse,
  },
];

export const CONTRACT_IDS = new Set(CONTRACTS.map((c) => c.id));

