export type CanonEvent = {
    id: string;
    owner_user_id: string; // derived from user_id in activity_events
    event_type: string;
    payload?: any;
    created_at: string;
};

export type MomentumSignal = {
    domain_slug: string;
    signal_type: string;
    weight: number;
};
