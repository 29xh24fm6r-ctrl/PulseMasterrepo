"use client";

import Link from "next/link";
import { Plus, DollarSign, CheckSquare, Users, Clock } from "lucide-react";

interface Card {
  title: string;
  value?: string | number;
  subtitle?: string;
  cta?: { label: string; href: string };
  state?: "good" | "warn" | "bad" | "empty";
}

interface CrmOverviewData {
  ok: boolean;
  module: string;
  summary: string;
  cards: Card[];
  items?: {
    openDeals?: any[];
    tasksDue?: any[];
    needsTouch?: any[];
    recentActivity?: any[];
  };
  meta?: Record<string, any>;
}

export default function CrmOverview({ data }: { data: CrmOverviewData }) {
  if (!data.ok) {
    return (
      <div className="p-8">
        <div className="text-red-400">Failed to load CRM overview</div>
      </div>
    );
  }

  const getStateColor = (state?: string) => {
    switch (state) {
      case "good":
        return "border-green-500/30 bg-green-500/10";
      case "warn":
        return "border-yellow-500/30 bg-yellow-500/10";
      case "bad":
        return "border-red-500/30 bg-red-500/10";
      default:
        return "border-gray-500/30 bg-gray-500/10";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">CRM</h1>
        <p className="text-gray-400 mb-8">{data.summary}</p>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {data.cards.map((card, idx) => (
            <div
              key={idx}
              className={`p-6 rounded-lg border ${getStateColor(card.state)}`}
            >
              <h3 className="text-lg font-semibold mb-2">{card.title}</h3>
              {card.value !== undefined && (
                <div className="text-2xl font-bold mb-1">{card.value}</div>
              )}
              {card.subtitle && (
                <p className="text-sm text-gray-400 mb-4">{card.subtitle}</p>
              )}
              {card.cta && (
                <Link
                  href={card.cta.href}
                  className="inline-block px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded text-sm transition-colors"
                >
                  {card.cta.label}
                </Link>
              )}
            </div>
          ))}
        </div>

        {/* Three Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Open Deals */}
          <div className="bg-zinc-800/50 rounded-lg border border-zinc-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Open Deals
              </h2>
              <Link href="/crm/deals" className="text-sm text-purple-400 hover:text-purple-300">
                View All
              </Link>
            </div>
            {data.items?.openDeals && data.items.openDeals.length > 0 ? (
              <div className="space-y-2">
                {data.items.openDeals.slice(0, 5).map((deal: any) => (
                  <Link
                    key={deal.id}
                    href={`/crm/deals/${deal.id}`}
                    className="block p-3 bg-zinc-900/50 rounded border border-zinc-700 hover:border-purple-500/50 transition-colors"
                  >
                    <div className="font-medium">{deal.name}</div>
                    <div className="text-sm text-gray-400 mt-1">
                      {deal.stage} {deal.amount && `• $${deal.amount.toLocaleString()}`}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-gray-400 text-sm py-4">
                <p className="mb-2">No open deals</p>
                <Link href="/crm/deals" className="text-purple-400 hover:text-purple-300">
                  Create your first deal →
                </Link>
              </div>
            )}
          </div>

          {/* Tasks Due */}
          <div className="bg-zinc-800/50 rounded-lg border border-zinc-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <CheckSquare className="w-5 h-5" />
                Tasks Due (7d)
              </h2>
              <Link href="/crm/tasks" className="text-sm text-purple-400 hover:text-purple-300">
                View All
              </Link>
            </div>
            {data.items?.tasksDue && data.items.tasksDue.length > 0 ? (
              <div className="space-y-2">
                {data.items.tasksDue.slice(0, 5).map((task: any) => (
                  <div
                    key={task.id}
                    className="p-3 bg-zinc-900/50 rounded border border-zinc-700"
                  >
                    <div className="font-medium">{task.title}</div>
                    {task.due_at && (
                      <div className="text-sm text-gray-400 mt-1">
                        Due: {new Date(task.due_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-400 text-sm py-4">
                <p className="mb-2">No tasks due</p>
                <Link href="/people" className="text-purple-400 hover:text-purple-300">
                  Add a follow-up task →
                </Link>
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="bg-zinc-800/50 rounded-lg border border-zinc-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Recent Activity
              </h2>
            </div>
            {data.items?.recentActivity && data.items.recentActivity.length > 0 ? (
              <div className="space-y-2">
                {data.items.recentActivity.slice(0, 5).map((activity: any, idx: number) => (
                  <div
                    key={activity.id || idx}
                    className="p-3 bg-zinc-900/50 rounded border border-zinc-700"
                  >
                    <div className="font-medium text-sm">
                      {activity.activityType === "interaction" ? (
                        <>
                          <span className="text-blue-400">{activity.type}</span>
                          {activity.subject && `: ${activity.subject}`}
                        </>
                      ) : (
                        <>Task: {activity.title}</>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(activity.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-400 text-sm py-4">
                <p>No recent activity</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

