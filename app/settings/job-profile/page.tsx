// Job Profile Selector Page
// app/settings/job-profile/page.tsx

"use client";

import { useState, useEffect } from "react";
import { Briefcase, Search, ChevronRight, Save } from "lucide-react";

interface JobNode {
  id: string;
  path: string;
  name: string;
  level: number;
  children?: JobNode[];
}

export default function JobProfilePage() {
  const [nodes, setNodes] = useState<JobNode[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [customTitle, setCustomTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadJobGraph();
    loadCurrentProfile();
  }, []);

  async function loadJobGraph() {
    try {
      const res = await fetch("/api/jobs/graph");
      const json = await res.json();
      if (res.ok) {
        setNodes(json);
      }
    } catch (err) {
      console.error("Failed to load job graph:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadCurrentProfile() {
    try {
      const res = await fetch("/api/jobs/profile");
      const json = await res.json();
      if (res.ok && json) {
        setSelectedPath(json.job_node?.path || null);
        setCustomTitle(json.custom_title || "");
        setNotes(json.notes || "");
      }
    } catch (err) {
      console.error("Failed to load profile:", err);
    }
  }

  async function saveProfile() {
    if (!selectedPath) {
      alert("Please select a job");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/jobs/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: selectedPath,
          custom_title: customTitle || null,
          notes: notes || null,
        }),
      });
      if (res.ok) {
        alert("Profile saved!");
      }
    } catch (err) {
      console.error("Failed to save profile:", err);
      alert("Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  function renderNode(node: JobNode, depth = 0) {
    const isSelected = selectedPath === node.path;
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.id} className="ml-4">
        <button
          onClick={() => setSelectedPath(node.path)}
          className={`w-full text-left px-3 py-2 rounded transition-colors flex items-center justify-between ${
            isSelected
              ? "bg-violet-600 text-white"
              : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
          }`}
        >
          <span>{node.name}</span>
          {hasChildren && <ChevronRight className="w-4 h-4" />}
        </button>
        {hasChildren && (
          <div className="mt-1 space-y-1">
            {node.children!.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  }

  const filteredNodes = searchQuery
    ? nodes.filter((n) => n.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : nodes;

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="text-zinc-400">Loading job graph...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Briefcase className="w-8 h-8 text-blue-400" />
          <div>
            <h1 className="text-3xl font-bold text-white">Job Profile</h1>
            <p className="text-sm text-zinc-400">
              Select the job that best represents what you do
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search jobs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-white placeholder-zinc-400 outline-none"
            />
          </div>
        </div>

        {/* Job Tree */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-2 max-h-96 overflow-y-auto">
          {filteredNodes.length === 0 ? (
            <div className="text-zinc-400 text-center py-8">No jobs found</div>
          ) : (
            filteredNodes.map((node) => renderNode(node))
          )}
        </div>

        {/* Custom Title */}
        {selectedPath && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
            <div>
              <label className="text-sm font-medium text-white mb-2 block">
                Custom Title (Optional)
              </label>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Override job title if needed"
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-white mb-2 block">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional context about your role"
                rows={3}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white"
              />
            </div>
            <div className="flex justify-end">
              <button
                onClick={saveProfile}
                disabled={saving}
                className="px-6 py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-zinc-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {saving ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

