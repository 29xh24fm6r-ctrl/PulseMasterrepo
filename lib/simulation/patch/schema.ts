// lib/simulation/patch/schema.ts

import { z } from "zod";

export const PatchOpSchema = z.object({
  op: z.enum(["upsert", "delete"]),
  path: z.string().min(1),
  // required for upsert
  content: z.string().optional(),
  // optional safety checks
  expected_sha256: z.string().optional(), // verify existing file hash before overwriting
  note: z.string().optional(),
});

export const PatchJsonSchema = z.object({
  version: z.literal("patch.v1"),
  summary: z.string().min(1).optional(),
  ops: z.array(PatchOpSchema).min(1),
});

export type PatchJson = z.infer<typeof PatchJsonSchema>;
export type PatchOp = z.infer<typeof PatchOpSchema>;

