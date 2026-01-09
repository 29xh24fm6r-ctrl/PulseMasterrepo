"use client";

import { useState } from "react";
import {
    Search, Filter, MoreHorizontal, Sparkles, Mail,
    Linkedin, Twitter, Plus, Star, MapPin,
    Gift, MessageSquare, BrainCircuit, X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader } from "@/components/ui/premium/PageHeader";
import { GlassCard } from "@/components/ui/premium/GlassCard";

// Mock Data for "World Class" Feel 
const MOCK_CONTACTS = [
    {
        id: "1",
        name: "Eleanor Pena",
        role: "Chief Strategy Officer",
        company: "Nexus Ventures",
        status: "Active",
        pulseScore: 92,
        location: "San Francisco, CA",
        avatar: "https://i.pravatar.cc/150?u=1",
        tags: ["Investor", "VIP"],
    },
    {
        id: "2",
        name: "Ralph Edwards",
        role: "Head of Product",
        company: "Ubiquity Inc.",
        status: "Warm",
        pulseScore: 78,
        location: "London, UK",
        avatar: "https://i.pravatar.cc/150?u=2",
        tags: ["Partner", "Tech"],
    },
    {
        id: "3",
        name: "Courtney Henry",
        role: "Founder & CEO",
        company: "Starlight Media",
        status: "Cold",
        pulseScore: 45,
        location: "New York, NY",
        avatar: "https://i.pravatar.cc/150?u=3",
        tags: ["Media", "Founder"],
    },
];

