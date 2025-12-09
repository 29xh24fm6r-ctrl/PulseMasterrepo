"use client";

import { useState } from "react";
import { Target, Zap, Brain, Sparkles, Star, TrendingUp, Plus, ChevronRight } from "lucide-react";

interface Value {
  id: string;
  value_name: string;
  importance_rank: number;
  confidence: number;
}

interface Strength {
  id: string;
  strength_name: string;
  category: string;
  confidence: number;
}

export default function IdentityPage() {
  const [activeTab, setActiveTab] = useState<"values" | "strengths" | "beliefs" | "aspirations">("values");
  
  // Mock data - in production, fetch from API
  const [values] = useState<Value[]>([
    { id: "1", value_name: "Growth", importance_rank: 1, confidence: 0.9 },
    { id: "2", value_name: "Family", importance_rank: 2, confidence: 0.95 },
    { id: "3", value_name: "Integrity", importance_rank: 3, confidence: 0.85 },
    { id: "4", value_name: "Innovation", importance_rank: 4, confidence: 0.8 },
  ]);

  const [strengths] = useState<Strength[]>([
    { id: "1", strength_name: "Strategic Thinking", category: "cognitive", confidence: 0.9 },
    { id: "2", strength_name: "Empathy", category: "interpersonal", confidence: 0.85 },
    { id: "3", strength_name: "Execution", category: "execution", confidence: 0.88 },
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <Target className="w-10 h-10 text-cyan-400" />
            Identity Profile
          </h1>
          <p className="text-slate-400 mt-2">Understand who you are and who you want to become</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-8 bg-slate-800/50 p-1 rounded-xl w-fit">
          {[
            { id: "values", label: "Values", icon: Star },
            { id: "strengths", label: "Strengths", icon: Zap },
            { id: "beliefs", label: "Beliefs", icon: Brain },
            { id: "aspirations", label: "Aspirations", icon: Sparkles }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Values Tab */}
        {activeTab === "values" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-400" />
                  Core Values
                </h3>
                <button className="p-2 bg-slate-700 rounded-lg hover:bg-slate-600">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-4">
                {values.map((value, index) => (
                  <div key={value.id} className="flex items-center gap-4 bg-slate-900/50 rounded-lg p-4">
                    <div className="w-8 h-8 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{value.value_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="h-1.5 flex-1 bg-slate-700 rounded-full">
                          <div
                            className="h-full bg-yellow-500 rounded-full"
                            style={{ width: `${value.confidence * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500">{Math.round(value.confidence * 100)}%</span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-500" />
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
              <h3 className="text-xl font-bold mb-4">Values Insights</h3>
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-lg p-4 border border-yellow-500/20">
                  <p className="text-sm text-yellow-300">
                    Your top value <strong>Growth</strong> shows in how you consistently seek learning opportunities and embrace challenges.
                  </p>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-4">
                  <p className="text-sm text-slate-400">
                    Consider: When facing decisions, ask yourself "Does this align with my core values?"
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Strengths Tab */}
        {activeTab === "strengths" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Zap className="w-5 h-5 text-green-400" />
                  Your Strengths
                </h3>
                <button className="p-2 bg-slate-700 rounded-lg hover:bg-slate-600">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-4">
                {strengths.map((strength) => (
                  <div key={strength.id} className="bg-slate-900/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold">{strength.strength_name}</p>
                      <span className="text-xs px-2 py-1 bg-slate-700 rounded-full capitalize">{strength.category}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 bg-slate-700 rounded-full">
                        <div
                          className="h-full bg-green-500 rounded-full"
                          style={{ width: `${strength.confidence * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-500">{Math.round(strength.confidence * 100)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
              <h3 className="text-xl font-bold mb-4">Leverage Your Strengths</h3>
              <p className="text-slate-400 mb-4">
                Your strengths are your natural advantages. Here's how to use them more effectively:
              </p>
              <div className="space-y-3">
                <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/20">
                  <p className="font-semibold text-green-400">Strategic Thinking</p>
                  <p className="text-sm text-slate-400 mt-1">
                    Use this to help others see the big picture and plan ahead.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Beliefs Tab */}
        {activeTab === "beliefs" && (
          <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Brain className="w-5 h-5 text-pink-400" />
              Beliefs & Mental Models
            </h3>
            <p className="text-slate-400 mb-6">
              Identify empowering beliefs to strengthen and limiting beliefs to challenge.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-green-400 mb-3">Empowering Beliefs</h4>
                <div className="space-y-2">
                  <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/20">
                    "I can learn anything with enough effort"
                  </div>
                  <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/20">
                    "Challenges help me grow"
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-red-400 mb-3">Beliefs to Examine</h4>
                <div className="space-y-2">
                  <div className="bg-red-500/10 rounded-lg p-3 border border-red-500/20">
                    "I need to be perfect"
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Aspirations Tab */}
        {activeTab === "aspirations" && (
          <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              Future Self
            </h3>
            <p className="text-slate-400 mb-6">
              Define who you want to become and what you want to achieve.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl p-6 border border-purple-500/20">
                <h4 className="font-semibold mb-2">1 Year</h4>
                <p className="text-slate-400 text-sm">What do you want to achieve in the next year?</p>
                <button className="mt-4 text-purple-400 text-sm flex items-center gap-1">
                  <Plus className="w-4 h-4" /> Add Aspiration
                </button>
              </div>
              <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-xl p-6 border border-blue-500/20">
                <h4 className="font-semibold mb-2">5 Years</h4>
                <p className="text-slate-400 text-sm">Where do you see yourself in 5 years?</p>
                <button className="mt-4 text-blue-400 text-sm flex items-center gap-1">
                  <Plus className="w-4 h-4" /> Add Aspiration
                </button>
              </div>
              <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-xl p-6 border border-orange-500/20">
                <h4 className="font-semibold mb-2">Lifetime</h4>
                <p className="text-slate-400 text-sm">What legacy do you want to leave?</p>
                <button className="mt-4 text-orange-400 text-sm flex items-center gap-1">
                  <Plus className="w-4 h-4" /> Add Aspiration
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}