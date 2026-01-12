// Minimal "Lite" types to avoid circular deps or heavy DB objects in the visual layer

export interface TaskLite {
    id: string;
    title: string;
    due_date: string | null;
    priority: string; // 'p1' | 'p2' | 'p3' | 'p4'
    status: string;
    tags?: string[];
    project_id?: string;
}

export interface CalendarLite {
    id: string;
    title: string;
    start_time: string;
    end_time: string;
    attendees?: number;
}

export interface CRMlite {
    id: string;
    name: string;
    last_interaction: string; // ISO
    next_followup: string; // ISO
    health_score?: number;
}

export interface NoteLite {
    id: string;
    title: string;
    updated_at: string;
    tags?: string[];
}

export interface ActivityLite {
    timestamp: string;
    type: string;
    system?: string;
}

export interface BiometricsLite {
    current_energy?: number; // 0-100
    focus_score?: number; // 0-100
    last_sync: string;
}

export interface NerveInput {
    now: string; // ISO timestamp of "render time"
    tasks: TaskLite[];
    calendar: CalendarLite[];
    crm: CRMlite[];
    notes: NoteLite[];
    activity: ActivityLite[];
    biometrics?: BiometricsLite;
}
