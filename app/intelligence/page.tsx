"use client";

export const dynamic = "force-dynamic";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type ContactProfile = {
  name: string;
  email: string | null;
  company: string | null;
  role: string | null;
  webResults: Array<{
    title: string;
    description: string;
    url: string;
  }>;
  analysis: {
    background: string;
    professionalFocus: string[];
    communicationStyle: string;
    likelyConcerns: string[];
    motivations: string[];
    decisionMakingStyle: string;
    howToApproach: string[];
    whatToAvoid: string[];
    predictedMindset: string;
    talkingPoints: string[];
    questionsToAsk: string[];
    onlinePresence?: string;
    contentThemes?: string[];
    icebreakers?: string[];
    industryIntelligence?: {
      sector: string;
      currentTrends: string[];
      recentDisruptions: string[];
      commonChallenges: string[];
      opportunities: string[];
      competitors: string[];
    };
    conversationScripts?: {
      openers: string[];
      industryInsightLines: string[];
      valueStatements: string[];
      followUpLines: string[];
      closingLines: string[];
    };
  };
researchedAt: string;
  confidence: "low" | "medium" | "high";
  categorizedResults?: Array<{
    category: string;
    icon: string;
    results: Array<{
      title: string;
      description: string;
      url: string;
    }>;
  }>;
};

type SearchResult = {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
};

