// lib/simulation/contracts.ts

import { z } from "zod";

/** Version your simulation API contract */
export const SIM_CONTRACT_VERSION = "v1" as const;

export const SimRunRequestSchema = z.object({
  contract_version: z.literal(SIM_CONTRACT_VERSION).default(SIM_CONTRACT_VERSION),
  mode: z.enum(["single", "all"]).default("all"),
  dealId: z.string().uuid().nullable().optional().default(null),
  pathIds: z.array(z.string().min(1)).nullable().optional().default(null),
  input: z.record(z.any()).nullable().optional().default({}),
});

export type SimRunRequest = z.infer<typeof SimRunRequestSchema>;

export const SimRunResponseSchema = z.object({
  ok: z.boolean(),
  contract_version: z.literal(SIM_CONTRACT_VERSION),
  request_id: z.string().min(8),
  result: z.any().optional(),
  error: z.string().optional(),
});

export type SimRunResponse = z.infer<typeof SimRunResponseSchema>;

export const SimScenarioSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  mode: z.enum(["single", "all"]),
  dealId: z.string().uuid().nullable().optional().default(null),
  pathIds: z.array(z.string().min(1)).nullable().optional().default(null),
  input: z.record(z.any()).optional().default({}),
});

export type SimScenario = z.infer<typeof SimScenarioSchema>;

