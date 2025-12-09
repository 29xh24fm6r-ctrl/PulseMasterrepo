'use client';

// Pulse OS - XP Ascension Page
// app/xp/page.tsx

import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Flame, Zap, Crown, Brain, Trophy, TrendingUp,
  Lock, Unlock, ChevronRight, Sparkles, Shield, Target, Star,
  Swords, Award, RefreshCw
} from 'lucide-react';
import { useRouter } from 'next/navigation';

// Types
type XPCategory = 'DXP' | 'PXP' | 'IXP' | 'AXP' | 'MXP';
type IdentityType = 'Stoic' | 'Samurai' | 'Builder' | 'Father' | 'Warrior' | 'Strategist' | 'Leader' | 'Creator';

interface Skill {
  id: string;
  name: string;
  description: string;
  category: XPCategory;
  levelRequired: number;
  icon: string;
}

const XP_CATEGORY_INFO: Record<XPCategory, {
  name: string;
  fullName: string;
  icon: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
}> = {
  DXP: { name: 'DXP', fullName: 'Discipline', icon: '⚔️', bgClass: 'bg-amber-500/20', textClass: 'text-amber-400', borderClass: 'border-amber-500/50' },
  PXP: { name: 'PXP', fullName: 'Power', icon: '👑', bgClass: 'bg-red-500/20', textClass: 'text-red-400', borderClass: 'border-red-500/50' },
  IXP: { name: 'IXP', fullName: 'Identity', icon: '🧬', bgClass: 'bg-violet-500/20', textClass: 'text-violet-400', borderClass: 'border-violet-500/50' },
  AXP: { name: 'AXP', fullName: 'Achievement', icon: '🏆', bgClass: 'bg-emerald-500/20', textClass: 'text-emerald-400', borderClass: 'border-emerald-500/50' },
  MXP: { name: 'MXP', fullName: 'Momentum', icon: '🔥', bgClass: 'bg-cyan-500/20', textClass: 'text-cyan-400', borderClass: 'border-cyan-500/50' },
};

const IDENTITY_INFO: Record<IdentityType, {
  icon: string;
  color: string;
  bgClass: string;
  borderClass: string;
  description: string;
}> = {
  Stoic: { icon: '🏛️', color: 'text-indigo-400', bgClass: 'bg-indigo-500/20', borderClass: 'border-indigo-500/50', description: 'Master of emotions and adversity' },
  Samurai: { icon: '⚔️', color: 'text-red-400', bgClass: 'bg-red-500/20', borderClass: 'border-red-500/50', description: 'Decisive action, clean cuts' },
  Builder: { icon: '🏗️', color: 'text-amber-400', bgClass: 'bg-amber-500/20', borderClass: 'border-amber-500/50', description: 'Systems architect, creator of leverage' },
  Father: { icon: '👨‍👦', color: 'text-emerald-400', bgClass: 'bg-emerald-500/20', borderClass: 'border-emerald-500/50', description: 'Teacher, protector, leader by example' },
  Warrior: { icon: '🛡️', color: 'text-red-400', bgClass: 'bg-red-500/20', borderClass: 'border-red-500/50', description: 'Relentless pursuit, never backing down' },
  Strategist: { icon: '♟️', color: 'text-violet-400', bgClass: 'bg-violet-500/20', borderClass: 'border-violet-500/50', description: 'Long-term thinking, chess moves' },
  Leader: { icon: '🎖️', color: 'text-cyan-400', bgClass: 'bg-cyan-500/20', borderClass: 'border-cyan-500/50', description: 'Influence, authority, command presence' },
  Creator: { icon: '✨', color: 'text-pink-400', bgClass: 'bg-pink-500/20', borderClass: 'border-pink-500/50', description: 'Building something from nothing' },
};