export default function IntelligencePage() {
  const searchParams = useSearchParams();
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  
  // Manual entry state
  const [manualName, setManualName] = useState("");
  const [manualCompany, setManualCompany] = useState("");
  const [manualRole, setManualRole] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [manualContext, setManualContext] = useState("");
  
  // Research state
  const [researching, setResearching] = useState(false);
  const [profile, setProfile] = useState<ContactProfile | null>(null);
  const [briefing, setBriefing] = useState<string | null>(null);
  const [generatingBriefing, setGeneratingBriefing] = useState(false);
  const [savingIntel, setSavingIntel] = useState(false);
  const [intelSaved, setIntelSaved] = useState(false);
  const [currentContactId, setCurrentContactId] = useState<string | null>(null);
  
  // UI state
  const [activeTab, setActiveTab] = useState<"search" | "manual">("search");
  const [activeSection, setActiveSection] = useState<"overview" | "approach" | "industry" | "scripts" | "prepare" | "sources">("overview");

  // Check for URL parameters on load (from Second Brain)
  useEffect(() => {
    const name = searchParams.get("name");
    const company = searchParams.get("company");
    const role = searchParams.get("role");
    const email = searchParams.get("email");
    const contactId = searchParams.get("contactId");
    
    if (name) {
      // Pre-fill form
      setManualName(name);
      setManualCompany(company || "");
      setManualRole(role || "");
      setManualEmail(email || "");
      setActiveTab("manual");
      
      // Auto-start research
      autoResearch(name, company, role, email, contactId);
    }
  }, [searchParams]);

  // Auto-research function for URL parameters
  async function autoResearch(name: string, company: string | null, role: string | null, email: string | null, contactId: string | null) {
    setResearching(true);
    setProfile(null);
    setBriefing(null);
    setIntelSaved(false);
    setCurrentContactId(contactId);
    
    try {
      const res = await fetch("/api/intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: contactId ? "research-contact" : "research",
          contactId: contactId || undefined,
          name,
          company,
          role,
          email,
        }),
      });
      
      const data = await res.json();
      
      if (data.ok) {
        setProfile(data.profile);
      }
    } catch (err) {
      console.error("Research error:", err);
    } finally {
      setResearching(false);
    }
  }

  // Search contacts
  async function searchContacts() {
    if (!searchQuery.trim()) return;
    
    setSearching(true);
    setSearchResults([]);
    
    try {
      const res = await fetch(`/api/intelligence?action=search&query=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      
      if (data.ok) {
        setSearchResults(data.contacts || []);
      }
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setSearching(false);
    }
  }

  // Research a contact from search
  async function researchFromContact(contact: SearchResult) {
    setResearching(true);
    setProfile(null);
    setBriefing(null);
    
    try {
      const res = await fetch("/api/intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "research-contact",
          contactId: contact.id,
        }),
      });
      
      const data = await res.json();
      
      if (data.ok) {
        setProfile(data.profile);
      }
    } catch (err) {
      console.error("Research error:", err);
    } finally {
      setResearching(false);
    }
  }

  // Research manually entered contact
  async function researchManual() {
    if (!manualName.trim()) return;
    
    setResearching(true);
    setProfile(null);
    setBriefing(null);
    
    try {
      const res = await fetch("/api/intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "research",
          name: manualName,
          company: manualCompany || null,
          role: manualRole || null,
          email: manualEmail || null,
          existingContext: manualContext || null,
        }),
      });
      
      const data = await res.json();
      
      if (data.ok) {
        setProfile(data.profile);
      }
    } catch (err) {
      console.error("Research error:", err);
    } finally {
      setResearching(false);
    }
  }

  // Generate pre-call briefing
  async function generateBriefing() {
    if (!profile) return;
    
    setGeneratingBriefing(true);
    setBriefing(null);
    
    try {
      const res = await fetch("/api/intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "briefing",
          name: profile.name,
          company: profile.company,
          role: profile.role,
          email: profile.email,
        }),
      });
      
      const data = await res.json();
      
      if (data.ok) {
        setBriefing(data.briefing);
      }
    } catch (err) {
      console.error("Briefing error:", err);
    } finally {
      setGeneratingBriefing(false);
    }
  }

  // Clear and start over
  function clearResults() {
    setProfile(null);
    setBriefing(null);
    setSearchQuery("");
    setSearchResults([]);
    setManualName("");
    setManualCompany("");
    setManualRole("");
    setManualEmail("");
    setManualContext("");
    setIntelSaved(false);
    setCurrentContactId(null);
  }

  // Save intel to Notion contact
  async function saveIntelToContact() {
    if (!currentContactId || !profile) return;
    
    setSavingIntel(true);
    
    try {
      const res = await fetch("/api/intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save-intel",
          contactId: currentContactId,
          analysis: profile.analysis,
        }),
      });
      
      const data = await res.json();
      
      if (data.ok) {
        setIntelSaved(true);
      } else {
        console.error("Failed to save intel:", data.error);
        alert("Failed to save intel: " + data.error);
      }
    } catch (err) {
      console.error("Save error:", err);
      alert("Failed to save intel");
    } finally {
      setSavingIntel(false);
    }
  }

 const confidenceColor: Record<string, string> = {
  low: "text-yellow-400 bg-yellow-900/30 border-yellow-500/30",
  medium: "text-blue-400 bg-blue-900/30 border-blue-500/30",
  high: "text-green-400 bg-green-900/30 border-green-500/30",
};

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6">
      {/* Header */}
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
            🔮 Relationship Intelligence
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Read minds. Predict thoughts. Master communication.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/second-brain" className="px-4 py-2 bg-slate-800 rounded-xl hover:bg-slate-700">
            👥 Contacts
          </Link>
          <Link href="/morning-brief" className="px-4 py-2 bg-slate-800 rounded-xl hover:bg-slate-700">
            🌅 Brief
          </Link>
          <Link href="/" className="px-4 py-2 bg-slate-800 rounded-xl hover:bg-slate-700">
            🏠 Dashboard
          </Link>
        </div>
      </header>

      {/* No Profile Yet - Show Search/Manual Entry */}
      {!profile && !researching && (
        <div className="max-w-2xl mx-auto">
          {/* Intro */}
          <section className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 border border-purple-500/30 rounded-3xl p-8 mb-8 text-center">
            <div className="text-6xl mb-4">🔮</div>
            <h2 className="text-2xl font-bold mb-2">The Relationship Oracle</h2>
            <p className="text-slate-400 mb-4">
              Enter anyone&apos;s name and I&apos;ll research them, analyze their psychology,
              and tell you exactly how to communicate with them.
            </p>
            <div className="flex justify-center gap-4 text-sm text-slate-500">
              <span>🧠 Predict their thinking</span>
              <span>💬 Communication guide</span>
              <span>📞 Pre-call prep</span>
            </div>
          </section>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab("search")}
              className={`px-4 py-2 rounded-lg font-medium ${activeTab === "search" ? "bg-purple-500 text-white" : "bg-slate-800 text-slate-300"}`}
            >
              🔍 Search Contacts
            </button>
            <button
              onClick={() => setActiveTab("manual")}
              className={`px-4 py-2 rounded-lg font-medium ${activeTab === "manual" ? "bg-purple-500 text-white" : "bg-slate-800 text-slate-300"}`}
            >
              ✏️ Enter Manually
            </button>
          </div>

          {/* Search Tab */}
          {activeTab === "search" && (
            <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-lg font-semibold mb-4">Search Your Contacts</h3>
              
              <div className="flex gap-3 mb-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchContacts()}
                  placeholder="Search by name or email..."
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 focus:border-purple-500 outline-none"
                />
                <button
                  onClick={searchContacts}
                  disabled={searching || !searchQuery.trim()}
                  className="px-6 py-3 bg-purple-500 text-white font-semibold rounded-xl disabled:opacity-50"
                >
                  {searching ? "🔍..." : "🔍 Search"}
                </button>
              </div>

              {searchResults.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-slate-400 mb-2">{searchResults.length} contacts found:</p>
                  {searchResults.map((contact) => (
                    <div
                      key={contact.id}
                      onClick={() => researchFromContact(contact)}
                      className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl cursor-pointer hover:border-purple-500/50 hover:bg-slate-800 transition-all"
                    >
                      <div className="font-medium text-slate-200">{contact.name}</div>
                      <div className="text-sm text-slate-400">
                        {contact.company && <span>{contact.company}</span>}
                        {contact.email && <span className="ml-2">• {contact.email}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {searchQuery && searchResults.length === 0 && !searching && (
                <p className="text-slate-500 text-center py-4">No contacts found. Try manual entry.</p>
              )}
            </section>
          )}

          {/* Manual Entry Tab */}
          {activeTab === "manual" && (
            <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-lg font-semibold mb-4">Research Anyone</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Name *</label>
                  <input
                    type="text"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    placeholder="John Smith"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 focus:border-purple-500 outline-none"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Company</label>
                    <input
                      type="text"
                      value={manualCompany}
                      onChange={(e) => setManualCompany(e.target.value)}
                      placeholder="Acme Corp"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 focus:border-purple-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Role/Title</label>
                    <input
                      type="text"
                      value={manualRole}
                      onChange={(e) => setManualRole(e.target.value)}
                      placeholder="VP of Sales"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 focus:border-purple-500 outline-none"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Email (optional)</label>
                  <input
                    type="email"
                    value={manualEmail}
                    onChange={(e) => setManualEmail(e.target.value)}
                    placeholder="john@acme.com"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 focus:border-purple-500 outline-none"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-slate-400 mb-1">What do you already know? (optional)</label>
                  <textarea
                    value={manualContext}
                    onChange={(e) => setManualContext(e.target.value)}
                    placeholder="We spoke last week about a potential deal. He mentioned concerns about timeline..."
                    rows={3}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 focus:border-purple-500 outline-none resize-none"
                  />
                </div>
                
                <button
                  onClick={researchManual}
                  disabled={!manualName.trim()}
                  className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl text-lg disabled:opacity-50"
                >
                  🔮 Research This Person
                </button>
              </div>
            </section>
          )}
        </div>
      )}

      {/* Researching State */}
      {researching && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="text-6xl mb-4 animate-pulse">🔮</div>
          <div className="text-xl text-slate-400 mb-2">Reading their mind...</div>
          <div className="text-sm text-slate-500">Searching the web • Analyzing psychology • Building profile</div>
        </div>
      )}

      {/* Profile Results */}
      {profile && !researching && (
        <div className="max-w-5xl mx-auto">
          {/* Profile Header */}
          <section className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 border border-purple-500/30 rounded-3xl p-6 mb-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-1">{profile.name}</h2>
                <div className="text-slate-400">
                  {profile.role && <span>{profile.role}</span>}
                  {profile.company && <span> at {profile.company}</span>}
                </div>
                {profile.email && <div className="text-sm text-slate-500">{profile.email}</div>}
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${confidenceColor[profile.confidence]}`}>
                  {profile.confidence.toUpperCase()} confidence
                </span>
                {currentContactId && (
                  <button
                    onClick={saveIntelToContact}
                    disabled={savingIntel || intelSaved}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                      intelSaved 
                        ? "bg-green-900/30 border border-green-500/30 text-green-400" 
                        : "bg-gradient-to-r from-emerald-500 to-green-500 text-white hover:from-emerald-400 hover:to-green-400"
                    } disabled:opacity-50`}
                  >
                    {savingIntel ? "💾 Saving..." : intelSaved ? "✅ Saved!" : "💾 Save to Contact"}
                  </button>
                )}
                <button
                  onClick={clearResults}
                  className="px-4 py-2 bg-slate-800 rounded-xl hover:bg-slate-700 text-sm"
                >
                  🔍 New Search
                </button>
              </div>
            </div>
          </section>

          {/* Section Tabs */}
          <div className="flex gap-2 mb-6 flex-wrap">
            <button
              onClick={() => setActiveSection("overview")}
              className={`px-4 py-2 rounded-lg font-medium ${activeSection === "overview" ? "bg-purple-500 text-white" : "bg-slate-800 text-slate-300"}`}
            >
              🧠 Mind Reader
            </button>
            <button
              onClick={() => setActiveSection("approach")}
              className={`px-4 py-2 rounded-lg font-medium ${activeSection === "approach" ? "bg-purple-500 text-white" : "bg-slate-800 text-slate-300"}`}
            >
              💬 How to Approach
            </button>
            <button
              onClick={() => setActiveSection("industry")}
              className={`px-4 py-2 rounded-lg font-medium ${activeSection === "industry" ? "bg-purple-500 text-white" : "bg-slate-800 text-slate-300"}`}
            >
              🏭 Industry Intel
            </button>
            <button
              onClick={() => setActiveSection("scripts")}
              className={`px-4 py-2 rounded-lg font-medium ${activeSection === "scripts" ? "bg-purple-500 text-white" : "bg-slate-800 text-slate-300"}`}
            >
              📝 Scripts
            </button>
            <button
              onClick={() => setActiveSection("prepare")}
              className={`px-4 py-2 rounded-lg font-medium ${activeSection === "prepare" ? "bg-purple-500 text-white" : "bg-slate-800 text-slate-300"}`}
            >
              📞 Call Prep
            </button>
            <button
              onClick={() => setActiveSection("sources")}
              className={`px-4 py-2 rounded-lg font-medium ${activeSection === "sources" ? "bg-purple-500 text-white" : "bg-slate-800 text-slate-300"}`}
            >
              🔗 Sources ({profile.webResults.length})
            </button>
          </div>

          {/* Overview Section */}
          {activeSection === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Background */}
              <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <span>👤</span> Background
                </h3>
                <p className="text-slate-300 leading-relaxed">{profile.analysis.background}</p>
              </section>

              {/* Predicted Mindset */}
              <section className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-purple-500/30 rounded-2xl p-6">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <span>🔮</span> What They&apos;re Thinking Right Now
                </h3>
                <p className="text-purple-200 leading-relaxed italic">&ldquo;{profile.analysis.predictedMindset}&rdquo;</p>
              </section>

              {/* Online Presence - NEW */}
              {profile.analysis.onlinePresence && (
                <section className="bg-cyan-900/10 border border-cyan-500/30 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-cyan-400">
                    <span>🌐</span> Online Presence
                  </h3>
                  <p className="text-slate-300 leading-relaxed">{profile.analysis.onlinePresence}</p>
                </section>
              )}

              {/* Content Themes - NEW */}
              {profile.analysis.contentThemes && profile.analysis.contentThemes.length > 0 && (
                <section className="bg-indigo-900/10 border border-indigo-500/30 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-indigo-400">
                    <span>📚</span> Content Themes
                  </h3>
                  <ul className="space-y-2">
                    {profile.analysis.contentThemes.map((theme: string, i: number) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-indigo-400 mt-1">•</span>
                        <span className="text-slate-300">{theme}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Professional Focus */}
              <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <span>🎯</span> Professional Focus
                </h3>
                <ul className="space-y-2">
                  {profile.analysis.professionalFocus.map((focus: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-purple-400 mt-1">•</span>
                      <span className="text-slate-300">{focus}</span>
                    </li>
                  ))}
                </ul>
              </section>

              {/* Likely Concerns */}
              <section className="bg-red-900/10 border border-red-500/30 rounded-2xl p-6">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-red-400">
                  <span>😰</span> Likely Concerns
                </h3>
                <ul className="space-y-2">
                  {profile.analysis.likelyConcerns.map((concern: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-red-400 mt-1">•</span>
                      <span className="text-slate-300">{concern}</span>
                    </li>
                  ))}
                </ul>
              </section>

              {/* Motivations */}
              <section className="bg-green-900/10 border border-green-500/30 rounded-2xl p-6">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-green-400">
                  <span>🚀</span> What Motivates Them
                </h3>
                <ul className="space-y-2">
                  {profile.analysis.motivations.map((motivation: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-green-400 mt-1">•</span>
                      <span className="text-slate-300">{motivation}</span>
                    </li>
                  ))}
                </ul>
              </section>

              {/* Decision Making */}
              <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <span>🧭</span> Decision Making Style
                </h3>
                <p className="text-slate-300 leading-relaxed">{profile.analysis.decisionMakingStyle}</p>
              </section>
            </div>
          )}

          {/* Approach Section */}
          {activeSection === "approach" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Communication Style */}
              <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 lg:col-span-2">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <span>💬</span> Communication Style
                </h3>
                <p className="text-slate-300 leading-relaxed">{profile.analysis.communicationStyle}</p>
              </section>

              {/* Icebreakers - NEW */}
              {profile.analysis.icebreakers && profile.analysis.icebreakers.length > 0 && (
                <section className="bg-gradient-to-br from-amber-900/20 to-orange-900/20 border border-amber-500/30 rounded-2xl p-6 lg:col-span-2">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-amber-400">
                    <span>💎</span> Icebreakers (Based on Their Activity)
                  </h3>
                  <div className="grid md:grid-cols-3 gap-3">
                    {profile.analysis.icebreakers.map((icebreaker: string, i: number) => (
                      <div key={i} className="p-3 bg-amber-900/20 border border-amber-500/20 rounded-lg">
                        <p className="text-sm text-amber-100">&ldquo;{icebreaker}&rdquo;</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* How to Approach */}
              <section className="bg-green-900/10 border border-green-500/30 rounded-2xl p-6">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-green-400">
                  <span>✅</span> How to Approach
                </h3>
                <ul className="space-y-3">
                  {profile.analysis.howToApproach.map((approach: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-green-400 mt-1">✓</span>
                      <span className="text-slate-300">{approach}</span>
                    </li>
                  ))}
                </ul>
              </section>

              {/* What to Avoid */}
              <section className="bg-red-900/10 border border-red-500/30 rounded-2xl p-6">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-red-400">
                  <span>⛔</span> What to Avoid
                </h3>
                <ul className="space-y-3">
                  {profile.analysis.whatToAvoid.map((avoid: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-red-400 mt-1">✗</span>
                      <span className="text-slate-300">{avoid}</span>
                    </li>
                  ))}
                </ul>
              </section>

              {/* Talking Points */}
              <section className="bg-blue-900/10 border border-blue-500/30 rounded-2xl p-6">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-blue-400">
                  <span>💡</span> Talking Points That Resonate
                </h3>
                <ul className="space-y-3">
                  {profile.analysis.talkingPoints.map((point: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">→</span>
                      <span className="text-slate-300">{point}</span>
                    </li>
                  ))}
                </ul>
              </section>

              {/* Questions to Ask */}
              <section className="bg-purple-900/10 border border-purple-500/30 rounded-2xl p-6">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-purple-400">
                  <span>❓</span> Questions to Ask
                </h3>
                <ul className="space-y-3">
                  {profile.analysis.questionsToAsk.map((question: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-purple-400 mt-1">?</span>
                      <span className="text-slate-300">{question}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          )}

          {/* Industry Intelligence Section - NEW */}
          {activeSection === "industry" && (
            <div className="space-y-6">
              {profile.analysis.industryIntelligence ? (
                <>
                  {/* Sector Header */}
                  <section className="bg-gradient-to-br from-amber-900/20 to-orange-900/20 border border-amber-500/30 rounded-2xl p-6">
                    <h3 className="text-xl font-bold text-amber-400 mb-2">
                      🏭 {profile.analysis.industryIntelligence.sector || "Industry"} Intelligence
                    </h3>
                    <p className="text-slate-400">What&apos;s happening in their world right now</p>
                  </section>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Current Trends */}
                    <section className="bg-blue-900/10 border border-blue-500/30 rounded-2xl p-6">
                      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-blue-400">
                        <span>📈</span> Current Trends
                      </h3>
                      <ul className="space-y-2">
                        {(profile.analysis.industryIntelligence.currentTrends || []).map((trend: string, i: number) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-blue-400 mt-1">→</span>
                            <span className="text-slate-300">{trend}</span>
                          </li>
                        ))}
                      </ul>
                    </section>

                    {/* Recent Disruptions */}
                    <section className="bg-red-900/10 border border-red-500/30 rounded-2xl p-6">
                      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-red-400">
                        <span>⚡</span> Recent Disruptions
                      </h3>
                      <ul className="space-y-2">
                        {(profile.analysis.industryIntelligence.recentDisruptions || []).map((disruption: string, i: number) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-red-400 mt-1">!</span>
                            <span className="text-slate-300">{disruption}</span>
                          </li>
                        ))}
                      </ul>
                    </section>

                    {/* Common Challenges */}
                    <section className="bg-orange-900/10 border border-orange-500/30 rounded-2xl p-6">
                      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-orange-400">
                        <span>🎯</span> Industry Challenges
                      </h3>
                      <ul className="space-y-2">
                        {(profile.analysis.industryIntelligence.commonChallenges || []).map((challenge: string, i: number) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-orange-400 mt-1">•</span>
                            <span className="text-slate-300">{challenge}</span>
                          </li>
                        ))}
                      </ul>
                    </section>

                    {/* Opportunities */}
                    <section className="bg-green-900/10 border border-green-500/30 rounded-2xl p-6">
                      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-green-400">
                        <span>💰</span> Opportunities
                      </h3>
                      <ul className="space-y-2">
                        {(profile.analysis.industryIntelligence.opportunities || []).map((opp: string, i: number) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-green-400 mt-1">✦</span>
                            <span className="text-slate-300">{opp}</span>
                          </li>
                        ))}
                      </ul>
                    </section>

                    {/* Competitors */}
                    <section className="bg-purple-900/10 border border-purple-500/30 rounded-2xl p-6 lg:col-span-2">
                      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-purple-400">
                        <span>🏆</span> Competitors They&apos;re Watching
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {(profile.analysis.industryIntelligence.competitors || []).map((competitor: string, i: number) => (
                          <span key={i} className="px-3 py-1 bg-purple-900/30 border border-purple-500/30 rounded-full text-sm text-purple-300">
                            {competitor}
                          </span>
                        ))}
                      </div>
                    </section>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <div className="text-4xl mb-4">🏭</div>
                  <p>Industry intelligence not available for this profile.</p>
                </div>
              )}
            </div>
          )}

          {/* Conversation Scripts Section - NEW */}
          {activeSection === "scripts" && (
            <div className="space-y-6">
              {profile.analysis.conversationScripts ? (
                <>
                  {/* Header */}
                  <section className="bg-gradient-to-br from-cyan-900/20 to-blue-900/20 border border-cyan-500/30 rounded-2xl p-6">
                    <h3 className="text-xl font-bold text-cyan-400 mb-2">
                      📝 Conversation Scripts
                    </h3>
                    <p className="text-slate-400">Copy-paste lines you can actually use</p>
                  </section>

                  {/* Openers */}
                  <section className="bg-green-900/10 border border-green-500/30 rounded-2xl p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-green-400">
                      <span>👋</span> Conversation Openers
                    </h3>
                    <div className="space-y-3">
                      {(profile.analysis.conversationScripts.openers || []).map((line: string, i: number) => (
                        <div key={i} className="p-4 bg-green-900/20 border border-green-500/20 rounded-xl">
                          <p className="text-slate-200 italic">&ldquo;{line}&rdquo;</p>
                          <button 
                            onClick={() => navigator.clipboard.writeText(line)}
                            className="mt-2 text-xs text-green-400 hover:text-green-300"
                          >
                            📋 Copy
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Industry Insight Lines */}
                  <section className="bg-blue-900/10 border border-blue-500/30 rounded-2xl p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-blue-400">
                      <span>🏭</span> Industry Insight Lines
                    </h3>
                    <div className="space-y-3">
                      {(profile.analysis.conversationScripts.industryInsightLines || []).map((line: string, i: number) => (
                        <div key={i} className="p-4 bg-blue-900/20 border border-blue-500/20 rounded-xl">
                          <p className="text-slate-200 italic">&ldquo;{line}&rdquo;</p>
                          <button 
                            onClick={() => navigator.clipboard.writeText(line)}
                            className="mt-2 text-xs text-blue-400 hover:text-blue-300"
                          >
                            📋 Copy
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Value Statements */}
                  <section className="bg-purple-900/10 border border-purple-500/30 rounded-2xl p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-purple-400">
                      <span>💎</span> Value Statements
                    </h3>
                    <div className="space-y-3">
                      {(profile.analysis.conversationScripts.valueStatements || []).map((line: string, i: number) => (
                        <div key={i} className="p-4 bg-purple-900/20 border border-purple-500/20 rounded-xl">
                          <p className="text-slate-200 italic">&ldquo;{line}&rdquo;</p>
                          <button 
                            onClick={() => navigator.clipboard.writeText(line)}
                            className="mt-2 text-xs text-purple-400 hover:text-purple-300"
                          >
                            📋 Copy
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Follow-up Lines */}
                    <section className="bg-amber-900/10 border border-amber-500/30 rounded-2xl p-6">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-amber-400">
                        <span>🔄</span> Follow-up Lines
                      </h3>
                      <div className="space-y-3">
                        {(profile.analysis.conversationScripts.followUpLines || []).map((line: string, i: number) => (
                          <div key={i} className="p-3 bg-amber-900/20 border border-amber-500/20 rounded-xl">
                            <p className="text-slate-200 italic text-sm">&ldquo;{line}&rdquo;</p>
                            <button 
                              onClick={() => navigator.clipboard.writeText(line)}
                              className="mt-2 text-xs text-amber-400 hover:text-amber-300"
                            >
                              📋 Copy
                            </button>
                          </div>
                        ))}
                      </div>
                    </section>

                    {/* Closing Lines */}
                    <section className="bg-pink-900/10 border border-pink-500/30 rounded-2xl p-6">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-pink-400">
                        <span>🎬</span> Closing Lines
                      </h3>
                      <div className="space-y-3">
                        {(profile.analysis.conversationScripts.closingLines || []).map((line: string, i: number) => (
                          <div key={i} className="p-3 bg-pink-900/20 border border-pink-500/20 rounded-xl">
                            <p className="text-slate-200 italic text-sm">&ldquo;{line}&rdquo;</p>
                            <button 
                              onClick={() => navigator.clipboard.writeText(line)}
                              className="mt-2 text-xs text-pink-400 hover:text-pink-300"
                            >
                              📋 Copy
                            </button>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <div className="text-4xl mb-4">📝</div>
                  <p>Conversation scripts not available for this profile.</p>
                </div>
              )}
            </div>
          )}

          {/* Call Prep Section */}
          {activeSection === "prepare" && (
            <div className="space-y-6">
              {/* Generate Briefing Button */}
              {!briefing && (
                <section className="bg-gradient-to-br from-cyan-900/30 to-blue-900/30 border border-cyan-500/30 rounded-2xl p-8 text-center">
                  <div className="text-5xl mb-4">📞</div>
                  <h3 className="text-xl font-bold mb-2">Pre-Call Briefing</h3>
                  <p className="text-slate-400 mb-6">
                    Generate a quick-read briefing for your next call with {profile.name}
                  </p>
                  <button
                    onClick={generateBriefing}
                    disabled={generatingBriefing}
                    className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold rounded-xl text-lg disabled:opacity-50"
                  >
                    {generatingBriefing ? "🔮 Generating..." : "📋 Generate Briefing"}
                  </button>
                </section>
              )}

              {/* Briefing Content */}
              {briefing && (
                <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <span>📋</span> Pre-Call Briefing: {profile.name}
                    </h3>
                    <button
                      onClick={generateBriefing}
                      disabled={generatingBriefing}
                      className="px-4 py-2 bg-slate-800 rounded-xl hover:bg-slate-700 text-sm"
                    >
                      {generatingBriefing ? "🔄..." : "🔄 Regenerate"}
                    </button>
                  </div>
                  <div className="prose prose-invert max-w-none">
                    <div className="whitespace-pre-wrap text-slate-300 leading-relaxed">
                      {briefing}
                    </div>
                  </div>
                </section>
              )}

              {/* Quick Reference */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <section className="bg-green-900/10 border border-green-500/30 rounded-xl p-4">
                  <h4 className="font-semibold text-green-400 mb-2">✅ Do</h4>
                  <ul className="text-sm text-slate-300 space-y-1">
                    {profile.analysis.howToApproach.slice(0, 3).map((item, i) => (
                      <li key={i}>• {item}</li>
                    ))}
                  </ul>
                </section>
                <section className="bg-red-900/10 border border-red-500/30 rounded-xl p-4">
                  <h4 className="font-semibold text-red-400 mb-2">⛔ Don&apos;t</h4>
                  <ul className="text-sm text-slate-300 space-y-1">
                    {profile.analysis.whatToAvoid.slice(0, 3).map((item, i) => (
                      <li key={i}>• {item}</li>
                    ))}
                  </ul>
                </section>
                <section className="bg-purple-900/10 border border-purple-500/30 rounded-xl p-4">
                  <h4 className="font-semibold text-purple-400 mb-2">🔮 They&apos;re Thinking</h4>
                  <p className="text-sm text-slate-300 italic">&ldquo;{profile.analysis.predictedMindset.slice(0, 150)}...&rdquo;</p>
                </section>
              </div>
            </div>
          )}

          {/* Sources Section - Now with Categories! */}
          {activeSection === "sources" && (
            <section className="space-y-6">
              <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span>🔗</span> Research Sources ({profile.webResults.length} total)
                </h3>
                
                {/* Show categorized results if available */}
                {profile.categorizedResults && profile.categorizedResults.length > 0 ? (
                  <div className="space-y-6">
                    {profile.categorizedResults.map((cat: any, catIdx: number) => (
                      <div key={catIdx} className="border-b border-slate-800 pb-4 last:border-0">
                        <h4 className="text-md font-semibold mb-3 flex items-center gap-2 text-purple-300">
                          <span>{cat.icon}</span> {cat.category}
                          <span className="text-xs text-slate-500">({cat.results.length})</span>
                        </h4>
                        <div className="space-y-2">
                          {cat.results.map((result: any, i: number) => (
                            <a
                              key={i}
                              href={result.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block p-3 bg-slate-800/50 border border-slate-700 rounded-lg hover:border-purple-500/50 transition-all"
                            >
                              <div className="font-medium text-slate-200 text-sm mb-1">{result.title}</div>
                              <div className="text-xs text-slate-400 mb-1 line-clamp-2">{result.description}</div>
                              <div className="text-xs text-purple-400 truncate">{result.url}</div>
                            </a>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : profile.webResults.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">No web sources found. Analysis based on role and industry patterns.</p>
                ) : (
                  <div className="space-y-3">
                    {profile.webResults.map((result: any, i: number) => (
                      <a
                        key={i}
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-4 bg-slate-800/50 border border-slate-700 rounded-xl hover:border-purple-500/50 transition-all"
                      >
                        <div className="font-medium text-slate-200 mb-1">{result.title}</div>
                        <div className="text-sm text-slate-400 mb-2">{result.description}</div>
                        <div className="text-xs text-purple-400 truncate">{result.url}</div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Platform Summary */}
              {profile.categorizedResults && profile.categorizedResults.length > 0 && (
                <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-purple-500/30 rounded-2xl p-6">
                  <h4 className="font-semibold mb-3">📊 Platform Coverage</h4>
                  <div className="flex flex-wrap gap-2">
                    {profile.categorizedResults.map((cat: any, i: number) => (
                      <span key={i} className="px-3 py-1 bg-slate-800 rounded-full text-sm">
                        {cat.icon} {cat.category} ({cat.results.length})
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Footer Note */}
          <div className="mt-8 text-center text-sm text-slate-500">
            <p>Intelligence gathered at {new Date(profile.researchedAt).toLocaleString()}</p>
            <p className="mt-1">Analysis based on public information and AI pattern recognition.</p>
          </div>
        </div>
      )}
    </main>
  );
}