export default function ContactsPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const filteredContacts = MOCK_CONTACTS.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.company.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-violet-500/30 pb-20">
            <PageHeader
                title="Network Intelligence"
                subtitle="Manage and enrich your professional relationships."
                searchPlaceholder="Search network..."
                onSearch={setSearchQuery}
                actionLabel="Add Contact"
                onAdd={() => { }}
            />

            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Stats Row */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <StatCard label="Total Contacts" value="1,284" icon={Sparkles} color="text-violet-400" />
                    <StatCard label="Active Relationships" value="84" icon={Star} color="text-amber-400" />
                    <StatCard label="Network Reach" value="World Class" icon={MapPin} color="text-emerald-400" />
                    <StatCard label="Communication Health" value="98%" icon={Mail} color="text-blue-400" />
                </div>

                {/* Contacts Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence>
                        {filteredContacts.map((contact) => (
                            <ContactCard key={contact.id} contact={contact} />
                        ))}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}

function ContactCard({ contact }: { contact: typeof MOCK_CONTACTS[0] }) {
    const [enriching, setEnriching] = useState(false);
    const [profile, setProfile] = useState<any>(null);
    const [expanded, setExpanded] = useState(false);

    async function handleEnrich() {
        setEnriching(true);
        setExpanded(true); // Open card to show loading state
        try {
            const res = await fetch("/api/crm/enrich", {
                method: "POST",
                body: JSON.stringify({ name: contact.name, company: contact.company }),
            });
            const data = await res.json();
            if (data.ok) {
                setProfile(data.data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setEnriching(false);
        }
    }

    return (
        <GlassCard className="relative overflow-hidden transition-all duration-500" hoverEffect={!expanded}>
            {/* Standard Card Content */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <img src={contact.avatar} alt={contact.name} className="w-12 h-12 rounded-full object-cover border border-white/10" />
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-zinc-950 ${getScoreColor(contact.pulseScore)}`} />
                    </div>
                    <div>
                        <h3 className="font-semibold text-white">{contact.name}</h3>
                        <p className="text-xs text-zinc-400">{contact.role}</p>
                        <p className="text-xs text-zinc-500">{contact.company}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {expanded && (
                        <button onClick={() => setExpanded(false)} className="text-zinc-500 hover:text-white transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    )}
                    {!expanded && <button className="text-zinc-600 hover:text-white transition-colors"><MoreHorizontal className="w-5 h-5" /></button>}
                </div>
            </div>

            {/* Tags */}
            {!expanded && (
                <div className="flex flex-wrap gap-2 mb-4">
                    {contact.tags.map(tag => (
                        <span key={tag} className="text-[10px] uppercase tracking-wider px-2 py-1 bg-white/5 rounded-md text-zinc-400 border border-white/5">
                            {tag}
                        </span>
                    ))}
                </div>
            )}

            {/* Expanded God Mode Content */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-4 border-t border-white/5 pt-4 space-y-4"
                    >
                        {enriching ? (
                            <div className="space-y-3 animate-pulse">
                                <div className="h-4 bg-white/5 rounded w-3/4"></div>
                                <div className="h-4 bg-white/5 rounded w-1/2"></div>
                                <div className="flex items-center gap-2 text-violet-400 text-xs">
                                    <BrainCircuit className="w-4 h-4 animate-spin" />
                                    <span>Synthesizing psychological profile...</span>
                                </div>
                            </div>
                        ) : profile ? (
                            <>
                                <div className="bg-violet-900/10 border border-violet-500/20 p-3 rounded-xl">
                                    <div className="flex items-center gap-2 text-violet-300 text-xs font-bold mb-1 uppercase tracking-wider">
                                        <BrainCircuit className="w-3 h-3" /> Pulse Bio
                                    </div>
                                    <p className="text-sm text-zinc-300 leading-relaxed">{profile.pulse_bio}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-zinc-900/50 p-3 rounded-xl border border-white/5">
                                        <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold mb-2 uppercase tracking-wider">
                                            <Gift className="w-3 h-3" /> Gift Ideas
                                        </div>
                                        <ul className="text-xs text-zinc-400 space-y-1">
                                            {profile.gift_ideas?.map((gift: string, i: number) => (
                                                <li key={i}>• {gift}</li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div className="bg-zinc-900/50 p-3 rounded-xl border border-white/5">
                                        <div className="flex items-center gap-2 text-blue-400 text-xs font-bold mb-2 uppercase tracking-wider">
                                            <MessageSquare className="w-3 h-3" /> Ice Breakers
                                        </div>
                                        <ul className="text-xs text-zinc-400 space-y-1">
                                            {profile.ice_breakers?.map((ice: string, i: number) => (
                                                <li key={i}>• {ice}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>

                                <div className="bg-zinc-900/50 p-3 rounded-xl border border-white/5">
                                    <div className="flex items-center gap-2 text-amber-400 text-xs font-bold mb-1 uppercase tracking-wider">
                                        <Sparkles className="w-3 h-3" /> Communication Style
                                    </div>
                                    <p className="text-xs text-zinc-400 italic">"{profile.communication_style}"</p>
                                </div>
                            </>
                        ) : (
                            <div className="text-red-400 text-xs">Failed to load profile.</div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Actions / Info */}
            <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <div className="flex items-center gap-3">
                    <div className="p-2 hover:bg-white/10 rounded-full text-zinc-500 hover:text-blue-400 transition-colors cursor-pointer">
                        <Linkedin className="w-4 h-4" />
                    </div>
                    <div className="p-2 hover:bg-white/10 rounded-full text-zinc-500 hover:text-sky-400 transition-colors cursor-pointer">
                        <Twitter className="w-4 h-4" />
                    </div>
                </div>

                <button
                    onClick={handleEnrich}
                    disabled={enriching}
                    className="text-xs text-zinc-500 hover:text-violet-400 flex items-center gap-1 transition-colors disabled:opacity-50"
                >
                    <Sparkles className={`w-3 h-3 ${enriching ? 'text-violet-500 animate-pulse' : 'text-violet-500'}`} />
                    <span>{enriching ? "Analyzing..." : (profile ? "Re-Enrich" : "Enrich")}</span>
                </button>
            </div>
        </GlassCard>
    );
}

function StatCard({ label, value, icon: Icon, color }: { label: string, value: string, icon: any, color: string }) {
    return (
        <div className="bg-zinc-900/40 border border-white/5 rounded-xl p-4 flex items-center gap-4">
            <div className={`p-3 rounded-lg bg-white/5 ${color}`}>
                <Icon className="w-5 h-5" />
            </div>
            <div>
                <p className="text-xs text-zinc-400 mb-0.5">{label}</p>
                <p className="text-lg font-bold text-white">{value}</p>
            </div>
        </div>
    )
}

function getScoreColor(score: number) {
    if (score >= 90) return "bg-emerald-500";
    if (score >= 70) return "bg-amber-500";
    return "bg-red-500";
}