// Skill trees data
const SKILL_TREES: Record<XPCategory, Skill[]> = {
  DXP: [
    { id: 'focus_surge', name: 'Focus Surge', description: 'Deep work sessions give bonus XP', category: 'DXP', levelRequired: 3, icon: '🎯' },
    { id: 'no_hesitation', name: 'No Hesitation', description: 'Instant action removes procrastination penalty', category: 'DXP', levelRequired: 5, icon: '⚡' },
    { id: 'auto_follow', name: 'Auto-Follow', description: 'Follow-ups create themselves', category: 'DXP', levelRequired: 7, icon: '🔄' },
    { id: 'iron_routine', name: 'Iron Routine', description: 'Morning routine streaks are protected', category: 'DXP', levelRequired: 10, icon: '🛡️' },
    { id: 'mind_lock', name: 'Mind Lock', description: 'Distraction immunity for 2 hours daily', category: 'DXP', levelRequired: 15, icon: '🔒' },
  ],
  PXP: [
    { id: 'exec_presence', name: 'Executive Presence', description: 'Meetings give bonus PXP', category: 'PXP', levelRequired: 3, icon: '👔' },
    { id: 'boundary_mastery', name: 'Boundary Mastery', description: 'Saying no gives 2× PXP', category: 'PXP', levelRequired: 5, icon: '🚧' },
    { id: 'influence_pulse', name: 'Influence Pulse', description: 'Detect power dynamics in rooms', category: 'PXP', levelRequired: 7, icon: '📡' },
    { id: 'authority_aura', name: 'Authority Aura', description: 'Passive respect modifier', category: 'PXP', levelRequired: 10, icon: '👑' },
    { id: 'command_voice', name: 'Command Voice', description: 'Requests become directives', category: 'PXP', levelRequired: 15, icon: '🎤' },
  ],
  IXP: [
    { id: 'stoic_flame', name: 'Stoic Flame', description: 'Adversity gives bonus IXP', category: 'IXP', levelRequired: 3, icon: '🔥' },
    { id: 'samurai_heart', name: 'Samurai Heart', description: 'Clean cuts are always crits', category: 'IXP', levelRequired: 5, icon: '⚔️' },
    { id: 'calm_under_fire', name: 'Calm Under Fire', description: 'Stress unlocks crit windows', category: 'IXP', levelRequired: 7, icon: '🧘' },
    { id: 'identity_lock', name: 'Identity Lock', description: 'Active identity persists longer', category: 'IXP', levelRequired: 10, icon: '🔐' },
    { id: 'north_star', name: 'North Star Clarity', description: 'Always know the right path', category: 'IXP', levelRequired: 15, icon: '⭐' },
  ],
  AXP: [
    { id: 'deal_accelerator', name: 'Deal Accelerator', description: 'Deals advance faster', category: 'AXP', levelRequired: 3, icon: '🚀' },
    { id: 'pipeline_momentum', name: 'Pipeline Momentum', description: 'Multiple deals boost each other', category: 'AXP', levelRequired: 5, icon: '📈' },
    { id: 'systems_architect', name: 'Systems Architect', description: 'Building systems gives 2× AXP', category: 'AXP', levelRequired: 7, icon: '🏗️' },
    { id: 'precision_execution', name: 'Precision Execution', description: 'First-time wins give bonus', category: 'AXP', levelRequired: 10, icon: '🎯' },
    { id: 'master_closer', name: 'Master Closer', description: 'Deal wins trigger chain bonuses', category: 'AXP', levelRequired: 15, icon: '🏆' },
  ],
  MXP: [
    { id: 'combo_chain', name: 'Combo Chain', description: 'Back-to-back tasks multiply', category: 'MXP', levelRequired: 3, icon: '⛓️' },
    { id: 'hot_streak', name: 'Hot Streak', description: 'Streaks give increasing bonuses', category: 'MXP', levelRequired: 5, icon: '🔥' },
    { id: 'flow_surge', name: 'Flow Surge', description: 'Flow state detection and boost', category: 'MXP', levelRequired: 7, icon: '🌊' },
    { id: 'no_zero_engine', name: 'No Zero Day Engine', description: 'Even small wins count big', category: 'MXP', levelRequired: 10, icon: '⚙️' },
    { id: 'consistency_lock', name: 'Consistency Lock', description: 'Streaks never break on rest days', category: 'MXP', levelRequired: 15, icon: '🔒' },
  ],
};

