'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Package,
  Check,
  Download,
  Star,
  Briefcase,
  Building2,
  Rocket,
  Home,
  BarChart3,
  Loader2,
  ChevronRight,
  Zap,
} from 'lucide-react';

interface IndustryPack {
  id: string;
  name: string;
  description: string;
  icon: string;
  industry: string;
  roles: string[];
  features: { name: string; description: string; enabled: boolean }[];
  teachings: { type: string; category: string; instruction: string }[];
  workflows: { name: string; description: string; steps: string[]; automatable: boolean }[];
  kpis: { name: string; metric: string; target?: number; unit: string }[];
  integrations: string[];
}

interface UserPack {
  id: string;
  packId: string;
  packName: string;
  installedAt: string;
  isActive: boolean;
}

export default function PacksPage() {
  const [packs, setPacks] = useState<IndustryPack[]>([]);
  const [installedPacks, setInstalledPacks] = useState<UserPack[]>([]);
  const [recommendations, setRecommendations] = useState<IndustryPack[]>([]);
  const [selectedPack, setSelectedPack] = useState<IndustryPack | null>(null);
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [packsRes, installedRes, recsRes] = await Promise.all([
        fetch('/api/packs'),
        fetch('/api/packs?mode=installed'),
        fetch('/api/packs?mode=recommendations'),
      ]);

      const packsData = await packsRes.json();
      const installedData = await installedRes.json();
      const recsData = await recsRes.json();

      setPacks(packsData.packs || []);
      setInstalledPacks(installedData.packs || []);
      setRecommendations(recsData.packs || []);
    } catch (err) {
      console.error('Failed to load packs:', err);
    } finally {
      setLoading(false);
    }
  }

  async function installPack(packId: string) {
    setInstalling(packId);
    try {
      const res = await fetch('/api/packs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'install', packId }),
      });
      if (res.ok) {
        await loadData();
        setSelectedPack(null);
      }
    } catch (err) {
      console.error('Failed to install pack:', err);
    } finally {
      setInstalling(null);
    }
  }

  async function uninstallPack(packId: string) {
    setInstalling(packId);
    try {
      await fetch('/api/packs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'uninstall', packId }),
      });
      await loadData();
    } catch (err) {
      console.error('Failed to uninstall pack:', err);
    } finally {
      setInstalling(null);
    }
  }

  function isInstalled(packId: string): boolean {
    return installedPacks.some((p) => p.packId === packId);
  }

  function getPackIcon(icon: string) {
    const icons: Record<string, any> = {
      '🏦': Building2,
      '💼': Briefcase,
      '🚀': Rocket,
      '🏠': Home,
      '📊': BarChart3,
    };
    const Icon = icons[icon] || Package;
    return <Icon className="w-6 h-6" />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/life" className="p-2 hover:bg-slate-800 rounded-lg transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-600 rounded-lg">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Industry Packs</h1>
              <p className="text-sm text-slate-400">Pre-built configurations for your profession</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Installed Packs */}
        {installedPacks.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Check className="w-5 h-5 text-green-500" />
              Installed Packs
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {installedPacks.map((up) => {
                const pack = packs.find((p) => p.id === up.packId);
                if (!pack) return null;
                return (
                  <div
                    key={up.id}
                    className="p-4 bg-slate-900 border border-green-500/30 rounded-xl flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-500/20 text-green-400 rounded-lg">
                        {getPackIcon(pack.icon)}
                      </div>
                      <div>
                        <h3 className="font-medium">{pack.name}</h3>
                        <p className="text-sm text-slate-400">{pack.industry}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => uninstallPack(pack.id)}
                      disabled={installing === pack.id}
                      className="px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition"
                    >
                      {installing === pack.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Remove'}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && installedPacks.length === 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              Recommended For You
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recommendations.map((pack) => (
                <PackCard
                  key={pack.id}
                  pack={pack}
                  installed={isInstalled(pack.id)}
                  installing={installing === pack.id}
                  onSelect={() => setSelectedPack(pack)}
                  onInstall={() => installPack(pack.id)}
                  getIcon={getPackIcon}
                />
              ))}
            </div>
          </section>
        )}

        {/* All Packs */}
        <section>
          <h2 className="text-lg font-semibold mb-4">All Packs</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {packs.map((pack) => (
              <PackCard
                key={pack.id}
                pack={pack}
                installed={isInstalled(pack.id)}
                installing={installing === pack.id}
                onSelect={() => setSelectedPack(pack)}
                onInstall={() => installPack(pack.id)}
                getIcon={getPackIcon}
              />
            ))}
          </div>
        </section>
      </main>

      {/* Pack Detail Modal */}
      {selectedPack && (
        <PackDetailModal
          pack={selectedPack}
          installed={isInstalled(selectedPack.id)}
          installing={installing === selectedPack.id}
          onClose={() => setSelectedPack(null)}
          onInstall={() => installPack(selectedPack.id)}
          getIcon={getPackIcon}
        />
      )}
    </div>
  );
}

