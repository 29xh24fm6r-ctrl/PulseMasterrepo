"use client";

import { FileText, Phone, Mail, Calendar, CheckSquare } from "lucide-react";
import { Activity } from "@/lib/crm/overview";

interface ActivityFeedProps {
  activity: Activity[];
}

const TYPE_ICONS: Record<string, any> = {
  note: FileText,
  call: Phone,
  email: Mail,
  meeting: Calendar,
  task: CheckSquare,
  other: FileText,
};

const TYPE_COLORS: Record<string, string> = {
  note: "text-blue-400",
  call: "text-green-400",
  email: "text-purple-400",
  meeting: "text-orange-400",
  task: "text-yellow-400",
  other: "text-gray-400",
};

export default function ActivityFeed({ activity }: ActivityFeedProps) {
  if (activity.length === 0) {
    return (
      <div className="bg-zinc-800/50 rounded-lg border border-zinc-700 p-8 text-center">
        <FileText className="w-12 h-12 text-gray-600 mx-auto mb-3" />
        <p className="text-gray-400 text-sm mb-2">No activity yet</p>
        <p className="text-gray-500 text-xs">Log a note to start tracking history</p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-800/50 rounded-lg border border-zinc-700 p-4 space-y-3 max-h-[400px] overflow-y-auto">
      {activity.map((item) => (
        <ActivityRow key={item.id} activity={item} />
      ))}
    </div>
  );
}

function ActivityRow({ activity }: { activity: Activity }) {
  const Icon = TYPE_ICONS[activity.type] || TYPE_ICONS.other;
  const color = TYPE_COLORS[activity.type] || TYPE_COLORS.other;
  const timestamp = activity.occurred_at || activity.created_at;
  const timeAgo = timestamp
    ? new Date(timestamp).toLocaleDateString()
    : "";

  const body = activity.body || activity.summary || activity.subject || "";

  return (
    <div className="flex gap-3 pb-3 border-b border-zinc-700 last:border-0">
      <div className={`${color} mt-0.5`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm">
          <span className="font-medium capitalize">{activity.type}</span>
          {activity.subject && <span className="text-gray-400">: {activity.subject}</span>}
        </div>
        {body && (
          <div className="text-xs text-gray-400 mt-1 line-clamp-2">{body}</div>
        )}
        <div className="text-xs text-gray-500 mt-1">{timeAgo}</div>
      </div>
    </div>
  );
}

