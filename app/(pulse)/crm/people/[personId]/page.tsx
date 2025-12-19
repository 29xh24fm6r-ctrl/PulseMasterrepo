import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getCrmPerson } from "@/lib/crm/getCrmPerson";
import { resolveCanonicalContactId } from "@/lib/crm/canonical";
import { routes } from "@/lib/routes";
import PersonDetail from "@/components/people/person-detail";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CrmPersonDetailPage({
  params,
}: {
  params: Promise<{ personId: string }> | { personId: string };
}) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    redirect("/sign-in");
  }

  // Handle both Promise-based (Next.js 15+) and sync params (Next.js 14)
  const resolvedParams = params instanceof Promise ? await params : params;
  const personId = resolvedParams.personId;

  if (!personId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <div className="p-6 bg-red-500/20 border border-red-500/30 rounded">
            <div className="text-red-400 font-medium mb-2">Missing personId</div>
            <div className="text-gray-400 text-sm mb-4">
              The personId parameter is missing from the URL.
            </div>
            <a
              href={routes.crm.people.list()}
              className="text-purple-400 hover:text-purple-300 underline"
            >
              ← Back to CRM People
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Resolve user UUID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkUserId)
    .single();

  const dbUserId = userRow?.id ?? null;

  // Debug logging
  console.log("[CRM Person Page] params.personId =", personId);
  console.log("[CRM Person Page] clerkUserId =", clerkUserId);
  console.log("[CRM Person Page] dbUserId =", dbUserId);

  // C2) Resolve to canonical contact ID (handles merged contacts)
  let canonicalId = personId;
  try {
    const resolved = await resolveCanonicalContactId(personId, clerkUserId);
    canonicalId = resolved.canonicalId;
    
    // If merged, redirect to canonical
    if (resolved.isMerged && canonicalId !== personId) {
      redirect(`/crm/people/${canonicalId}`);
    }
  } catch (err) {
    // Contact not found or not accessible
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <div className="p-6 bg-red-500/20 border border-red-500/30 rounded">
            <div className="text-red-400 font-medium mb-2">Contact not found</div>
            <div className="text-gray-400 text-sm mb-4">
              The contact you're looking for doesn't exist or you don't have access to it.
            </div>
            {process.env.NEXT_PUBLIC_DEBUG_PULSE === "1" && (
              <pre className="mt-4 text-xs text-gray-300 bg-zinc-900/60 border border-zinc-700 p-3 rounded overflow-auto">
                {JSON.stringify({ personId, clerkUserId, dbUserId, error: err instanceof Error ? err.message : String(err) }, null, 2)}
              </pre>
            )}
            <a
              href={routes.crm.people.list()}
              className="text-purple-400 hover:text-purple-300 underline"
            >
              ← Back to CRM People
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Get canonical contact with proper scoping
  const { contact, error } = await getCrmPerson({
    contactId: canonicalId,
    clerkUserId,
    dbUserId,
  });

  if (!contact || contact.status !== "active") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <div className="p-6 bg-red-500/20 border border-red-500/30 rounded">
            <div className="text-red-400 font-medium mb-2">Contact not found</div>
            <div className="text-gray-400 text-sm mb-4">
              The contact you're looking for doesn't exist or you don't have access to it.
            </div>
            {process.env.NEXT_PUBLIC_DEBUG_PULSE === "1" && (
              <pre className="mt-4 text-xs text-gray-300 bg-zinc-900/60 border border-zinc-700 p-3 rounded overflow-auto">
                {JSON.stringify({ personId, canonicalId, clerkUserId, dbUserId, error }, null, 2)}
              </pre>
            )}
            <a
              href={routes.crm.people.list()}
              className="text-purple-400 hover:text-purple-300 underline"
            >
              ← Back to CRM People
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Check if PersonDetail component exists, otherwise render placeholder
  // Use canonicalId for the component (handles merged redirects client-side too)
  try {
    return <PersonDetail personId={canonicalId} />;
  } catch (err) {
    // Fallback if component doesn't exist yet
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-4">{contact.full_name || "Unnamed Contact"}</h1>
          <p className="text-gray-400 mb-4">CRM Contact View</p>
          <div className="p-4 bg-zinc-800/50 rounded border border-zinc-700">
            <div className="text-sm text-gray-400 mb-2">Contact ID</div>
            <div className="font-mono text-sm">{personId}</div>
            {contact.primary_email && (
              <>
                <div className="text-sm text-gray-400 mt-4 mb-2">Email</div>
                <div>{contact.primary_email}</div>
              </>
            )}
            {contact.company_name && (
              <>
                <div className="text-sm text-gray-400 mt-4 mb-2">Company</div>
                <div>{contact.company_name}</div>
              </>
            )}
          </div>
          <div className="mt-6">
            <a
              href={routes.people.list()}
              className="text-purple-400 hover:text-purple-300 underline"
            >
              ← Back to People List
            </a>
          </div>
        </div>
      </div>
    );
  }
}

