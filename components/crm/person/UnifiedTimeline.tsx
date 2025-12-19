"use client";

import { Mail, FileText, CheckSquare, Phone, Calendar, Clock } from "lucide-react";

interface UnifiedTimelineProps {
  events: any[];
}

export function UnifiedTimeline({ events }: UnifiedTimelineProps) {
  const getEventIcon = (item: any) => {
    // Handle unified timeline format (type: "email" | "task" | "note" | "event")
    if (item.type === "email") return <Mail className="w-4 h-4" />;
    if (item.type === "task") return <CheckSquare className="w-4 h-4" />;
    if (item.type === "note") return <FileText className="w-4 h-4" />;
    
    // Legacy event_type format
    const type = item.type || item.event_type || "";
    switch (type) {
      case "email_in":
      case "email_out":
        return <Mail className="w-4 h-4" />;
      case "note":
        return <FileText className="w-4 h-4" />;
      case "task_created":
      case "task_done":
        return <CheckSquare className="w-4 h-4" />;
      case "call":
        return <Phone className="w-4 h-4" />;
      case "meeting":
        return <Calendar className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getEventColor = (item: any) => {
    // Handle unified timeline format
    if (item.type === "email") return "text-purple-400 bg-purple-500/20";
    if (item.type === "task") return "text-green-400 bg-green-500/20";
    if (item.type === "note") return "text-blue-400 bg-blue-500/20";
    
    // Legacy event_type format
    const type = item.type || item.event_type || "";
    switch (type) {
      case "email_in":
      case "email_out":
        return "text-purple-400 bg-purple-500/20";
      case "note":
        return "text-blue-400 bg-blue-500/20";
      case "task_created":
      case "task_done":
        return "text-green-400 bg-green-500/20";
      case "call":
        return "text-amber-400 bg-amber-500/20";
      case "meeting":
        return "text-violet-400 bg-violet-500/20";
      default:
        return "text-gray-400 bg-gray-500/20";
    }
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  if (events.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Clock className="w-12 h-12 mx-auto mb-4 opacity-30" />
        <p>No timeline events yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {events.map((event) => {
        const occurredAt = event.occurredAt || event.occurred_at || new Date().toISOString();
        const title = event.title || "Event";
        const subtitle = event.subtitle || event.event_type?.replace("_", " ") || "";
        const summary = event.summary || event.body || "";
        
        return (
          <div key={event.id} className="flex gap-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors">
            <div className={`p-2 rounded-lg ${getEventColor(event)}`}>
              {getEventIcon(event)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <div className="text-sm font-medium text-white">{title}</div>
                <div className="text-xs text-gray-500">{formatDate(occurredAt)}</div>
              </div>
              {subtitle && (
                <div className="text-xs text-gray-400 mb-1">{subtitle}</div>
              )}
              {summary && (
                <div className="text-sm text-gray-400 line-clamp-2">{summary}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

