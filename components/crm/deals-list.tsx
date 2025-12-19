"use client";

import Link from "next/link";
import { Plus, DollarSign } from "lucide-react";

interface Deal {
  id: string;
  name: string;
  stage: string;
  amount?: number;
  close_date?: string;
  primary_contact_id?: string;
  created_at: string;
}

export default function DealsList({ deals }: { deals: Deal[] }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Deals</h1>
          <Link
            href="/people"
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Deal
          </Link>
        </div>

        {deals.length > 0 ? (
          <div className="space-y-2">
            {deals.map((deal) => (
              <Link
                key={deal.id}
                href={`/crm/deals/${deal.id}`}
                className="block p-4 bg-zinc-800/50 rounded-lg border border-zinc-700 hover:border-purple-500/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-lg">{deal.name}</div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                      <span className="px-2 py-1 bg-zinc-700 rounded">{deal.stage}</span>
                      {deal.amount && (
                        <span className="font-semibold">${deal.amount.toLocaleString()}</span>
                      )}
                      {deal.close_date && (
                        <span>Close: {new Date(deal.close_date).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  <DollarSign className="w-5 h-5 text-gray-400" />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-zinc-800/50 rounded-lg border border-zinc-700 p-12 text-center">
            <DollarSign className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No deals yet</h2>
            <p className="text-gray-400 mb-6">Create your first deal to start tracking opportunities</p>
            <Link
              href="/people"
              className="inline-block px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
            >
              Create Deal
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

