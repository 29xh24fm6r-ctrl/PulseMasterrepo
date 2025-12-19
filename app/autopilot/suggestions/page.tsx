// app/autopilot/suggestions/page.tsx
// Minimal UI for viewing and dismissing automation suggestions (DB-aligned)
"use client";

import { useEffect, useState } from "react";

interface Suggestion {
  id: string;
  suggestion_type: string;
  title: string;
  detail: string | null;
  priority: "low" | "medium" | "high";
  entity_type: string | null;
  entity_id: string | null;
  status: string;
  snoozed_until: string | null;
  created_at: string;
  metadata: Record<string, any>;
}

export default function AutopilotSuggestionsPage() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSuggestions();
  }, []);

  async function fetchSuggestions() {
    try {
      setLoading(true);
      const res = await fetch("/api/autopilot/suggestions?limit=50&status=open");
      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error || "Failed to fetch suggestions");
      }

      setSuggestions(data.suggestions || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function dismissSuggestion(id: string) {
    try {
      const res = await fetch(`/api/autopilot/suggestions/${id}/dismiss`, {
        method: "POST",
      });
      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error || "Failed to dismiss suggestion");
      }

      // Remove from list
      setSuggestions((prev) => prev.filter((s) => s.id !== id));
    } catch (err: any) {
      alert(`Failed to dismiss: ${err.message}`);
    }
  }

  async function snoozeSuggestion(id: string, days: number) {
    try {
      const res = await fetch(`/api/autopilot/suggestions/${id}/snooze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days }),
      });
      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error || "Failed to snooze suggestion");
      }

      // Remove from list (snoozed suggestions are hidden)
      setSuggestions((prev) => prev.filter((s) => s.id !== id));
    } catch (err: any) {
      alert(`Failed to snooze: ${err.message}`);
    }
  }

  async function triggerScan() {
    try {
      const res = await fetch("/api/autopilot/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error || "Failed to trigger scan");
      }

      alert(`Scan triggered! Job ID: ${data.job_id}\n\nNote: Suggestions will appear after the cron tick processes the job.`);
    } catch (err: any) {
      alert(`Failed to trigger scan: ${err.message}`);
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-8">
        <h1 className="text-2xl font-bold mb-4">Autopilot Suggestions</h1>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-8">
        <h1 className="text-2xl font-bold mb-4">Autopilot Suggestions</h1>
        <div className="text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Autopilot Suggestions</h1>
        <button
          onClick={triggerScan}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Trigger Scan
        </button>
      </div>

      {suggestions.length === 0 ? (
        <div className="text-gray-500">
          <p>No suggestions yet.</p>
          <p className="mt-2 text-sm">
            Click "Trigger Scan" to run the autopilot detector, or wait for the
            scheduled cron job.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {suggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              className="border rounded-lg p-4 bg-white shadow-sm"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="font-semibold text-lg">
                      {suggestion.title}
                    </div>
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        suggestion.priority === "high"
                          ? "bg-red-100 text-red-800"
                          : suggestion.priority === "medium"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {suggestion.priority}
                    </span>
                  </div>
                  {suggestion.detail && (
                    <p className="text-gray-700 mb-2">{suggestion.detail}</p>
                  )}
                  <div className="text-sm text-gray-500">
                    Created: {new Date(suggestion.created_at).toLocaleString()}
                  </div>
                  {Object.keys(suggestion.metadata || {}).length > 0 && (
                    <details className="mt-2">
                      <summary className="text-sm text-gray-600 cursor-pointer">
                        View details
                      </summary>
                      <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                        {JSON.stringify(suggestion.metadata, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
                <div className="ml-4 flex gap-2">
                  <button
                    onClick={() => snoozeSuggestion(suggestion.id, 1)}
                    className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                  >
                    Snooze 1d
                  </button>
                  <button
                    onClick={() => snoozeSuggestion(suggestion.id, 3)}
                    className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                  >
                    Snooze 3d
                  </button>
                  <button
                    onClick={() => snoozeSuggestion(suggestion.id, 7)}
                    className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                  >
                    Snooze 1w
                  </button>
                  <button
                    onClick={() => dismissSuggestion(suggestion.id)}
                    className="px-3 py-1 text-sm bg-red-200 text-red-700 rounded hover:bg-red-300"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
