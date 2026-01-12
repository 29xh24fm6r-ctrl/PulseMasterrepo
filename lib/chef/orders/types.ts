import { z } from "zod";

export const ChefOrderDraftItemSchema = z.object({
    ingredient_id: z.string().uuid().optional(),
    canonical_name: z.string().min(1),
    quantity_hint: z.string().optional(),
    required: z.boolean().default(true),
    source: z.enum(["missing_required", "missing_optional", "manual"]).default("manual"),
});

export type ChefOrderDraftItem = z.infer<typeof ChefOrderDraftItemSchema>;

export const CreateDraftBodySchema = z.object({
    vendor_name: z.string().optional(),

    mode: z.enum(["from_match", "manual"]).default("from_match"),

    match: z
        .object({
            recipe_id: z.string().uuid().optional(), // optional in V1
            title: z.string().min(1),
            missing_required: z.array(
                z.object({
                    ingredient_id: z.string().uuid().optional(),
                    canonical_name: z.string().min(1),
                })
            ),
            missing_optional: z
                .array(
                    z.object({
                        ingredient_id: z.string().uuid().optional(),
                        canonical_name: z.string().min(1),
                    })
                )
                .optional(),
            include_optional: z.boolean().default(false),
        })
        .optional(),

    items: z.array(ChefOrderDraftItemSchema).optional(),
});
