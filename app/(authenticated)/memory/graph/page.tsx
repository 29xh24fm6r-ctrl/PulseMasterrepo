// Memory Graph Explorer
// app/(authenticated)/memory/graph/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { AppCard } from '@/components/ui/AppCard';
import { LoadingState } from '@/components/ui/LoadingState';

interface GraphData {
  keyPeople: any[];
  keyProjects: any[];
  recentHighlights: any[];
}

export default function MemoryGraphPage() {
  const [data, setData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGraphData();
  }, []);

  async function fetchGraphData() {
    try {
      // This would ideally come from WorldState or a dedicated API
      // For now, we'll fetch from the graph search API
      const response = await fetch('/api/thirdbrain/graph/search?limit=20');
      const result = await response.json();

      // Organize by type
      const keyPeople = (result.nodes || []).filter((n: any) => n.type === 'person').slice(0, 10);
      const keyProjects = (result.nodes || []).filter((n: any) => ['deal', 'project'].includes(n.type)).slice(0, 10);
      const recentHighlights = (result.nodes || []).filter((n: any) => ['call', 'experiment', 'emotion_state'].includes(n.type)).slice(0, 5);

      setData({
        keyPeople,
        keyProjects,
        recentHighlights,
      });
    } catch (err) {
      console.error('[Memory Graph] Failed to fetch:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <LoadingState message="Loading memory graph..." />;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Memory Graph</h1>
        <p className="text-zinc-400">Explore the connections in your life</p>
      </div>

      <AppCard className="p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Key People</h2>
        {data?.keyPeople.length === 0 ? (
          <p className="text-white/60">No people nodes yet.</p>
        ) : (
          <div className="space-y-2">
            {data?.keyPeople.map((person) => (
              <div key={person.id} className="p-3 bg-black/30 rounded">
                <h3 className="text-white font-medium">{person.props?.name || 'Unknown'}</h3>
                {person.props?.role && (
                  <p className="text-white/60 text-sm">{person.props.role}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </AppCard>

      <AppCard className="p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Key Projects & Deals</h2>
        {data?.keyProjects.length === 0 ? (
          <p className="text-white/60">No project nodes yet.</p>
        ) : (
          <div className="space-y-2">
            {data?.keyProjects.map((project) => (
              <div key={project.id} className="p-3 bg-black/30 rounded">
                <h3 className="text-white font-medium">{project.props?.name || 'Unknown'}</h3>
                {project.props?.status && (
                  <p className="text-white/60 text-sm">Status: {project.props.status}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </AppCard>

      <AppCard className="p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Recent Highlights</h2>
        {data?.recentHighlights.length === 0 ? (
          <p className="text-white/60">No recent highlights yet.</p>
        ) : (
          <div className="space-y-2">
            {data?.recentHighlights.map((highlight) => (
              <div key={highlight.id} className="p-3 bg-black/30 rounded">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-zinc-500 uppercase">{highlight.type}</span>
                </div>
                <p className="text-white">{highlight.props?.summary || highlight.props?.name || 'No summary'}</p>
              </div>
            ))}
          </div>
        )}
      </AppCard>
    </div>
  );
}


