"use client";

import Link from "next/link";
import { ArrowLeft, DollarSign } from "lucide-react";

export default function DealCoachPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-zinc-500">
          <Link href="/coaches" className="hover:text-zinc-300 transition-colors">
            Coaches Corner
          </Link>
          <span>/</span>
          <span className="text-zinc-400">Deal Coach</span>
        </nav>

        {/* Header */}
        <header className="space-y-4">
          <div className="flex items-center gap-4">
            <Link
              href="/coaches"
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-zinc-400" />
            </Link>
            <div className={`p-4 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 bg-opacity-20`}>
              <DollarSign className="w-8 h-8 text-green-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Deal Coach</h1>
              <p className="text-zinc-400">Work through live deals, analyze opportunities, and close with confidence</p>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-8 text-center space-y-4">
          <p className="text-zinc-400">
            Deal Coach functionality will be integrated here. This coach helps you work through live deals, analyze opportunities, and close with confidence.
          </p>
          <Link
            href="/deals"
            className="inline-block px-6 py-3 bg-green-600 hover:bg-green-500 rounded-lg text-white font-medium transition-colors"
          >
            View Your Deals
          </Link>
        </div>
      </div>
    </div>
  );
}





