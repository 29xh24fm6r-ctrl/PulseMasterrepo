"use client";

import Link from "next/link";

interface Card {
  title: string;
  value?: string | number;
  subtitle?: string;
  cta?: { label: string; href: string };
  state?: "good" | "warn" | "bad" | "empty";
}

interface DecisionsOverviewData {
  ok: boolean;
  module: string;
  summary: string;
  cards: Card[];
  items?: any[];
  meta?: Record<string, any>;
}

export default function DecisionsOverview({ data }: { data: DecisionsOverviewData }) {
  if (!data.ok) {
    return (
      <div className="p-8">
        <div className="text-red-400">Failed to load decisions overview</div>
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
        <h1 className="text-3xl font-bold mb-2">Decisions - Resolution Engine</h1>
        <p className="text-gray-400 mb-8">{data.summary}</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
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

        {data.items && data.items.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Open Decisions</h2>
            <div className="space-y-2">
              {data.items.slice(0, 10).map((item, idx) => (
                <div key={idx} className="p-4 bg-zinc-800/50 rounded border border-zinc-700">
                  <div className="font-medium">{item.title || JSON.stringify(item).slice(0, 100)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

