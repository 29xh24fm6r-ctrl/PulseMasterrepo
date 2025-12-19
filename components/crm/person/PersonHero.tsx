"use client";

import { Copy, Mail, Phone, Building, Calendar, Clock, Sparkles, MessageSquare, CheckSquare, PhoneCall, Brain } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { RunIntelButton } from "@/components/crm/RunIntelButton";

interface PersonHeroProps {
  contact: any;
  stats: any;
  relationship: any;
  next: any;
  intel?: {
    sources?: Array<{
      title: string;
      source_type: string;
      source_url: string;
      match_score: number;
      published_at?: string;
    }>;
  };
  onFollowUp: () => void;
  onLogNote: () => void;
  onCreateTask: () => void;
  onCallPrep: () => void;
  onAskPulse: () => void;
  onSwitchToIntel?: () => void;
}

export function PersonHero({
  contact,
  stats,
  relationship,
  next,
  intel,
  onFollowUp,
  onLogNote,
  onCreateTask,
  onCallPrep,
  onAskPulse,
  onSwitchToIntel,
}: PersonHeroProps) {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const contactType = contact?.type || (contact?.company_name ? "business" : "personal");
  const isPersonal = contactType === "personal";

  // Badges
  const badges = [];
  if (isPersonal) badges.push({ label: "Personal", color: "purple" });
  else badges.push({ label: "Business", color: "blue" });
  if (contact?.tags?.includes("vip")) badges.push({ label: "VIP", color: "amber" });
  if (relationship.flags?.length > 0) badges.push({ label: "Risk", color: "red" });
  if (contact?.hasNeedsResponse) badges.push({ label: "Needs Response", color: "red" });

  const lastTouch = stats.lastTouchAt
    ? new Date(stats.lastTouchAt).toLocaleDateString()
    : "Never";
  
  const nextTouchDue = next.nextTouchDueAt
    ? new Date(next.nextTouchDueAt).toLocaleDateString()
    : null;

  return (
    <div className="bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 border-b border-purple-500/20">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-start justify-between gap-6">
          {/* Left: Contact Info */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <h1 className="text-3xl font-bold text-white">{contact?.full_name || contact?.name || "Unnamed Contact"}</h1>
              <div className="flex gap-2">
                {badges.map((badge, i) => (
                  <span
                    key={i}
                    className={`text-xs px-2 py-1 rounded ${
                      badge.color === "purple"
                        ? "bg-purple-500/20 text-purple-400"
                        : badge.color === "blue"
                        ? "bg-blue-500/20 text-blue-400"
                        : badge.color === "amber"
                        ? "bg-amber-500/20 text-amber-400"
                        : "bg-red-500/20 text-red-400"
                    }`}
                  >
                    {badge.label}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-300">
              {contact?.primary_email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  <span>{contact.primary_email}</span>
                  <button
                    onClick={() => copyToClipboard(contact.primary_email, "email")}
                    className="p-1 hover:bg-white/10 rounded"
                    title="Copy email"
                  >
                    <Copy className={`w-3 h-3 ${copied === "email" ? "text-green-400" : ""}`} />
                  </button>
                </div>
              )}
              {contact?.primary_phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  <span>{contact.primary_phone}</span>
                  <button
                    onClick={() => copyToClipboard(contact.primary_phone, "phone")}
                    className="p-1 hover:bg-white/10 rounded"
                    title="Copy phone"
                  >
                    <Copy className={`w-3 h-3 ${copied === "phone" ? "text-green-400" : ""}`} />
                  </button>
                </div>
              )}
              {contact?.company_name && (
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4" />
                  <span>{contact.company_name}</span>
                  {contact?.title && <span className="text-gray-500">• {contact.title}</span>}
                </div>
              )}
            </div>

            <div className="flex items-center gap-4 mt-4 text-xs text-gray-400">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>Last touched: {lastTouch}</span>
              </div>
              {nextTouchDue && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>Next due: {nextTouchDue}</span>
                </div>
              )}
            </div>

            {/* Intel Strip */}
            {intel?.sources && intel.sources.length > 0 && (
              <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-purple-500/20">
                <span className="text-xs text-purple-400 font-medium">Intel:</span>
                {intel.sources.slice(0, 3).map((source, i) => {
                  const daysAgo = source.published_at
                    ? Math.floor((Date.now() - new Date(source.published_at).getTime()) / (1000 * 60 * 60 * 24))
                    : null;
                  const typeLabel = source.source_type === 'podcast' ? 'Podcast' :
                                   source.source_type === 'news' ? 'News' :
                                   source.source_type === 'social' ? 'Social' : 'Mention';
                  
                  return (
                    <a
                      key={i}
                      href={source.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs px-2 py-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 rounded border border-purple-500/20 transition-colors"
                      title={source.title}
                    >
                      {typeLabel}
                      {daysAgo !== null && daysAgo < 30 && ` (${daysAgo}d ago)`}
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: Action Strip */}
          <div className="flex gap-2 flex-wrap">
            <RunIntelButton
              contactId={contact?.id || ""}
              variant="primary"
              onDone={() => {
                // Data refresh handled by onSwitchToIntel
              }}
              onSwitchToIntel={onSwitchToIntel || (() => {
                // Fallback: reload page if no callback provided
                window.location.reload();
              })}
            />
            {/* Optional: Link to Relationship Oracle (old system) */}
            {contact?.full_name && (
              <Link
                href={`/intelligence?contactId=${contact.id}&name=${encodeURIComponent(contact.full_name || "")}&company=${encodeURIComponent(contact.company_name || "")}&role=${encodeURIComponent(contact.title || "")}&email=${encodeURIComponent(contact.primary_email || "")}`}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-white transition-colors flex items-center gap-2"
                title="Open Relationship Oracle (psychology analysis)"
              >
                🔮 Oracle
              </Link>
            )}
            <button
              onClick={onFollowUp}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              Follow-up
            </button>
            <button
              onClick={onLogNote}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              Log Note
            </button>
            <button
              onClick={onCreateTask}
              className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
            >
              <CheckSquare className="w-4 h-4" />
              Create Task
            </button>
            <button
              onClick={onCallPrep}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
            >
              <PhoneCall className="w-4 h-4" />
              Call Prep
            </button>
            <button
              onClick={onAskPulse}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
            >
              <Brain className="w-4 h-4" />
              Ask Pulse
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

