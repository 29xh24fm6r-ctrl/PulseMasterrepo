import "server-only";
import { z } from "zod";

/**
 * Golden Path test request contract
 */
export const GoldenPathRequest = z.object({
  scenario: z.enum(["all", "success", "retry", "sla"]).default("all"),
});

export type GoldenPathRequest = z.infer<typeof GoldenPathRequest>;

/**
 * Golden Path test response contract
 */
export const GoldenPathResponse = z.object({
  ok: z.literal(true),
  results: z.array(
    z.object({
      scenario: z.string(),
      ok: z.boolean(),
      steps: z.record(z.any()).optional(),
      error: z.string().optional(),
    })
  ),
});

export type GoldenPathResponse = z.infer<typeof GoldenPathResponse>;

/**
 * Scheduler health tick request contract
 */
export const RunHealthRequest = z.object({
  // Optional future params can be added here
}).optional().default({});

export type RunHealthRequest = z.infer<typeof RunHealthRequest>;

/**
 * Scheduler health tick response contract
 */
export const RunHealthResponse = z.object({
  ok: z.literal(true),
  ran: z.boolean().optional(),
  healthSnapshot: z.boolean().optional(),
  slaEscalation: z.boolean().optional(),
  providerHealth: z.boolean().optional(),
  summary: z.any().optional(),
});

export type RunHealthResponse = z.infer<typeof RunHealthResponse>;

