import { z } from "zod";

export const IntentSchema = z.enum([
    "READ_TASKS",
    "ADD_TASK",
    "NEXT_MEETING",
    "CAPTURE_NOTE",
    "CONFIRM",
    "CANCEL",
    "UNKNOWN"
]);

export type IntentType = z.infer<typeof IntentSchema>;

// --- Parameter Schemas ---

export const AddTaskParams = z.object({
    description: z.string().describe("The description of the task"),
    priority: z.enum(["HIGH", "NORMAL", "LOW"]).optional().default("NORMAL")
});

export const CaptureNoteParams = z.object({
    content: z.string().describe("The content of the note or thought to capture")
});

// --- Output Types ---

export type IntentResult = {
    type: IntentType;
    confidence: number;
    reason?: string;
    internal_reason?: string; // Debug reasoning, never spoken
    suggested?: boolean;      // True if inferred from context/complaint
    requires_confirmation?: boolean;
    params?: any;
};

export const ToolResultSchema = z.object({
    success: z.boolean(),
    data: z.any()
});

export type ToolResult = z.infer<typeof ToolResultSchema>;
