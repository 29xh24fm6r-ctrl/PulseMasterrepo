"use client";

import Link from "next/link";
import { ArrowLeft, Wallet, TrendingUp, DollarSign, PiggyBank } from "lucide-react";
import { useState } from "react";

export default function FinancialCoachPage() {
  const [response, setResponse] = useState<string>("");

  const handleDemo = async () => {
    setResponse("I'd be happy to help you with your finances! Let me ask you a few questions to understand your situation better. What's your primary financial goal right now?");
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-zinc-500">
          <Link href="/coaches" className="hover:text-zinc-300 transition-colors">
            Coaches Corner
          </Link>
          <span>/</span>
          <span className="text-zinc-400">Financial Coach</span>
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
            <div className={`p-4 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-500 bg-opacity-20`}>
              <Wallet className="w-8 h-8 text-yellow-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Financial Coach</h1>
              <p className="text-zinc-400">Plan your finances, make smart money decisions, and build wealth</p>
            </div>
          </div>
        </header>

        {/* Coming Soon Message */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-8 text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-4 bg-gradient-to-br from-yellow-500/20 to-amber-500/20 rounded-2xl">
              <TrendingUp className="w-12 h-12 text-yellow-400" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white">Coming Soon</h2>
          <p className="text-zinc-400 max-w-md mx-auto">
            The Financial Coach is being built to help you plan your finances, make smart money decisions, and build long-term wealth.
          </p>
        </div>

        {/* Demo Interaction */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-yellow-400" />
            Try a Demo Interaction
          </h3>
          <p className="text-sm text-zinc-400">
            Experience what the Financial Coach will be like when it's ready.
          </p>
          <button
            onClick={handleDemo}
            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 rounded-lg text-white font-medium transition-colors"
          >
            Start Demo
          </button>
          {response && (
            <div className="mt-4 p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-yellow-500/20 rounded-lg">
                  <PiggyBank className="w-5 h-5 text-yellow-400" />
                </div>
                <p className="text-zinc-300 flex-1">{response}</p>
              </div>
            </div>
          )}
        </div>

        {/* Features Preview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            <h4 className="font-semibold text-white mb-2">Budget Planning</h4>
            <p className="text-sm text-zinc-400">Create and track budgets tailored to your goals</p>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            <h4 className="font-semibold text-white mb-2">Investment Guidance</h4>
            <p className="text-sm text-zinc-400">Get personalized investment recommendations</p>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            <h4 className="font-semibold text-white mb-2">Debt Management</h4>
            <p className="text-sm text-zinc-400">Strategies to pay down debt efficiently</p>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            <h4 className="font-semibold text-white mb-2">Wealth Building</h4>
            <p className="text-sm text-zinc-400">Long-term strategies for building wealth</p>
          </div>
        </div>
      </div>
    </div>
  );
}