function PackCard({
  pack,
  installed,
  installing,
  onSelect,
  onInstall,
  getIcon,
}: {
  pack: IndustryPack;
  installed: boolean;
  installing: boolean;
  onSelect: () => void;
  onInstall: () => void;
  getIcon: (icon: string) => React.ReactNode;
}) {
  return (
    <div
      className={`p-4 bg-slate-900 border rounded-xl cursor-pointer hover:border-violet-500/50 transition ${
        installed ? 'border-green-500/30' : 'border-slate-800'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 bg-slate-800 rounded-lg">{getIcon(pack.icon)}</div>
        {installed && (
          <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-400 rounded-full">
            Installed
          </span>
        )}
      </div>
      <h3 className="font-semibold mb-1">{pack.name}</h3>
      <p className="text-sm text-slate-400 mb-3 line-clamp-2">{pack.description}</p>
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">{pack.industry}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!installed) onInstall();
          }}
          disabled={installed || installing}
          className={`px-3 py-1.5 text-sm rounded-lg transition flex items-center gap-1 ${
            installed
              ? 'bg-green-500/20 text-green-400'
              : 'bg-violet-600 hover:bg-violet-700 text-white'
          }`}
        >
          {installing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : installed ? (
            <>
              <Check className="w-4 h-4" /> Active
            </>
          ) : (
            <>
              <Download className="w-4 h-4" /> Install
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function PackDetailModal({
  pack,
  installed,
  installing,
  onClose,
  onInstall,
  getIcon,
}: {
  pack: IndustryPack;
  installed: boolean;
  installing: boolean;
  onClose: () => void;
  onInstall: () => void;
  getIcon: (icon: string) => React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-violet-600 rounded-xl">{getIcon(pack.icon)}</div>
              <div>
                <h2 className="text-xl font-bold">{pack.name}</h2>
                <p className="text-slate-400">{pack.industry}</p>
              </div>
            </div>
            <button
              onClick={onInstall}
              disabled={installed || installing}
              className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
                installed
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-violet-600 hover:bg-violet-700 text-white'
              }`}
            >
              {installing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : installed ? (
                <>
                  <Check className="w-4 h-4" /> Installed
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" /> Install Pack
                </>
              )}
            </button>
          </div>
          <p className="mt-4 text-slate-300">{pack.description}</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Roles */}
          <div>
            <h3 className="font-semibold mb-2">Best For</h3>
            <div className="flex flex-wrap gap-2">
              {pack.roles.map((role) => (
                <span key={role} className="px-3 py-1 bg-slate-800 rounded-full text-sm">
                  {role}
                </span>
              ))}
            </div>
          </div>

          {/* Features */}
          <div>
            <h3 className="font-semibold mb-2">Features</h3>
            <div className="grid gap-2">
              {pack.features.map((f) => (
                <div key={f.name} className="flex items-start gap-2">
                  <Zap className="w-4 h-4 text-violet-400 mt-0.5" />
                  <div>
                    <span className="font-medium">{f.name}</span>
                    <span className="text-slate-400 text-sm"> — {f.description}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Workflows */}
          <div>
            <h3 className="font-semibold mb-2">Workflows</h3>
            <div className="space-y-2">
              {pack.workflows.map((w) => (
                <div key={w.name} className="p-3 bg-slate-800/50 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{w.name}</span>
                    {w.automatable && (
                      <span className="px-2 py-0.5 text-xs bg-violet-500/20 text-violet-400 rounded-full">
                        Automatable
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-400">{w.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* KPIs */}
          <div>
            <h3 className="font-semibold mb-2">Key Metrics</h3>
            <div className="grid grid-cols-2 gap-2">
              {pack.kpis.map((kpi) => (
                <div key={kpi.name} className="p-3 bg-slate-800/50 rounded-lg">
                  <div className="text-sm text-slate-400">{kpi.name}</div>
                  <div className="font-medium">
                    {kpi.target && `Target: ${kpi.target}`} {kpi.unit}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}