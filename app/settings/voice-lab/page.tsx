// Persona Lab UI
// app/settings/voice-lab/page.tsx

"use client";

import { useState, useEffect } from "react";
import {
  Sparkles,
  Users,
  TrendingUp,
  Wand2,
  Settings,
  Play,
  Save,
  X,
  Plus,
} from "lucide-react";
import Link from "next/link";

export default function PersonaLabPage() {
  const [personas, setPersonas] = useState<any>({ base: [], generated: [], fusions: [] });
  const [masks, setMasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"gallery" | "fusion" | "evolution" | "generator" | "rules" | "masks" | "memory" | "motion" | "dna">("gallery");

  // Fusion state
  const [fusionA, setFusionA] = useState("");
  const [fusionB, setFusionB] = useState("");
  const [fusionWeight, setFusionWeight] = useState(50);
  const [fusionPreview, setFusionPreview] = useState<any>(null);

  // Generator state
  const [generatorPrompt, setGeneratorPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedPreview, setGeneratedPreview] = useState<any>(null);

  // Evolution state
  const [evolutionPersona, setEvolutionPersona] = useState("");
  const [evolutionStage, setEvolutionStage] = useState<"base" | "apprentice" | "mastery" | "legend">("base");
  const [evolutionPreview, setEvolutionPreview] = useState<any>(null);

  // Memory state
  const [selectedPersonaForMemory, setSelectedPersonaForMemory] = useState("");
  const [selectedCoachForMemory, setSelectedCoachForMemory] = useState("");
  const [userState, setUserState] = useState<any>(null);
  const [memoryAdaptationEnabled, setMemoryAdaptationEnabled] = useState(true);

  // Motion state
  const [motionProfileKey, setMotionProfileKey] = useState("gentle_arc");
  const [motionPreviewText, setMotionPreviewText] = useState("");
  const [motionPreviewResult, setMotionPreviewResult] = useState<any>(null);
  const [motionProfiles, setMotionProfiles] = useState<any[]>([]);

  // DNA state
  const [selectedPersonaForDNA, setSelectedPersonaForDNA] = useState("");
  const [personaDNA, setPersonaDNA] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [personasRes, masksRes, motionRes] = await Promise.all([
        fetch("/api/personas/list"),
        fetch("/api/personas/masks"),
        fetch("/api/personas/motion-profiles"),
      ]);

      if (personasRes.ok) {
        const personasData = await personasRes.json();
        setPersonas(personasData);
      }

      if (masksRes.ok) {
        const masksData = await masksRes.json();
        setMasks(masksData.masks || []);
      }

      if (motionRes.ok) {
        const motionData = await motionRes.json();
        setMotionProfiles(motionData.profiles || []);
      }
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadUserState() {
    if (!selectedPersonaForMemory) return;

    try {
      const res = await fetch(
        `/api/personas/user-state?personaId=${selectedPersonaForMemory}&coachId=${selectedCoachForMemory || ""}`
      );
      if (res.ok) {
        const data = await res.json();
        setUserState(data.userState);
      }
    } catch (err) {
      console.error("Failed to load user state:", err);
    }
  }

  async function resetUserState() {
    if (!selectedPersonaForMemory) return;

    try {
      const res = await fetch("/api/personas/user-state/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personaId: selectedPersonaForMemory,
          coachId: selectedCoachForMemory || null,
        }),
      });
      if (res.ok) {
        alert("User state reset!");
        await loadUserState();
      }
    } catch (err) {
      console.error("Failed to reset:", err);
      alert("Failed to reset");
    }
  }

  async function previewMotion() {
    if (!motionPreviewText || !selectedPersonaForMemory) return;

    try {
      const res = await fetch("/api/personas/motion-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personaId: selectedPersonaForMemory,
          motionProfileKey: motionProfileKey,
          text: motionPreviewText,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setMotionPreviewResult(data);
      }
    } catch (err) {
      console.error("Failed to preview motion:", err);
    }
  }

  async function loadPersonaDNA() {
    if (!selectedPersonaForDNA) return;

    try {
      const res = await fetch(`/api/personas/dna/${selectedPersonaForDNA}`);
      if (res.ok) {
        const data = await res.json();
        setPersonaDNA(data.dna);
      }
    } catch (err) {
      console.error("Failed to load DNA:", err);
    }
  }

  async function previewFusion() {
    if (!fusionA || !fusionB) return;

    try {
      const res = await fetch("/api/personas/fuse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personaAKey: fusionA,
          personaBKey: fusionB,
          weightA: fusionWeight,
          weightB: 100 - fusionWeight,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setFusionPreview(data.fusion);
      }
    } catch (err) {
      console.error("Failed to preview fusion:", err);
    }
  }

  async function saveFusion() {
    if (!fusionA || !fusionB || !fusionPreview) return;

    try {
      const res = await fetch("/api/personas/fuse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personaAKey: fusionA,
          personaBKey: fusionB,
          weightA: fusionWeight,
          weightB: 100 - fusionWeight,
          name: `${fusionPreview.name}`,
        }),
      });

      if (res.ok) {
        alert("Fusion saved!");
        await loadData();
        setFusionPreview(null);
      }
    } catch (err) {
      console.error("Failed to save fusion:", err);
      alert("Failed to save fusion");
    }
  }

  async function generatePersona() {
    if (!generatorPrompt) return;

    setGenerating(true);
    try {
      const res = await fetch("/api/personas/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: generatorPrompt }),
      });

      if (res.ok) {
        const data = await res.json();
        setGeneratedPreview(data.persona);
        alert("Persona generated!");
        await loadData();
      } else {
        alert("Failed to generate persona");
      }
    } catch (err) {
      console.error("Failed to generate:", err);
      alert("Failed to generate persona");
    } finally {
      setGenerating(false);
    }
  }

  async function previewEvolution() {
    if (!evolutionPersona) return;

    try {
      const res = await fetch(`/api/personas/evolve?personaKey=${evolutionPersona}&stage=${evolutionStage}`);
      if (res.ok) {
        const data = await res.json();
        setEvolutionPreview(data.persona);
      }
    } catch (err) {
      console.error("Failed to preview evolution:", err);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="text-zinc-400">Loading Persona Lab...</div>
      </div>
    );
  }

  const allPersonas = [...personas.base, ...personas.generated, ...personas.fusions];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-violet-400" />
          <div>
            <h1 className="text-3xl font-bold text-white">Persona Lab</h1>
            <p className="text-sm text-zinc-400">
              Create, fuse, evolve, and experiment with voice personas
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-zinc-800">
          {[
            { id: "gallery", label: "Gallery", icon: Users },
            { id: "fusion", label: "Fusion", icon: TrendingUp },
            { id: "evolution", label: "Evolution", icon: TrendingUp },
            { id: "generator", label: "Generator", icon: Wand2 },
            { id: "masks", label: "Masks", icon: Users },
            { id: "memory", label: "Memory", icon: Settings },
            { id: "motion", label: "Motion", icon: Play },
            { id: "dna", label: "DNA", icon: Sparkles },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === tab.id
                  ? "border-violet-500 text-violet-400"
                  : "border-transparent text-zinc-400 hover:text-zinc-300"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Gallery Tab */}
        {activeTab === "gallery" && (
          <div className="grid gap-4 md:grid-cols-3">
            {allPersonas.map((persona: any) => (
              <div
                key={persona.id || persona.key}
                className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 space-y-3"
              >
                <div>
                  <div className="font-semibold text-white">{persona.name}</div>
                  <div className="text-xs text-zinc-400">{persona.description}</div>
                </div>
                <div className="text-xs text-zinc-500 space-y-1">
                  <div>Energy: {persona.style?.energy || 0}</div>
                  <div>Warmth: {persona.style?.warmth || 0}</div>
                  <div>Decisiveness: {persona.style?.decisiveness || 0}</div>
                </div>
                <button
                  onClick={async () => {
                    const preview = await fetch("/api/voices/preview", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        voiceKey: persona.key || persona.id,
                        sampleText: "This is how I sound. I adapt my style to match your needs.",
                      }),
                    });
                    const data = await preview.json();
                    alert(`Preview: ${data.text}`);
                  }}
                  className="w-full px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <Play className="w-3 h-3" />
                  Preview
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Fusion Tab */}
        {activeTab === "fusion" && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">Persona Fusion</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm text-zinc-400 mb-2 block">Persona A</label>
                <select
                  value={fusionA}
                  onChange={(e) => setFusionA(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
                >
                  <option value="">Select persona...</option>
                  {allPersonas.map((p: any) => (
                    <option key={p.id || p.key} value={p.key || p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-zinc-400 mb-2 block">Persona B</label>
                <select
                  value={fusionB}
                  onChange={(e) => setFusionB(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
                >
                  <option value="">Select persona...</option>
                  {allPersonas.map((p: any) => (
                    <option key={p.id || p.key} value={p.key || p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm text-zinc-400 mb-2 block">
                Weight A: {fusionWeight}% / Weight B: {100 - fusionWeight}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={fusionWeight}
                onChange={(e) => setFusionWeight(parseInt(e.target.value))}
                className="w-full"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={previewFusion}
                disabled={!fusionA || !fusionB}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded transition-colors disabled:opacity-50"
              >
                Preview Fusion
              </button>
              {fusionPreview && (
                <button
                  onClick={saveFusion}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save Fusion
                </button>
              )}
            </div>
            {fusionPreview && (
              <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
                <div className="font-semibold text-white mb-2">{fusionPreview.name}</div>
                <div className="text-xs text-zinc-400 space-y-1">
                  <div>Energy: {fusionPreview.style?.energy}</div>
                  <div>Warmth: {fusionPreview.style?.warmth}</div>
                  <div>Decisiveness: {fusionPreview.style?.decisiveness}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Evolution Tab */}
        {activeTab === "evolution" && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">Persona Evolution</h2>
            <div>
              <label className="text-sm text-zinc-400 mb-2 block">Select Persona</label>
              <select
                value={evolutionPersona}
                onChange={(e) => setEvolutionPersona(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
              >
                <option value="">Select persona...</option>
                {allPersonas.map((p: any) => (
                  <option key={p.id || p.key} value={p.key || p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-zinc-400 mb-2 block">Evolution Stage</label>
              <div className="flex gap-2">
                {(["base", "apprentice", "mastery", "legend"] as const).map((stage) => (
                  <button
                    key={stage}
                    onClick={() => {
                      setEvolutionStage(stage);
                      previewEvolution();
                    }}
                    className={`px-4 py-2 rounded transition-colors ${
                      evolutionStage === stage
                        ? "bg-violet-600 text-white"
                        : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                    }`}
                  >
                    {stage.charAt(0).toUpperCase() + stage.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={previewEvolution}
              disabled={!evolutionPersona}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded transition-colors disabled:opacity-50"
            >
              Preview Evolution
            </button>
            {evolutionPreview && (
              <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
                <div className="font-semibold text-white mb-2">{evolutionPreview.name}</div>
                <div className="text-xs text-zinc-400 space-y-1">
                  <div>Energy: {evolutionPreview.style?.energy}</div>
                  <div>Warmth: {evolutionPreview.style?.warmth}</div>
                  <div>Decisiveness: {evolutionPreview.style?.decisiveness}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Generator Tab */}
        {activeTab === "generator" && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">AI Persona Generator</h2>
            <div>
              <label className="text-sm text-zinc-400 mb-2 block">
                Describe your ideal persona
              </label>
              <textarea
                value={generatorPrompt}
                onChange={(e) => setGeneratorPrompt(e.target.value)}
                placeholder="e.g., A mix of Morgan Freeman, Yoda, and Jocko Willink with calm authority"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white min-h-[100px]"
              />
            </div>
            <button
              onClick={generatePersona}
              disabled={!generatorPrompt || generating}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <Wand2 className="w-4 h-4" />
              {generating ? "Generating..." : "Generate Persona"}
            </button>
            {generatedPreview && (
              <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
                <div className="font-semibold text-white mb-2">{generatedPreview.name}</div>
                <div className="text-sm text-zinc-400 mb-2">{generatedPreview.description}</div>
                <div className="text-xs text-zinc-500 space-y-1">
                  <div>Energy: {generatedPreview.style?.energy}</div>
                  <div>Warmth: {generatedPreview.style?.warmth}</div>
                  {generatedPreview.sampleLines && generatedPreview.sampleLines.length > 0 && (
                    <div className="mt-2">
                      <div className="text-zinc-400 mb-1">Sample Lines:</div>
                      {generatedPreview.sampleLines.map((line: string, idx: number) => (
                        <div key={idx} className="text-zinc-300">• {line}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Memory Tab */}
        {activeTab === "memory" && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">Memory & Calibration</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-zinc-400 mb-2 block">Select Persona</label>
                <select
                  value={selectedPersonaForMemory}
                  onChange={(e) => {
                    setSelectedPersonaForMemory(e.target.value);
                    loadUserState();
                  }}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
                >
                  <option value="">Select persona...</option>
                  {allPersonas.map((p: any) => (
                    <option key={p.id || p.key} value={p.id || p.key}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-zinc-400 mb-2 block">Coach (optional)</label>
                <input
                  type="text"
                  value={selectedCoachForMemory}
                  onChange={(e) => {
                    setSelectedCoachForMemory(e.target.value);
                    loadUserState();
                  }}
                  placeholder="e.g., sales, confidant"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
                />
              </div>
              {userState && (
                <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-white">How I See You</h3>
                    <button
                      onClick={resetUserState}
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                    >
                      Reset to Default
                    </button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 text-sm">
                    <div>
                      <div className="text-zinc-400">Usage Count</div>
                      <div className="text-white font-semibold">{userState.usage_count || 0}</div>
                    </div>
                    <div>
                      <div className="text-zinc-400">Approval Ratio</div>
                      <div className="text-white font-semibold">
                        {userState.approval_count || 0} / {userState.rejection_count || 0}
                      </div>
                    </div>
                    <div>
                      <div className="text-zinc-400">Energy Delta</div>
                      <div className="text-white font-semibold">
                        {userState.avg_energy_delta > 0 ? "+" : ""}
                        {userState.avg_energy_delta || 0}
                      </div>
                    </div>
                    <div>
                      <div className="text-zinc-400">Warmth Delta</div>
                      <div className="text-white font-semibold">
                        {userState.avg_warmth_delta > 0 ? "+" : ""}
                        {userState.avg_warmth_delta || 0}
                      </div>
                    </div>
                    <div>
                      <div className="text-zinc-400">Directiveness Delta</div>
                      <div className="text-white font-semibold">
                        {userState.avg_directiveness_delta > 0 ? "+" : ""}
                        {userState.avg_directiveness_delta || 0}
                      </div>
                    </div>
                    {userState.preferred_pacing && (
                      <div>
                        <div className="text-zinc-400">Preferred Pacing</div>
                        <div className="text-white font-semibold capitalize">
                          {userState.preferred_pacing}
                        </div>
                      </div>
                    )}
                    {userState.preferred_sentence_length && (
                      <div>
                        <div className="text-zinc-400">Preferred Length</div>
                        <div className="text-white font-semibold capitalize">
                          {userState.preferred_sentence_length}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="pt-3 border-t border-zinc-700">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={memoryAdaptationEnabled}
                        onChange={(e) => setMemoryAdaptationEnabled(e.target.checked)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-zinc-300">
                        Let this persona adapt to me
                      </span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Motion Tab */}
        {activeTab === "motion" && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">Motion Preview</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-zinc-400 mb-2 block">Select Persona</label>
                <select
                  value={selectedPersonaForMemory}
                  onChange={(e) => setSelectedPersonaForMemory(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
                >
                  <option value="">Select persona...</option>
                  {allPersonas.map((p: any) => (
                    <option key={p.id || p.key} value={p.id || p.key}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-zinc-400 mb-2 block">Motion Profile</label>
                <select
                  value={motionProfileKey}
                  onChange={(e) => setMotionProfileKey(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
                >
                  {motionProfiles.map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.name} - {p.description}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-zinc-400 mb-2 block">Sample Text</label>
                <textarea
                  value={motionPreviewText}
                  onChange={(e) => setMotionPreviewText(e.target.value)}
                  placeholder="Enter sample text to see how motion phases transform it..."
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white min-h-[150px]"
                />
              </div>
              <button
                onClick={previewMotion}
                disabled={!selectedPersonaForMemory || !motionPreviewText}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                Preview Motion
              </button>
              {motionPreviewResult && (
                <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 space-y-3">
                  <h3 className="font-semibold text-white">Phased Response</h3>
                  {motionPreviewResult.phases.map((phase: any, idx: number) => (
                    <div key={idx} className="border-l-2 border-violet-500 pl-3">
                      <div className="text-xs text-violet-400 mb-1 font-semibold">
                        Phase {idx + 1}: {phase.id}
                      </div>
                      <div className="text-sm text-zinc-300">{phase.segment}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* DNA Tab */}
        {activeTab === "dna" && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">Persona DNA Viewer</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-zinc-400 mb-2 block">Select Persona</label>
                <select
                  value={selectedPersonaForDNA}
                  onChange={(e) => {
                    setSelectedPersonaForDNA(e.target.value);
                    loadPersonaDNA();
                  }}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
                >
                  <option value="">Select persona...</option>
                  {allPersonas.map((p: any) => (
                    <option key={p.id || p.key} value={p.id || p.key}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              {personaDNA && (
                <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 space-y-4">
                  <div className="font-semibold text-white">DNA Blueprint (v{personaDNA.version})</div>
                  <div className="space-y-3 text-sm">
                    <div>
                      <div className="text-zinc-400 mb-1">Tone Genes</div>
                      <div className="text-zinc-300 ml-4">
                        Energy: {personaDNA.genes.tone.energy}, Warmth: {personaDNA.genes.tone.warmth}, Pacing: {personaDNA.genes.tone.pacing}
                      </div>
                    </div>
                    <div>
                      <div className="text-zinc-400 mb-1">Cognition Genes</div>
                      <div className="text-zinc-300 ml-4">
                        Structure: {personaDNA.genes.cognition.structure_level}, Abstraction: {personaDNA.genes.cognition.abstraction_level}
                      </div>
                    </div>
                    <div>
                      <div className="text-zinc-400 mb-1">Relational Genes</div>
                      <div className="text-zinc-300 ml-4">
                        Empathy: {personaDNA.genes.relational.empathy_bias}, Challenge: {personaDNA.genes.relational.challenge_bias}
                      </div>
                    </div>
                    <div>
                      <div className="text-zinc-400 mb-1">Motivation Genes</div>
                      <div className="text-zinc-300 ml-4">
                        Push vs Pull: {personaDNA.genes.motivation.push_vs_pull}, Risk Tolerance: {personaDNA.genes.motivation.risk_tolerance}
                      </div>
                    </div>
                    <div>
                      <div className="text-zinc-400 mb-1">Narrative Genes</div>
                      <div className="text-zinc-300 ml-4">
                        Metaphor Density: {personaDNA.genes.narrative.metaphor_density}, Story Usage: {personaDNA.genes.narrative.story_usage}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Masks Tab */}
        {activeTab === "masks" && (
          <div className="space-y-4">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Roleplay Masks</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {masks.map((mask) => (
                  <div
                    key={mask.id}
                    className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-white">{mask.name}</div>
                      <div className="text-xs text-zinc-400">Difficulty: {mask.difficulty}/10</div>
                    </div>
                    <div className="text-xs text-zinc-400">{mask.description}</div>
                    <div className="text-xs text-zinc-500 space-y-1">
                      <div>Energy: {mask.style?.energy}</div>
                      <div>Warmth: {mask.style?.warmth}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

