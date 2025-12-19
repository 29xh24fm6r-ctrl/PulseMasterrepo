// app/autopilot/settings/page.tsx
// Policy Management UI (DB-aligned)
"use client";

import { useEffect, useState } from "react";

interface Policy {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  trigger_event: string;
  action_type: string;
  trigger_conditions: Record<string, any>;
  action_config: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export default function AutopilotSettingsPage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingPolicy, setEditingPolicy] = useState<string | null>(null);
  const [editingConfig, setEditingConfig] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchPolicies();
  }, []);

  async function fetchPolicies() {
    try {
      setLoading(true);
      const res = await fetch("/api/autopilot/policies");
      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error || "Failed to fetch policies");
      }

      setPolicies(data.policies || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function togglePolicy(id: string, currentActive: boolean) {
    try {
      const res = await fetch(`/api/autopilot/policies/${id}/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !currentActive }),
      });
      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error || "Failed to toggle policy");
      }

      // Update local state
      setPolicies((prev) =>
        prev.map((p) => (p.id === id ? { ...p, is_active: data.policy.is_active } : p))
      );
    } catch (err: any) {
      alert(`Failed to toggle policy: ${err.message}`);
    }
  }

  async function savePolicyConfig(id: string) {
    try {
      const res = await fetch(`/api/autopilot/policies/${id}/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingConfig),
      });
      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error || "Failed to update policy");
      }

      // Update local state
      setPolicies((prev) =>
        prev.map((p) => (p.id === id ? data.policy : p))
      );

      setEditingPolicy(null);
      setEditingConfig({});
    } catch (err: any) {
      alert(`Failed to update policy: ${err.message}`);
    }
  }

  function startEditing(policy: Policy) {
    setEditingPolicy(policy.id);
    setEditingConfig({
      trigger_conditions: policy.trigger_conditions || {},
      action_config: policy.action_config || {},
      name: policy.name,
      description: policy.description,
    });
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
        <h1 className="text-2xl font-bold mb-4">Autopilot Settings</h1>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-8">
        <h1 className="text-2xl font-bold mb-4">Autopilot Settings</h1>
        <div className="text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Autopilot Settings</h1>
        <button
          onClick={triggerScan}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Trigger Scan
        </button>
      </div>

      {policies.length === 0 ? (
        <div className="text-gray-500">
          <p>No policies found.</p>
          <p className="mt-2 text-sm">
            Policies need to be created manually in the database for now.
            They should be in plugin_automations with trigger_event='autopilot.scan' and action_type='suggest'.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {policies.map((policy) => (
            <div
              key={policy.id}
              className="border rounded-lg p-6 bg-white shadow-sm"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-xl font-semibold">{policy.name}</h2>
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        policy.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {policy.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  {policy.description && (
                    <p className="text-gray-600 mb-3">{policy.description}</p>
                  )}
                  <div className="text-sm text-gray-500 mb-2">
                    Detector: {policy.action_config?.detector || "N/A"}
                  </div>
                </div>
                <button
                  onClick={() => togglePolicy(policy.id, policy.is_active)}
                  className={`px-4 py-2 rounded ${
                    policy.is_active
                      ? "bg-red-600 text-white hover:bg-red-700"
                      : "bg-green-600 text-white hover:bg-green-700"
                  }`}
                >
                  {policy.is_active ? "Deactivate" : "Activate"}
                </button>
              </div>

              {editingPolicy === policy.id ? (
                <div className="border-t pt-4 mt-4">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Name
                      </label>
                      <input
                        type="text"
                        value={editingConfig.name || ""}
                        onChange={(e) =>
                          setEditingConfig({
                            ...editingConfig,
                            name: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border rounded"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        value={editingConfig.description || ""}
                        onChange={(e) =>
                          setEditingConfig({
                            ...editingConfig,
                            description: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border rounded"
                        rows={2}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Trigger Conditions (JSON)
                      </label>
                      <textarea
                        value={JSON.stringify(editingConfig.trigger_conditions || {}, null, 2)}
                        onChange={(e) => {
                          try {
                            const parsed = JSON.parse(e.target.value);
                            setEditingConfig({
                              ...editingConfig,
                              trigger_conditions: parsed,
                            });
                          } catch {
                            // Invalid JSON, keep as is
                          }
                        }}
                        className="w-full px-3 py-2 border rounded font-mono text-sm"
                        rows={4}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Action Config (JSON)
                      </label>
                      <textarea
                        value={JSON.stringify(editingConfig.action_config || {}, null, 2)}
                        onChange={(e) => {
                          try {
                            const parsed = JSON.parse(e.target.value);
                            setEditingConfig({
                              ...editingConfig,
                              action_config: parsed,
                            });
                          } catch {
                            // Invalid JSON, keep as is
                          }
                        }}
                        className="w-full px-3 py-2 border rounded font-mono text-sm"
                        rows={4}
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => savePolicyConfig(policy.id)}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditingPolicy(null);
                          setEditingConfig({});
                        }}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border-t pt-4 mt-4">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        Trigger Conditions
                      </label>
                      <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-auto">
                        {JSON.stringify(policy.trigger_conditions || {}, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        Action Config
                      </label>
                      <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-auto">
                        {JSON.stringify(policy.action_config || {}, null, 2)}
                      </pre>
                    </div>
                  </div>
                  <button
                    onClick={() => startEditing(policy)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                  >
                    Edit Config
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
