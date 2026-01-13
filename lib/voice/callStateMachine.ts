/**
 * Pulse Voice - Call State Machine
 * Defines valid states and transitions for autonomous calls.
 */

export type CallState =
    | 'DIALING'
    | 'IVR_LISTENING'
    | 'IVR_SELECTING'
    | 'HUMAN_CONNECTED'
    | 'ON_HOLD'
    | 'TRANSFERRED'
    | 'VOICEMAIL'
    | 'COMPLETED'
    | 'FAILED';

export interface StateTransition {
    from: CallState;
    to: CallState;
    reason?: string;
}

const VALID_TRANSITIONS: Record<CallState, CallState[]> = {
    'DIALING': ['IVR_LISTENING', 'HUMAN_CONNECTED', 'VOICEMAIL', 'FAILED', 'COMPLETED'], // COMPLETED if quick hangup/wrong number handled
    'IVR_LISTENING': ['IVR_SELECTING', 'HUMAN_CONNECTED', 'ON_HOLD', 'VOICEMAIL', 'FAILED', 'COMPLETED', 'TRANSFERRED'],
    'IVR_SELECTING': ['IVR_LISTENING', 'HUMAN_CONNECTED', 'FAILED', 'COMPLETED', 'TRANSFERRED'],
    'HUMAN_CONNECTED': ['ON_HOLD', 'COMPLETED', 'FAILED', 'TRANSFERRED'],
    'ON_HOLD': ['HUMAN_CONNECTED', 'IVR_LISTENING', 'COMPLETED', 'FAILED'], // Can go back to human or IVR?
    'TRANSFERRED': ['IVR_LISTENING', 'HUMAN_CONNECTED', 'VOICEMAIL', 'FAILED', 'COMPLETED'],
    'VOICEMAIL': ['COMPLETED', 'FAILED'],
    'COMPLETED': [], // Terminal state
    'FAILED': []     // Terminal state
};

export class CallStateMachine {
    private _currentState: CallState;
    private _history: CallState[] = [];

    constructor(initialState: CallState = 'DIALING') {
        this._currentState = initialState;
        this._history.push(initialState);
    }

    get state(): CallState {
        return this._currentState;
    }

    get history(): CallState[] {
        return this._history;
    }

    canTransitionTo(newState: CallState): boolean {
        const allowed = VALID_TRANSITIONS[this._currentState];
        return allowed.includes(newState);
    }

    transition(newState: CallState, reason?: string): boolean {
        if (this.canTransitionTo(newState)) {
            console.log(`Transitioning from ${this._currentState} to ${newState}. Reason: ${reason || 'None'}`);
            this._currentState = newState;
            this._history.push(newState);
            return true;
        } else {
            console.warn(`Invalid transition attempted: ${this._currentState} -> ${newState}`);
            return false;
        }
    }

    // Helper to determine if we are in a terminal state
    isTerminal(): boolean {
        return this._currentState === 'COMPLETED' || this._currentState === 'FAILED';
    }
}
