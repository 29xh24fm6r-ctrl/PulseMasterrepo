'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Zap,
  Play,
  Pause,
  Plus,
  Users,
  CheckCircle2,
  Clock,
  ChevronRight,
  Loader2,
  Mail,
  Target,
  RefreshCw,
  MoreVertical,
} from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  description?: string;
  type: string;
  status: string;
  enrolledCount: number;
  completedCount: number;
  steps: CampaignStep[];
  startedAt?: string;
  createdAt: string;
}

interface CampaignStep {
  id: string;
  order: number;
  type: string;
  name: string;
  config: Record<string, any>;
}

interface CampaignTemplate {
  id: string;
  name: string;
  description: string;
  type: string;
  steps: CampaignStep[];
}

interface Enrollment {
  id: string;
  contactName: string;
  contactEmail: string;
  currentStepIndex: number;
  status: string;
  startedAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-700 text-slate-300',
  active: 'bg-green-500/20 text-green-400',
  paused: 'bg-yellow-500/20 text-yellow-400',
  completed: 'bg-blue-500/20 text-blue-400',
};

const TYPE_ICONS: Record<string, string> = {
  nurture: '🌱',
  followup: '📩',
  outreach: '📣',
  reactivation: '🔄',
  custom: '⚡',
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<CampaignTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [campRes, tempRes] = await Promise.all([
        fetch('/api/campaigns'),
        fetch('/api/campaigns?mode=templates'),
      ]);
      const campData = await campRes.json();
      const tempData = await tempRes.json();
      setCampaigns(campData.campaigns || []);
      setTemplates(tempData.templates || []);
    } catch (err) {
      console.error('Failed to load:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadCampaignDetails(campaign: Campaign) {
    setSelectedCampaign(campaign);
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}`);
      const data = await res.json();
      setEnrollments(data.enrollments || []);
    } catch (err) {
      console.error('Failed to load details:', err);
    }
  }

  async function updateStatus(campaignId: string, status: string) {
    try {
      await fetch(`/api/campaigns/${campaignId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      loadData();
      if (selectedCampaign?.id === campaignId) {
        setSelectedCampaign({ ...selectedCampaign, status });
      }
    } catch (err) {
      console.error('Failed to update:', err);
    }
  }

  async function createCampaign(templateId: string, name: string) {
    try {
      await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId, name }),
      });
      setShowCreate(false);
      loadData();
    } catch (err) {
      console.error('Failed to create:', err);
    }
  }

  const activeCampaigns = campaigns.filter((c) => c.status === 'active');
  const draftCampaigns = campaigns.filter((c) => c.status === 'draft');
  const completedCampaigns = campaigns.filter((c) => c.status === 'completed' || c.status === 'paused');

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
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/life" className="p-2 hover:bg-slate-800 rounded-lg transition">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-600 rounded-lg">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Campaigns</h1>
                <p className="text-sm text-slate-400">
                  {activeCampaigns.length} active, {campaigns.reduce((s, c) => s + c.enrolledCount, 0)} enrolled
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 rounded-lg font-medium flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4" /> New Campaign
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Campaign List */}
          <div className="lg:col-span-2 space-y-6">
            {/* Active */}
            {activeCampaigns.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Play className="w-5 h-5 text-green-400" />
                  Active Campaigns
                </h2>
                <div className="space-y-3">
                  {activeCampaigns.map((campaign) => (
                    <CampaignCard
                      key={campaign.id}
                      campaign={campaign}
                      onSelect={() => loadCampaignDetails(campaign)}
                      onStatusChange={updateStatus}
                      isSelected={selectedCampaign?.id === campaign.id}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Drafts */}
            {draftCampaigns.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-slate-400" />
                  Drafts
                </h2>
                <div className="space-y-3">
                  {draftCampaigns.map((campaign) => (
                    <CampaignCard
                      key={campaign.id}
                      campaign={campaign}
                      onSelect={() => loadCampaignDetails(campaign)}
                      onStatusChange={updateStatus}
                      isSelected={selectedCampaign?.id === campaign.id}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Completed/Paused */}
            {completedCampaigns.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-blue-400" />
                  Completed & Paused
                </h2>
                <div className="space-y-3">
                  {completedCampaigns.map((campaign) => (
                    <CampaignCard
                      key={campaign.id}
                      campaign={campaign}
                      onSelect={() => loadCampaignDetails(campaign)}
                      onStatusChange={updateStatus}
                      isSelected={selectedCampaign?.id === campaign.id}
                    />
                  ))}
                </div>
              </section>
            )}

            {campaigns.length === 0 && (
              <div className="text-center py-16">
                <Zap className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No campaigns yet</h3>
                <p className="text-slate-400 mb-4">Create your first campaign to automate follow-ups</p>
                <button
                  onClick={() => setShowCreate(true)}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-700 rounded-lg font-medium transition"
                >
                  Create Campaign
                </button>
              </div>
            )}
          </div>

          {/* Detail Panel */}
          <div className="lg:col-span-1">
            {selectedCampaign ? (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sticky top-24">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold">{selectedCampaign.name}</h3>
                    <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded-full ${STATUS_COLORS[selectedCampaign.status]}`}>
                      {selectedCampaign.status}
                    </span>
                  </div>
                  <span className="text-2xl">{TYPE_ICONS[selectedCampaign.type]}</span>
                </div>

                {selectedCampaign.description && (
                  <p className="text-sm text-slate-400 mb-4">{selectedCampaign.description}</p>
                )}

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-3 bg-slate-800/50 rounded-lg">
                    <div className="text-xl font-bold">{selectedCampaign.enrolledCount}</div>
                    <div className="text-xs text-slate-400">Enrolled</div>
                  </div>
                  <div className="p-3 bg-slate-800/50 rounded-lg">
                    <div className="text-xl font-bold">{selectedCampaign.completedCount}</div>
                    <div className="text-xs text-slate-400">Completed</div>
                  </div>
                </div>

                {/* Steps */}
                <div className="mb-4">
                  <h4 className="text-sm font-medium mb-2">Steps ({selectedCampaign.steps.length})</h4>
                  <div className="space-y-1">
                    {selectedCampaign.steps.map((step, i) => (
                      <div key={step.id} className="flex items-center gap-2 text-sm">
                        <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-xs">
                          {i + 1}
                        </span>
                        <span className="text-slate-300">{step.name}</span>
                        <span className="text-xs text-slate-500">({step.type})</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Enrollments */}
                {enrollments.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Recent Enrollments</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {enrollments.slice(0, 5).map((e) => (
                        <div key={e.id} className="p-2 bg-slate-800/50 rounded-lg text-sm">
                          <div className="font-medium">{e.contactName}</div>
                          <div className="text-xs text-slate-400">
                            Step {e.currentStepIndex + 1} • {e.status}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 mt-4 pt-4 border-t border-slate-800">
                  {selectedCampaign.status === 'draft' && (
                    <button
                      onClick={() => updateStatus(selectedCampaign.id, 'active')}
                      className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium transition flex items-center justify-center gap-1"
                    >
                      <Play className="w-4 h-4" /> Start
                    </button>
                  )}
                  {selectedCampaign.status === 'active' && (
                    <button
                      onClick={() => updateStatus(selectedCampaign.id, 'paused')}
                      className="flex-1 px-3 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-sm font-medium transition flex items-center justify-center gap-1"
                    >
                      <Pause className="w-4 h-4" /> Pause
                    </button>
                  )}
                  {selectedCampaign.status === 'paused' && (
                    <button
                      onClick={() => updateStatus(selectedCampaign.id, 'active')}
                      className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium transition flex items-center justify-center gap-1"
                    >
                      <Play className="w-4 h-4" /> Resume
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
                <Target className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                <p className="text-slate-500">Select a campaign to view details</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Create Modal */}
      {showCreate && (
        <CreateCampaignModal
          templates={templates}
          onClose={() => setShowCreate(false)}
          onCreate={createCampaign}
        />
      )}
    </div>
  );
}

function CampaignCard({
  campaign,
  onSelect,
  onStatusChange,
  isSelected,
}: {
  campaign: Campaign;
  onSelect: () => void;
  onStatusChange: (id: string, status: string) => void;
  isSelected: boolean;
}) {
  return (
    <div
      onClick={onSelect}
      className={`p-4 bg-slate-900 border rounded-xl cursor-pointer transition ${
        isSelected ? 'border-violet-500' : 'border-slate-800 hover:border-slate-700'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{TYPE_ICONS[campaign.type]}</span>
          <div>
            <h3 className="font-medium">{campaign.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-0.5 text-xs rounded-full ${STATUS_COLORS[campaign.status]}`}>
                {campaign.status}
              </span>
              <span className="text-xs text-slate-500">
                {campaign.steps.length} steps
              </span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 text-sm">
            <Users className="w-4 h-4 text-slate-500" />
            <span>{campaign.enrolledCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function CreateCampaignModal({
  templates,
  onClose,
  onCreate,
}: {
  templates: CampaignTemplate[];
  onClose: () => void;
  onCreate: (templateId: string, name: string) => void;
}) {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    if (!selectedTemplate || !name.trim()) return;
    setCreating(true);
    await onCreate(selectedTemplate, name);
    setCreating(false);
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold mb-4">Create Campaign</h2>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Campaign Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Q4 Client Nurture"
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl focus:outline-none focus:border-violet-500"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Choose Template</label>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {templates.map((template) => (
              <div
                key={template.id}
                onClick={() => setSelectedTemplate(template.id)}
                className={`p-4 border rounded-xl cursor-pointer transition ${
                  selectedTemplate === template.id
                    ? 'border-violet-500 bg-violet-500/10'
                    : 'border-slate-700 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span>{TYPE_ICONS[template.type]}</span>
                  <span className="font-medium">{template.name}</span>
                </div>
                <p className="text-sm text-slate-400">{template.description}</p>
                <div className="text-xs text-slate-500 mt-2">{template.steps.length} steps</div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl transition"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!selectedTemplate || !name.trim() || creating}
            className="flex-1 px-4 py-3 bg-violet-600 hover:bg-violet-700 rounded-xl font-medium transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}