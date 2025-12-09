"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { Puzzle, Download, Check, Settings, Zap, Calendar, Heart, Brain, Dumbbell } from "lucide-react";

interface Plugin {
  id: string;
  slug: string;
  name: string;
  description: string;
  plugin_type: string;
  is_official: boolean;
  downloads: number;
  installed?: boolean;
}

const PLUGIN_ICONS: Record<string, any> = {
  "todoist": Calendar,
  "notion": Brain,
  "google-calendar": Calendar,
  "fitbit": Dumbbell,
  "openai-coach": Brain,
};

export default function PluginsPage() {
  const { userId } = useAuth();
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [installedPlugins, setInstalledPlugins] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlugins();
  }, []);

  const loadPlugins = async () => {
    try {
      const [availableRes, installedRes] = await Promise.all([
        fetch("/api/plugins?type=available"),
        fetch("/api/plugins")
      ]);
      const availableData = await availableRes.json();
      const installedData = await installedRes.json();
      
      setPlugins(availableData.plugins || []);
      setInstalledPlugins((installedData.plugins || []).map((p: any) => p.plugin_id));
    } catch (error) {
      console.error("Failed to load plugins:", error);
    }
    setLoading(false);
  };

  const installPlugin = async (slug: string) => {
    try {
      await fetch("/api/plugins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "install", slug })
      });
      loadPlugins();
    } catch (error) {
      console.error("Failed to install:", error);
    }
  };

  const getPluginIcon = (slug: string) => {
    const Icon = PLUGIN_ICONS[slug] || Puzzle;
    return <Icon className="w-6 h-6" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <Puzzle className="w-10 h-10 text-cyan-400" />
            Plugin Marketplace
          </h1>
          <p className="text-slate-400 mt-2">Extend Pulse with powerful integrations</p>
        </div>

        {/* Categories */}
        <div className="flex gap-3 mb-8">
          {["All", "Integrations", "Coaches", "Analyzers"].map((cat) => (
            <button
              key={cat}
              className={`px-4 py-2 rounded-lg ${cat === "All" ? "bg-cyan-500 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Plugins Grid */}
        {loading ? (
          <div className="text-center py-12 text-slate-400">Loading plugins...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plugins.map((plugin) => {
              const isInstalled = installedPlugins.includes(plugin.id);
              return (
                <div key={plugin.id} className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 hover:border-cyan-500/30 transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-xl">
                      {getPluginIcon(plugin.slug)}
                    </div>
                    {plugin.is_official && (
                      <span className="px-2 py-1 bg-cyan-500/20 text-cyan-400 text-xs rounded-full">Official</span>
                    )}
                  </div>
                  <h3 className="text-xl font-bold mb-2">{plugin.name}</h3>
                  <p className="text-slate-400 text-sm mb-4">{plugin.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Download className="w-3 h-3" />
                      {plugin.downloads} installs
                    </span>
                    {isInstalled ? (
                      <div className="flex gap-2">
                        <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-lg text-sm flex items-center gap-1">
                          <Check className="w-4 h-4" /> Installed
                        </span>
                        <button className="p-2 hover:bg-slate-700 rounded-lg">
                          <Settings className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => installPlugin(plugin.slug)}
                        className="px-4 py-2 bg-cyan-500 rounded-lg text-sm font-semibold hover:bg-cyan-600"
                      >
                        Install
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* API Keys Section */}
        <div className="mt-12 bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            Developer API
          </h3>
          <p className="text-slate-400 mb-4">Create API keys to integrate Pulse with your own tools.</p>
          <button className="px-4 py-2 bg-slate-700 rounded-lg hover:bg-slate-600">
            Generate API Key
          </button>
        </div>
      </div>
    </div>
  );
}