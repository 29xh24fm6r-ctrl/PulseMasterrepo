import { DailyRhythmWindow } from '../rhythm/DailyRhythm';

export type NarrativeEntry = {
    id: string;
    user_id: string;
    created_at: string;
    rhythm_window: DailyRhythmWindow;
    summary: string;
};
