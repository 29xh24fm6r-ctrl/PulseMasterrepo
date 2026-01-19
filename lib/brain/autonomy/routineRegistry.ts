
export interface TrustedRoutineDef {
    displayName: string;
    description: string;
}

export const ROUTINE_REGISTRY: Record<string, TrustedRoutineDef> = {
    'tasks:update:close_task_completed': {
        displayName: 'Automatically close completed tasks',
        description: 'When tasks are clearly done, Pulse closes them for you.'
    },
    'chef:update:action_add_missing_grocery_item': {
        displayName: 'Add missing groceries automatically',
        description: 'Pulse adds common missing items to your grocery draft.'
    },
    'planning:update:adjust_daily_priorities': {
        displayName: 'Adjust daily priorities',
        description: 'Pulse reorders your day when pressure changes.'
    },
    // Adding the one used in previous verification for continuity
    'tasks:create:struct_status_title': {
        displayName: 'Auto-create routine tasks',
        description: 'Pulse creates tasks for routine goals.'
    }
};
