
export type ActionType = "task" | "follow_up" | "commitment" | "waiting_on";

export interface ActionData {
    type: ActionType;
    priority: string;
    description: string;
    dueDate: string | null;
    context?: string;
    fromName: string;
    fromEmail: string;
    subject: string;
    personId?: string;
}

export const typeLabels: Record<ActionType, string> = {
    task: "Task",
    commitment: "Commitment",
    follow_up: "Follow-up",
    waiting_on: "Check-in",
};
