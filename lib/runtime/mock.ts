import {
    LifeState,
    TrendPoint,
    NotableEvent,
    PlanSection,
    ObserverData
} from "./types";

export const MOCK_LIFE_STATE: LifeState = {
    energy: 'Medium',
    stress: 'Low',
    momentum: 'High',
    orientation: "Pulse is staying quiet and keeping things light."
};

export const MOCK_TRENDS: Record<string, TrendPoint[]> = {
    energy: [
        { day: 'M', value: 4, label: 'Mon' },
        { day: 'T', value: 6, label: 'Tue' },
        { day: 'W', value: 8, label: 'Wed' },
        { day: 'T', value: 7, label: 'Thu' },
        { day: 'F', value: 5, label: 'Fri' },
        { day: 'S', value: 6, label: 'Sat' },
        { day: 'S', value: 7, label: 'Sun' },
    ],
    stress: [
        { day: 'M', value: 7, label: 'Mon' },
        { day: 'T', value: 5, label: 'Tue' },
        { day: 'W', value: 3, label: 'Wed' },
        { day: 'T', value: 4, label: 'Thu' },
        { day: 'F', value: 2, label: 'Fri' },
        { day: 'S', value: 2, label: 'Sat' },
        { day: 'S', value: 1, label: 'Sun' },
    ],
    momentum: [
        { day: 'M', value: 3, label: 'Mon' },
        { day: 'T', value: 4, label: 'Tue' },
        { day: 'W', value: 6, label: 'Wed' },
        { day: 'T', value: 8, label: 'Thu' },
        { day: 'F', value: 9, label: 'Fri' },
        { day: 'S', value: 8, label: 'Sat' },
        { day: 'S', value: 9, label: 'Sun' },
    ]
};

export const MOCK_NOTABLES: NotableEvent[] = [
    { id: '1', time: '10:42 AM', icon: 'zap', title: 'Deep Work Protected', description: 'Silenced 3 notifications during flow block.' },
    { id: '2', time: '09:15 AM', icon: 'brain', title: 'Schedule Optimization', description: 'Moved sync meeting to afternoon based on energy.' },
    { id: '3', time: '08:00 AM', icon: 'shield', title: 'Morning Ramp', description: 'Held non-urgent emails until 9am.', isGap: true },
];

export const MOCK_PLAN_LEDGER: PlanSection[] = [
    {
        id: 'today',
        title: 'Today',
        items: [
            { id: '1', title: 'Deep Work Block', time: '10:00 AM', status: 'completed', type: 'routine' },
            { id: '2', title: 'Team Sync', time: '2:00 PM', status: 'pending', type: 'meeting', context: 'Zoom' },
            { id: '3', title: 'Review PRs', time: '4:00 PM', status: 'pending', type: 'task' },
        ]
    },
    {
        id: 'pending',
        title: 'Pending Confirmations',
        items: [
            { id: '4', title: 'Schedule Dentist', status: 'pending', type: 'task', context: 'Conflict on Tuesday' },
        ]
    },
    {
        id: 'recent',
        title: 'Recent Changes',
        items: [
            { id: '5', title: 'Gym Session', status: 'approved', type: 'routine' },
            { id: '6', title: 'Lunch with S.', status: 'declined', type: 'meeting' },
        ]
    }
];

export const MOCK_OBSERVER_DATA: ObserverData = {
    runtime: [
        { id: '1', timestamp: new Date().toISOString(), type: 'tick', summary: 'Heartbeat Check', detail: 'System nominal' },
        { id: '2', timestamp: new Date(Date.now() - 5000).toISOString(), type: 'decision', summary: 'Silence Maintained', detail: 'User preference: Quiet' },
        { id: '3', timestamp: new Date(Date.now() - 60000).toISOString(), type: 'note', summary: 'Context Refreshed', detail: 'Location update' },
    ],
    autonomy: [
        { id: '1', domain: 'tasks', action: 'create', eligibility: 'Eligible', confidence: 0.95 },
        { id: '2', domain: 'chef', action: 'order_groceries', eligibility: 'Locked', confidence: 0.3, drift: true, explainable: true },
        { id: '3', domain: 'calendar', action: 'reschedule', eligibility: 'Confirm', confidence: 0.7, decay: 0.2, explainable: true }
    ],
    effects: [
        { id: '1', timestamp: new Date().toISOString(), domain: 'tasks', action: 'create_todo', status: 'applied', source: 'pulse', explainable: true },
        { id: '2', timestamp: new Date(Date.now() - 3600000).toISOString(), domain: 'calendar', action: 'move_event', status: 'reverted', source: 'you' },
        { id: '3', timestamp: new Date(Date.now() - 7200000).toISOString(), domain: 'data', action: 'sync_contacts', status: 'queued', source: 'pulse' }
    ],
    ipp: [
        { id: '1', timestamp: new Date(Date.now() - 100000).toISOString(), blocker: 'network', message: 'Connection lost briefly', resolved: true },
        { id: '2', timestamp: new Date().toISOString(), blocker: 'data', message: 'Schema mismatch in user_settings', resolved: false }
    ],
    background: [
        { id: '1', timestamp: new Date().toISOString(), job: 'runDailyPulse', status: 'ok' },
        { id: '2', timestamp: new Date(Date.now() - 3600000).toISOString(), job: 'dataCleanup', status: 'skipped', note: 'Nothing to clean' },
        { id: '3', timestamp: new Date(Date.now() - 7200000).toISOString(), job: 'syncCalendar', status: 'failed', note: 'Timeout' }
    ]
};

export function getLifeState() { return MOCK_LIFE_STATE; }
export function getTrends() { return MOCK_TRENDS; }
export function getNotables() { return MOCK_NOTABLES; }
export function getPlanLedger() { return MOCK_PLAN_LEDGER; }
export function getObserverData() { return MOCK_OBSERVER_DATA; }

export async function sendBridgeMessageMock(text: string): Promise<string> {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(`I didn't quite get that. (Mock Reply to "${text}")`);
        }, 1000);
    });
}
