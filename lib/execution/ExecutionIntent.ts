/**
 * CANONICAL EXECUTION INTENTS
 *
 * Defines the ONLY allowed types of side-effect execution in Pulse OS.
 * If an action is not in this list, Pulse may NOT perform it.
 */
export enum ExecutionIntentType {
    CREATE_TASK = "CREATE_TASK",
    SEND_MESSAGE = "SEND_MESSAGE",
    MODIFY_DATA = "MODIFY_DATA",
    SCHEDULE_EVENT = "SCHEDULE_EVENT",
    PLACE_ORDER = "PLACE_ORDER",
    TRIGGER_INTEGRATION = "TRIGGER_INTEGRATION"
}
