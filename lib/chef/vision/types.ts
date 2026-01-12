import { z } from "zod";

export const ChefDetectedItemSchema = z.object({
    name: z.string().min(1),                 // raw name from model
    confidence: z.number().min(0).max(1),    // 0..1
    freshness: z.number().min(0).max(1).optional(), // 0..1 (optional)
    quantity_hint: z.string().optional(),    // e.g. "1 carton", "bunch", "leftovers"
});

export const ChefVisionResultSchema = z.object({
    location: z.enum(["fridge", "pantry"]),
    items: z.array(ChefDetectedItemSchema).max(200),
});

export type ChefVisionResult = z.infer<typeof ChefVisionResultSchema>;
export type ChefDetectedItem = z.infer<typeof ChefDetectedItemSchema>;
