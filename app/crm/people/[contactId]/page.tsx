import { crmContactTag, crmFollowupsTag, crmInteractionsTag } from "@/lib/crm/cacheTags";
import { RelationshipPulseBanner } from "@/components/crm/RelationshipPulseBanner";
import { PulseEventBridge } from "@/components/crm/PulseEventBridge";
import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";

// Use direct DB reads for demo simplicity
async function getContact(id: string) {
    const sb = getSupabaseAdminRuntimeClient();
    const { data } = await sb.from('crm_contacts').select('*').eq('id', id).single();
    return data;
}

async function getFollowups(contactId: string) {
    const sb = getSupabaseAdminRuntimeClient();
    const { data } = await sb.from('crm_followups').select('*').eq('contact_id', contactId).eq('status', 'open').order('due_at', { ascending: true });
    return data || [];
}

async function getInteractions(contactId: string) {
    const sb = getSupabaseAdminRuntimeClient();
    const { data } = await sb.from('crm_interactions').select('*').eq('contact_id', contactId).order('happened_at', { ascending: false });
    return data || [];
}


export default async function PersonPage({ params }: { params: { contactId: string } }) {
    const contactId = params.contactId;

    const [person, followups, interactions] = await Promise.all([
        getContact(contactId),
        getFollowups(contactId),
        getInteractions(contactId),
    ]);

    return (
        <div className="min-h-screen bg-black text-white p-6 font-sans selection:bg-cyan-900">
            <div className="max-w-4xl mx-auto space-y-8">

                {/* Header */}
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                        {person?.display_name ?? "Unknown Person"}
                    </h1>
                    <p className="text-gray-400">{person?.primary_email ?? "No email"}</p>
                    <p className="text-xs text-gray-600 font-mono">{contactId}</p>
                </div>

                {/* Pulse Banner */}
                <RelationshipPulseBanner
                    contactId={contactId}
                    personName={person?.display_name ?? null}
                />

                {/* Bridge & Grid (Bridge handles the grid layout now) */}
                <PulseEventBridge
                    contactId={contactId}
                    person={person}
                    followups={followups}
                    interactions={interactions}
                />

            </div>
        </div>
    );
}
