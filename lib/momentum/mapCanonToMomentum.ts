import { CanonEvent, MomentumSignal } from "./types";

export function mapCanonToMomentum(event: CanonEvent): MomentumSignal[] {
    switch (event.event_type) {

        // ---------- CRM ----------
        case "crm_interaction_created":
            return [{ domain_slug: "crm", signal_type: "interaction", weight: 1 }];

        case "crm_followup_completed":
            return [{ domain_slug: "crm", signal_type: "followup_complete", weight: 3 }];

        // ---------- PERSONAL ----------
        case "daily_activity_logged":
            return [{ domain_slug: "personal", signal_type: "consistency", weight: 1 }];

        // ---------- LEARNING / SYSTEM ----------
        case "job_completed":
            return [{ domain_slug: "learning", signal_type: "system_progress", weight: 1 }];

        case "knowledge_entry_created":
            return [{ domain_slug: "learning", signal_type: "knowledge_capture", weight: 2 }];

        // ---------- FINANCE ----------
        case "financial_event_logged":
            return [{ domain_slug: "finance", signal_type: "financial_action", weight: 2 }];

        // ---------- HEALTH ----------
        case "health_event_logged":
            return [{ domain_slug: "health", signal_type: "health_action", weight: 2 }];

        default:
            return [];
    }
}
