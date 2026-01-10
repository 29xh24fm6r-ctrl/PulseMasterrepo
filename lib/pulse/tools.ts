// lib/pulse/tools.ts

import { Content, Tool } from "@google/generative-ai";

// These definitions map to the "functionDeclarations" expected by Gemini
export const PULSE_TOOLS: Tool[] = [
    {
        functionDeclarations: [
            {
                name: "create_task",
                description: "Create a new task in the user's todo list. Use this when the user says 'Remind me to...' or 'Add X to my list'.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        title: {
                            type: "STRING",
                            description: "The content of the task (e.g., 'Buy Milk', 'Call Mike')."
                        },
                        due_date: {
                            type: "STRING",
                            description: "ISO 8601 date string (YYYY-MM-DD) if a date is mentioned. If 'today', use today's date. If 'tomorrow', use tomorrow's."
                        },
                        priority: {
                            type: "STRING",
                            enum: ["Low", "Medium", "High"],
                            description: "Priority level. Default to Medium if not specified."
                        }
                    },
                    required: ["title"]
                }
            },
            {
                name: "log_habit",
                description: "Log a completed habit. Use this when the user says 'I worked out', 'I meditated', etc.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        habit_name: {
                            type: "STRING",
                            description: "The name of the habit (fuzzy matched). e.g., 'Workout', 'Meditation', 'Hydration'."
                        }
                    },
                    required: ["habit_name"]
                }
            },
            {
                name: "create_follow_up",
                description: "Create a CRM follow-up reminder for a person.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        person: {
                            type: "STRING",
                            description: "Name of the person to follow up with."
                        },
                        reason: {
                            type: "STRING",
                            description: "Context/Reason for the follow-up."
                        },
                        due_date: {
                            type: "STRING",
                            description: "ISO 8601 date string for when to follow up."
                        }
                    },
                    required: ["person", "reason"]
                }
            },
            {
                name: "get_tasks",
                description: "Read the user's active tasks. Use when user asks 'What do I have to do?'",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        filter: {
                            type: "STRING",
                            enum: ["today", "all"],
                            description: "Filter for tasks."
                        }
                    }
                }
            }
        ]
    }
];
