"use client";

/**
 * Unified Profile Page
 * Shows CRM details + Timeline + Second Brain + Intelligence
 * app/organism/[entityType]/[entityId]/page.tsx
 */

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
// Removed direct import - using API route instead

interface ProfileData {
  entity: any;
  interactions: any[];
  brainInsights: any[];
  intelligenceFindings: any[];
  relatedEntities: any[];
}

export default function UnifiedProfilePage() {
  const params = useParams();
  const entityType = params.entityType as "person" | "organization" | "deal";
  const entityId = params.entityId as string;

  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProfileData();
  }, [entityType, entityId]);

  async function loadProfileData() {
    try {
      setLoading(true);
      // Get userId from API
      const userRes = await fetch("/api/user/me");
      const userJson = await userRes.json();
      const userId = userJson?.userId || null;
      if (!userId) {
        throw new Error("Not authenticated");
      }

      // Fetch entity
      const entityResponse = await fetch(
        `/api/organism/${entityType === "person" ? "contacts" : entityType === "organization" ? "organizations" : "deals"}/${entityId}`
      );
      if (!entityResponse.ok) throw new Error("Failed to load entity");

      const entityData = await entityResponse.json();

      // Fetch interactions
      const interactionsResponse = await fetch(
        `/api/organism/interactions?${entityType === "person" ? "contact_id" : entityType === "organization" ? "organization_id" : "deal_id"}=${entityId}&limit=50`
      );
      const interactionsData = interactionsResponse.ok ? await interactionsResponse.json() : { interactions: [] };

      // Fetch brain insights (if tb_node_id exists)
      let brainInsights: any[] = [];
      let intelligenceFindings: any[] = [];

      if (entityData.entity?.tb_node_id) {
        // Fetch memory fragments
        const brainResponse = await fetch(
          `/api/intel/results?entity_tb_node_id=${entityData.entity.tb_node_id}`
        );
        if (brainResponse.ok) {
          const brainData = await brainResponse.json();
          brainInsights = brainData.memory_fragments || [];
          intelligenceFindings = brainData.sources || [];
        }
      }

      setData({
        entity: entityData.entity || entityData.contact || entityData.organization || entityData.deal,
        interactions: interactionsData.interactions || [],
        brainInsights: brainInsights,
        intelligenceFindings: intelligenceFindings,
        relatedEntities: [],
      });
    } catch (err: any) {
      setError(err.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }

  async function runIntelligence() {
    try {
      const response = await fetch("/api/intel/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity_type: entityType === "person" ? "person" : entityType === "organization" ? "organization" : undefined,
          entity_id: entityId,
        }),
      });

      if (!response.ok) throw new Error("Intelligence gathering failed");

      const result = await response.json();
      alert(`Intelligence gathered! ${result.memory_fragments_created} fragments created.`);
      
      // Reload data
      loadProfileData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-white text-center py-20">Loading profile...</div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-red-400 text-center py-20">{error || "Failed to load profile"}</div>
        </div>
      </div>
    );
  }

  const entity = data.entity;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="glass rounded-2xl p-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                {entity.full_name || entity.name || "Unknown"}
              </h1>
              {entity.primary_email && (
                <p className="text-purple-300">{entity.primary_email}</p>
              )}
              {entity.domain && <p className="text-purple-300">{entity.domain}</p>}
            </div>
            <button
              onClick={runIntelligence}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white"
            >
              Gather Intelligence
            </button>
          </div>

          {entity.intel_summary && (
            <div className="mt-4 p-4 bg-purple-900/30 rounded-lg">
              <h3 className="text-sm font-semibold text-purple-300 mb-2">Intelligence Summary</h3>
              <p className="text-white text-sm">{entity.intel_summary}</p>
            </div>
          )}
        </div>

        {/* Timeline */}
        <div className="glass rounded-2xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">Timeline</h2>
          <div className="space-y-4">
            {data.interactions.length === 0 ? (
              <p className="text-gray-400">No interactions yet</p>
            ) : (
              data.interactions.map((interaction: any) => (
                <div key={interaction.id} className="border-l-2 border-purple-500 pl-4 py-2">
                  <div className="flex justify-between">
                    <span className="text-purple-300 text-sm font-semibold">
                      {interaction.type.toUpperCase()}
                    </span>
                    <span className="text-gray-400 text-xs">
                      {new Date(interaction.occurred_at).toLocaleDateString()}
                    </span>
                  </div>
                  {interaction.subject && (
                    <p className="text-white font-medium mt-1">{interaction.subject}</p>
                  )}
                  {interaction.summary && (
                    <p className="text-gray-300 text-sm mt-1">{interaction.summary.substring(0, 200)}...</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Second Brain Insights */}
        {data.brainInsights.length > 0 && (
          <div className="glass rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Second Brain Insights</h2>
            <div className="space-y-3">
              {data.brainInsights.map((insight: any) => (
                <div key={insight.id} className="p-4 bg-purple-900/20 rounded-lg">
                  <p className="text-white text-sm">{insight.content?.substring(0, 300)}...</p>
                  {insight.provenance?.source_url && (
                    <a
                      href={insight.provenance.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-400 text-xs mt-2 block hover:underline"
                    >
                      Source: {insight.provenance.source_title || insight.provenance.source_url}
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Intelligence Findings */}
        {data.intelligenceFindings.length > 0 && (
          <div className="glass rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Intelligence Sources</h2>
            <div className="space-y-2">
              {data.intelligenceFindings.map((source: any) => (
                <a
                  key={source.id}
                  href={source.metadata?.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 bg-purple-900/20 rounded-lg hover:bg-purple-900/30 transition"
                >
                  <p className="text-white font-medium">{source.title}</p>
                  {source.metadata?.url && (
                    <p className="text-purple-400 text-xs mt-1">{source.metadata.url}</p>
                  )}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

