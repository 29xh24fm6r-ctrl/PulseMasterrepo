export type CallScript = {
    id: string;
    description: string;
    initial_say: string;
    states: Record<string, any>;
};

export const SCRIPTS: Record<string, CallScript> = {
    "confirm_order": {
        id: "confirm_order",
        description: "Confirms an order exists",
        initial_say: "Hello, this is Pulse calling to confirm an order. Do you have a moment?",
        states: {}
    },
    "check_hours": {
        id: "check_hours",
        description: "Checks existing hours",
        initial_say: "Hello, just checking what time you close today.",
        states: {}
    }
};