export default function XPPage() {
  const router = useRouter();
  const [state, setState] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'skills' | 'identity'>('overview');
  const [selectedCategory, setSelectedCategory] = useState<XPCategory>('DXP');

  useEffect(() => {
    fetchXP();
  }, []);

  async function fetchXP() {
    setLoading(true);
    try {
      const res = await fetch('/api/xp?history=true');
      const data = await res.json();
      if (data.success) {
        setState(data.state);
        setStats(data.stats);
      }
    } catch (e) {
      console.error('Failed to fetch XP:', e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading Ascension data...</p>
        </div>
      </div>
    );
  }

  if (!state || !stats) {
    return (
      <div className="min-h-screen bg-gray-900 p-6">
        <button onClick={() => router.push('/')} className="flex items-center gap-2 text-gray-400 hover:text-white mb-6">
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>
        <p className="text-gray-400">Failed to load XP data</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900/50 via-indigo-900/50 to-purple-900/50 border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <button 
              onClick={() => router.push('/')} 
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Dashboard
            </button>
            <button 
              onClick={fetchXP}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>

          {/* Ascension Header */}
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 via-indigo-500 to-blue-500 flex items-center justify-center shadow-2xl shadow-purple-500/30">
                <span className="text-4xl font-bold text-white">{state.ascensionLevel}</span>
              </div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center">
                <Star className="w-5 h-5 text-yellow-400" />
              </div>
            </div>
            
            <div className="flex-1">
              <p className="text-purple-300 text-sm uppercase tracking-wider mb-1">Ascension Level</p>
              <h1 className="text-3xl font-bold text-white mb-2">{getAscensionTitle(state.ascensionLevel)}</h1>
              <div className="flex items-center gap-4">
                {state.activeIdentity && (
                  <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${IDENTITY_INFO[state.activeIdentity as IdentityType]?.bgClass}`}>
                    <span>{IDENTITY_INFO[state.activeIdentity as IdentityType]?.icon}</span>
                    <span className={`text-sm font-medium ${IDENTITY_INFO[state.activeIdentity as IdentityType]?.color}`}>
                      {state.activeIdentity} Active
                    </span>
                  </div>
                )}
                {state.critWindow?.active && (
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/20 animate-pulse">
                    <Zap className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm font-medium text-yellow-400">Crit Window Open</span>
                  </div>
                )}
              </div>
            </div>

            <div className="text-right">
              <p className="text-gray-400 text-sm">Total XP</p>
              <p className="text-3xl font-bold text-white">{stats.totalXP.toLocaleString()}</p>
              <p className="text-green-400 text-sm">+{stats.todayTotal} today</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex gap-1">
            {(['overview', 'skills', 'identity'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === tab
                    ? 'text-purple-400 border-purple-500'
                    : 'text-gray-400 border-transparent hover:text-gray-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {activeTab === 'overview' && (
          <OverviewTab state={state} stats={stats} />
        )}
        {activeTab === 'skills' && (
          <SkillsTab 
            state={state} 
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />
        )}
        {activeTab === 'identity' && (
          <IdentityTab state={state} />
        )}
      </div>
    </div>
  );
}

// Overview Tab
function OverviewTab({ state, stats }: { state: any; stats: any }) {
  return (
    <div className="space-y-8">
      {/* XP Categories Grid */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">XP Categories</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {stats.categoryProgress.map((cat: any) => {
            const info = XP_CATEGORY_INFO[cat.category as XPCategory];
            return (
              <div 
                key={cat.category}
                className={`p-4 rounded-xl border ${info.borderClass} ${info.bgClass}`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">{info.icon}</span>
                  <div>
                    <p className="text-xs text-gray-400">{info.fullName}</p>
                    <p className={`text-lg font-bold ${info.textClass}`}>Level {cat.level}</p>
                  </div>
                </div>
                
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden mb-2">
                  <div 
                    className={`h-full bg-gradient-to-r ${
                      cat.category === 'DXP' ? 'from-amber-500 to-orange-500' :
                      cat.category === 'PXP' ? 'from-red-500 to-rose-500' :
                      cat.category === 'IXP' ? 'from-violet-500 to-purple-500' :
                      cat.category === 'AXP' ? 'from-emerald-500 to-green-500' :
                      'from-cyan-500 to-blue-500'
                    }`}
                    style={{ width: `${cat.progress * 100}%` }}
                  />
                </div>
                
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">{cat.xp.toLocaleString()} XP</span>
                  <span className="text-gray-500">{cat.toNextLevel.toLocaleString()} to next</span>
                </div>
                
                {state.todayXP[cat.category] > 0 && (
                  <p className={`text-xs mt-2 ${info.textClass}`}>
                    +{state.todayXP[cat.category]} today
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <Flame className="w-5 h-5 text-orange-400" />
            <span className="text-gray-400 text-sm">Current Streak</span>
          </div>
          <p className="text-2xl font-bold text-white">{state.currentStreak} days</p>
        </div>
        
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <span className="text-gray-400 text-sm">Longest Streak</span>
          </div>
          <p className="text-2xl font-bold text-white">{state.longestStreak} days</p>
        </div>
        
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <Unlock className="w-5 h-5 text-green-400" />
            <span className="text-gray-400 text-sm">Skills Unlocked</span>
          </div>
          <p className="text-2xl font-bold text-white">{state.unlockedSkills?.length || 0}</p>
        </div>
        
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-purple-400" />
            <span className="text-gray-400 text-sm">Strongest</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {XP_CATEGORY_INFO[stats.strongestCategory as XPCategory]?.icon} {stats.strongestCategory}
          </p>
        </div>
      </div>

      {/* How to Earn XP */}
      <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700">
        <h3 className="text-lg font-bold text-white mb-4">How to Earn XP</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-amber-400 font-medium mb-2">⚔️ Discipline (DXP)</p>
            <ul className="text-gray-400 space-y-1">
              <li>• Complete habits</li>
              <li>• Finish tasks</li>
              <li>• Send follow-ups</li>
              <li>• Morning routine</li>
            </ul>
          </div>
          <div>
            <p className="text-red-400 font-medium mb-2">👑 Power (PXP)</p>
            <ul className="text-gray-400 space-y-1">
              <li>• Win negotiations</li>
              <li>• Set boundaries</li>
              <li>• Difficult conversations</li>
              <li>• Executive decisions</li>
            </ul>
          </div>
          <div>
            <p className="text-violet-400 font-medium mb-2">🧬 Identity (IXP)</p>
            <ul className="text-gray-400 space-y-1">
              <li>• Stoic moments</li>
              <li>• Emotional mastery</li>
              <li>• Father moments</li>
              <li>• Choosing the harder right</li>
            </ul>
          </div>
          <div>
            <p className="text-emerald-400 font-medium mb-2">🏆 Achievement (AXP)</p>
            <ul className="text-gray-400 space-y-1">
              <li>• Close deals</li>
              <li>• Build systems</li>
              <li>• Hit milestones</li>
              <li>• Fund loans</li>
            </ul>
          </div>
          <div>
            <p className="text-cyan-400 font-medium mb-2">🔥 Momentum (MXP)</p>
            <ul className="text-gray-400 space-y-1">
              <li>• Maintain streaks</li>
              <li>• No-zero days</li>
              <li>• Back-to-back wins</li>
              <li>• Weekly reviews</li>
            </ul>
          </div>
          <div>
            <p className="text-yellow-400 font-medium mb-2">⚡ Crit Windows</p>
            <ul className="text-gray-400 space-y-1">
              <li>• Act within 2 minutes</li>
              <li>• Handle conflict calmly</li>
              <li>• Complete avoided tasks</li>
              <li>• 2-4× XP multiplier!</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// Skills Tab
function SkillsTab({ 
  state, 
  selectedCategory, 
  onSelectCategory 
}: { 
  state: any; 
  selectedCategory: XPCategory;
  onSelectCategory: (cat: XPCategory) => void;
}) {
  const skills = SKILL_TREES[selectedCategory];
  const currentLevel = state.levels[selectedCategory];
  const unlockedSkills = state.unlockedSkills || [];
  
  return (
    <div className="space-y-6">
      {/* Category Selector */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {(Object.keys(XP_CATEGORY_INFO) as XPCategory[]).map((cat) => {
          const info = XP_CATEGORY_INFO[cat];
          const isSelected = cat === selectedCategory;
          return (
            <button
              key={cat}
              onClick={() => onSelectCategory(cat)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
                isSelected
                  ? `${info.bgClass} border ${info.borderClass}`
                  : 'bg-gray-800 border border-gray-700 hover:border-gray-600'
              }`}
            >
              <span>{info.icon}</span>
              <span className={isSelected ? info.textClass : 'text-gray-400'}>
                {info.fullName}
              </span>
              <span className={`text-xs ${isSelected ? info.textClass : 'text-gray-500'}`}>
                Lv.{state.levels[cat]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Skill Tree */}
      <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700">
        <h3 className="text-lg font-bold text-white mb-6">
          {XP_CATEGORY_INFO[selectedCategory].icon} {XP_CATEGORY_INFO[selectedCategory].fullName} Skill Tree
        </h3>
        
        <div className="space-y-4">
          {skills.map((skill, index) => {
            const isUnlocked = unlockedSkills.includes(skill.id);
            const canUnlock = currentLevel >= skill.levelRequired;
            
            return (
              <div key={skill.id} className="relative">
                {/* Connection line */}
                {index < skills.length - 1 && (
                  <div className={`absolute left-6 top-14 w-0.5 h-8 ${
                    isUnlocked ? 'bg-green-500' : 'bg-gray-700'
                  }`} />
                )}
                
                <div className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${
                  isUnlocked
                    ? 'bg-green-500/10 border-green-500/50'
                    : canUnlock
                    ? `${XP_CATEGORY_INFO[selectedCategory].bgClass} ${XP_CATEGORY_INFO[selectedCategory].borderClass}`
                    : 'bg-gray-800/50 border-gray-700 opacity-50'
                }`}>
                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                    isUnlocked
                      ? 'bg-green-500/20'
                      : canUnlock
                      ? XP_CATEGORY_INFO[selectedCategory].bgClass
                      : 'bg-gray-700'
                  }`}>
                    {isUnlocked ? '✓' : skill.icon}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className={`font-bold ${
                        isUnlocked
                          ? 'text-green-400'
                          : canUnlock
                          ? 'text-white'
                          : 'text-gray-500'
                      }`}>
                        {skill.name}
                      </h4>
                      {isUnlocked ? (
                        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                          UNLOCKED
                        </span>
                      ) : (
                        <span className="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded-full">
                          Level {skill.levelRequired}
                        </span>
                      )}
                    </div>
                    <p className={`text-sm ${
                      isUnlocked || canUnlock ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {skill.description}
                    </p>
                  </div>
                  
                  {/* Status */}
                  <div className="flex-shrink-0">
                    {isUnlocked ? (
                      <Unlock className="w-5 h-5 text-green-400" />
                    ) : canUnlock ? (
                      <div className="text-center">
                        <span className={`text-xs ${XP_CATEGORY_INFO[selectedCategory].textClass}`}>
                          Ready!
                        </span>
                      </div>
                    ) : (
                      <Lock className="w-5 h-5 text-gray-600" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Identity Tab
function IdentityTab({ state }: { state: any }) {
  const resonance = state.identityResonance || {};
  const maxResonance = Math.max(...Object.values(resonance as Record<string, number>), 1);
  
  return (
    <div className="space-y-6">
      {/* Active Identity */}
      {state.activeIdentity && (
        <div className={`p-6 rounded-xl border ${IDENTITY_INFO[state.activeIdentity as IdentityType]?.borderClass || 'border-gray-700'} ${IDENTITY_INFO[state.activeIdentity as IdentityType]?.bgClass || 'bg-gray-800/50'}`}>
          <div className="flex items-center gap-4">
            <span className="text-5xl">{IDENTITY_INFO[state.activeIdentity as IdentityType]?.icon}</span>
            <div>
              <p className="text-sm text-gray-400">Active Identity</p>
              <h2 className={`text-2xl font-bold ${IDENTITY_INFO[state.activeIdentity as IdentityType]?.color}`}>
                {state.activeIdentity}
              </h2>
              <p className="text-gray-400 text-sm mt-1">
                {IDENTITY_INFO[state.activeIdentity as IdentityType]?.description}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Identity Resonance */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">Identity Resonance</h2>
        <p className="text-gray-400 text-sm mb-6">
          As you take actions aligned with different identities, you build resonance. 
          When an identity reaches 500 resonance, it becomes available to activate.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(Object.entries(IDENTITY_INFO) as [IdentityType, typeof IDENTITY_INFO[IdentityType]][]).map(([id, info]) => {
            const value = resonance[id] || 0;
            const progress = Math.min(value / 500, 1);
            const isActive = state.activeIdentity === id;
            const isUnlocked = value >= 500;
            
            return (
              <div 
                key={id}
                className={`p-4 rounded-xl border transition-all ${
                  isActive
                    ? `${info.bgClass} border-2 ${info.color.replace('text-', 'border-')}`
                    : 'bg-gray-800/50 border-gray-700'
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{info.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className={`font-bold ${isActive ? info.color : 'text-white'}`}>
                        {id}
                      </h3>
                      {isActive && (
                        <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">
                          ACTIVE
                        </span>
                      )}
                      {isUnlocked && !isActive && (
                        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                          UNLOCKED
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">{info.description}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${isUnlocked ? info.color : 'text-gray-400'}`}>
                      {value}
                    </p>
                    <p className="text-xs text-gray-500">/ 500</p>
                  </div>
                </div>
                
                {/* Progress bar */}
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${
                      isUnlocked
                        ? `bg-gradient-to-r ${info.bgClass.replace('bg-', 'from-').replace('/20', '')} to-white/50`
                        : 'bg-gray-600'
                    }`}
                    style={{ width: `${progress * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Identity Info */}
      <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700">
        <h3 className="text-lg font-bold text-white mb-4">About Identities</h3>
        <div className="text-sm text-gray-400 space-y-3">
          <p>
            <strong className="text-white">Identity Resonance</strong> tracks which version of yourself 
            you're expressing through your actions. Every XP-earning activity adds resonance to one or more identities.
          </p>
          <p>
            <strong className="text-white">Activating an Identity</strong> once it reaches 500 resonance 
            gives you XP bonuses for actions aligned with that identity. A Stoic earns more IXP, 
            a Builder earns more AXP, etc.
          </p>
          <p>
            <strong className="text-white">Special Abilities</strong> unlock with each identity, 
            like crit windows during conflict (Stoic) or streak protection (Warrior).
          </p>
        </div>
      </div>
    </div>
  );
}

// Helper functions
function getAscensionTitle(level: number): string {
  if (level >= 50) return 'Transcendent';
  if (level >= 40) return 'Legendary';
  if (level >= 30) return 'Master';
  if (level >= 25) return 'Champion';
  if (level >= 20) return 'Commander';
  if (level >= 15) return 'Veteran';
  if (level >= 10) return 'Warrior';
  if (level >= 7) return 'Adept';
  if (level >= 5) return 'Apprentice';
  if (level >= 3) return 'Initiate';
  return 'Awakened';
}
