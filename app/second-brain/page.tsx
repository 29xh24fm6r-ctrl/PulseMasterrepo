"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  title?: string;
  relationship?: string;
  status?: string;
  lastContact?: string;
  tags?: string[];
  notionUrl?: string;
}

const RELATIONSHIP_TYPES = [
  "Client", "Lead", "Prospect", "Partner", "Vendor",
  "Colleague", "Friend", "Family", "Mentor", "Mentee",
  "Investor", "Advisor", "Acquaintance", "Other"
];

const STATUS_OPTIONS = ["Hot", "Warm", "Cold", "New"];

export default function SecondBrainPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"basic" | "professional" | "personal" | "relationship">("basic");

  // Form state - comprehensive
  const [form, setForm] = useState({
    // Basic
    name: "",
    email: "",
    phone: "",

    // Professional
    company: "",
    role: "",
    industry: "",
    linkedIn: "",
    website: "",

    // Personal
    birthday: "",
    address: "",
    city: "",
    state: "",
    zip: "",

    // Relationship
    relationship: "",
    relationshipStrength: "New",
    howWeMet: "",
    introducedBy: "",

    // Context
    interests: "",
    notes: "",
    tags: "",
  });

  const loadContacts = useCallback(async () => {
    try {
      const res = await fetch("/api/contacts");
      if (res.ok) {
        const data = await res.json();
        setContacts(data.contacts || []);
      }
    } catch (e) {
      console.error("Failed to load contacts:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const handleSubmit = async () => {
    if (!form.name.trim()) return;

    setSaving(true);
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
        }),
      });

      if (res.ok) {
        setModalOpen(false);
        setForm({
          name: "", email: "", phone: "",
          company: "", role: "", industry: "", linkedIn: "", website: "",
          birthday: "", address: "", city: "", state: "", zip: "",
          relationship: "", relationshipStrength: "New", howWeMet: "", introducedBy: "",
          interests: "", notes: "", tags: "",
        });
        loadContacts();
      } else {
        const err = await res.json();
        alert(`Error: ${err.error}`);
      }
    } catch (e) {
      alert("Failed to create contact");
    } finally {
      setSaving(false);
    }
  };

  const updateForm = (key: string, value: string) => {
    setForm(f => ({ ...f, [key]: value }));
  };

  const filteredContacts = contacts.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.company?.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: contacts.length,
    hot: contacts.filter(c => c.status === "Hot").length,
    warm: contacts.filter(c => c.status === "Warm").length,
    cold: contacts.filter(c => c.status === "Cold").length,
    new: contacts.filter(c => c.status === "New" || !c.status).length,
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-6">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-3xl">🧠</Link>
          <div>
            <h1 className="text-2xl font-bold text-violet-400">Second Brain</h1>
            <p className="text-sm text-zinc-500">Your relationship command center • {contacts.length} contacts</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setModalOpen(true)} className="px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-lg font-medium">
            + Add Contact
          </button>
          <Link href="/oracle" className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg">
            🔮 Oracle
          </Link>
          <Link href="/" className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg">
            🏠 Dashboard
          </Link>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {[
          { label: "TOTAL", value: stats.total, color: "text-white" },
          { label: "HOT", value: stats.hot, color: "text-red-400" },
          { label: "WARM", value: stats.warm, color: "text-orange-400" },
          { label: "COLD", value: stats.cold, color: "text-blue-400" },
          { label: "NEW", value: stats.new, color: "text-green-400" },
        ].map(s => (
          <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-zinc-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Search by name, company, email, or notes..."
          className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl focus:outline-none focus:border-violet-500"
        />
      </div>

      {/* Contacts Grid */}
      {loading ? (
        <div className="text-center py-12 text-zinc-500">Loading contacts...</div>
      ) : filteredContacts.length === 0 ? (
        <div className="text-center py-12 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
          <div className="text-4xl mb-3">🧠</div>
          <p className="text-zinc-400">No contacts found</p>
          <button onClick={() => setModalOpen(true)} className="mt-4 px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-lg">
            Add Your First Contact
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContacts.map(contact => (
            <div key={contact.id} className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-violet-500/50 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-violet-500/20 rounded-full flex items-center justify-center text-violet-400 font-bold">
                    {contact.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold">{contact.name}</h3>
                    {contact.company && <p className="text-sm text-zinc-500">{contact.company}</p>}
                  </div>
                </div>
                {contact.status && (
                  <span className={`text-xs px-2 py-1 rounded-full ${contact.status === "Hot" ? "bg-red-500/20 text-red-400" :
                    contact.status === "Warm" ? "bg-orange-500/20 text-orange-400" :
                      contact.status === "Cold" ? "bg-blue-500/20 text-blue-400" :
                        "bg-green-500/20 text-green-400"
                    }`}>
                    {contact.status}
                  </span>
                )}
              </div>

              {contact.email && <p className="text-sm text-zinc-400 mb-1">📧 {contact.email}</p>}
              {contact.phone && <p className="text-sm text-zinc-400 mb-1">📱 {contact.phone}</p>}
              {contact.relationship && <p className="text-sm text-zinc-500">🤝 {contact.relationship}</p>}

              {contact.lastContact && (
                <p className="text-xs text-zinc-600 mt-2">
                  Last contact: {new Date(contact.lastContact).toLocaleDateString()}
                </p>
              )}

              <div className="flex gap-2 mt-3">
                <Link href={`/calls?phone=${contact.phone}&contactId=${contact.id}`} className="flex-1 py-1.5 text-center text-sm bg-green-600/20 text-green-400 rounded-lg hover:bg-green-600/30">
                  📞 Call
                </Link>
                <button className="flex-1 py-1.5 text-sm bg-violet-600/20 text-violet-400 rounded-lg hover:bg-violet-600/30">
                  🔮 Intel
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Contact Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setModalOpen(false)}>
          <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-700 rounded-2xl max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-zinc-800">
              <h2 className="text-xl font-bold">Add New Contact</h2>
              <button onClick={() => setModalOpen(false)} className="p-2 hover:bg-zinc-800 rounded-lg">✕</button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-zinc-800">
              {[
                { id: "basic", label: "👤 Basic" },
                { id: "professional", label: "💼 Professional" },
                { id: "personal", label: "🏠 Personal" },
                { id: "relationship", label: "🤝 Relationship" },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === tab.id
                    ? "text-violet-400 border-b-2 border-violet-400"
                    : "text-zinc-500 hover:text-zinc-300"
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Form Content */}
            <div className="p-6 overflow-y-auto max-h-[50vh]">
              {activeTab === "basic" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Name *</label>
                    <input type="text" value={form.name} onChange={e => updateForm("name", e.target.value)}
                      className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg" placeholder="John Smith" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-zinc-400 mb-1">Email</label>
                      <input type="email" value={form.email} onChange={e => updateForm("email", e.target.value)}
                        className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg" placeholder="john@example.com" />
                    </div>
                    <div>
                      <label className="block text-sm text-zinc-400 mb-1">Phone</label>
                      <input type="tel" value={form.phone} onChange={e => updateForm("phone", e.target.value)}
                        className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg" placeholder="(555) 123-4567" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Tags (comma separated)</label>
                    <input type="text" value={form.tags} onChange={e => updateForm("tags", e.target.value)}
                      className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg" placeholder="sales, tech, priority" />
                  </div>
                </div>
              )}

              {activeTab === "professional" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-zinc-400 mb-1">Company</label>
                      <input type="text" value={form.company} onChange={e => updateForm("company", e.target.value)}
                        className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg" placeholder="Acme Corp" />
                    </div>
                    <div>
                      <label className="block text-sm text-zinc-400 mb-1">Role / Title</label>
                      <input type="text" value={form.role} onChange={e => updateForm("role", e.target.value)}
                        className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg" placeholder="VP of Sales" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Industry</label>
                    <input type="text" value={form.industry} onChange={e => updateForm("industry", e.target.value)}
                      className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg" placeholder="Technology" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-zinc-400 mb-1">LinkedIn URL</label>
                      <input type="url" value={form.linkedIn} onChange={e => updateForm("linkedIn", e.target.value)}
                        className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg" placeholder="linkedin.com/in/..." />
                    </div>
                    <div>
                      <label className="block text-sm text-zinc-400 mb-1">Website</label>
                      <input type="url" value={form.website} onChange={e => updateForm("website", e.target.value)}
                        className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg" placeholder="https://..." />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "personal" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Birthday</label>
                    <input type="date" value={form.birthday} onChange={e => updateForm("birthday", e.target.value)}
                      className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Address</label>
                    <input type="text" value={form.address} onChange={e => updateForm("address", e.target.value)}
                      className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg" placeholder="123 Main St" />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm text-zinc-400 mb-1">City</label>
                      <input type="text" value={form.city} onChange={e => updateForm("city", e.target.value)}
                        className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-sm text-zinc-400 mb-1">State</label>
                      <input type="text" value={form.state} onChange={e => updateForm("state", e.target.value)}
                        className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-sm text-zinc-400 mb-1">Zip</label>
                      <input type="text" value={form.zip} onChange={e => updateForm("zip", e.target.value)}
                        className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Interests / Hobbies</label>
                    <input type="text" value={form.interests} onChange={e => updateForm("interests", e.target.value)}
                      className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg" placeholder="Golf, cooking, travel" />
                  </div>
                </div>
              )}

              {activeTab === "relationship" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-zinc-400 mb-1">Relationship Type</label>
                      <select value={form.relationship} onChange={e => updateForm("relationship", e.target.value)}
                        className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg">
                        <option value="">Select...</option>
                        {RELATIONSHIP_TYPES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-zinc-400 mb-1">Status</label>
                      <select value={form.relationshipStrength} onChange={e => updateForm("relationshipStrength", e.target.value)}
                        className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg">
                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">How We Met</label>
                    <input type="text" value={form.howWeMet} onChange={e => updateForm("howWeMet", e.target.value)}
                      className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg" placeholder="Conference, intro, cold outreach..." />
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Introduced By</label>
                    <input type="text" value={form.introducedBy} onChange={e => updateForm("introducedBy", e.target.value)}
                      className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg" placeholder="Name of mutual connection" />
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Notes</label>
                    <textarea value={form.notes} onChange={e => updateForm("notes", e.target.value)} rows={3}
                      className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg resize-none"
                      placeholder="Any additional context, memories, or important details..." />
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-6 border-t border-zinc-800">
              <button onClick={() => setModalOpen(false)} className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg">
                Cancel
              </button>
              <button onClick={handleSubmit} disabled={!form.name.trim() || saving}
                className="flex-1 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-lg font-medium">
                {saving ? "Adding..." : "Add Contact"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
// This will be integrated - for now let's just push and run setup
