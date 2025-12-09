"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Lock, Check, Play, Sparkles, Loader2, X, ChevronRight, Trophy, Flame } from "lucide-react";

// Types
interface Skill {
  id: string;
  name: string;
  description: string;
  tier: number;
  prerequisites: string[];
  xpReward: number;
  trainingPrompt: string;
  masteryRequirement: string;
  icon: string;
}

interface SkillTree {
  id: string;
  name: string;
  philosophy: string;
  mentorIds: string[];
  description: string;
  icon: string;
  color: string;
  skills: Skill[];
}

interface UserProgress {
  [skillId: string]: {
    state: 'locked' | 'available' | 'in_progress' | 'mastered';
    masteredAt?: string;
  };
}

interface TreeStats {
  total: number;
  mastered: number;
  inProgress: number;
  available: number;
  locked: number;
  percentComplete: number;
}

interface TrainingEvaluation {
  passed: boolean;
  feedback: string;
  encouragement: string;
  nextStep?: string;
}

interface StreakData {
  currentStreak: number;
  streakMultiplier: number;
  todayComplete: boolean;
  tier: {
    name: string;
    icon: string;
    color: string;
  };
}

interface XPAwarded {
  amount: number;
  baseAmount?: number;
  wasCrit: boolean;
  streakMultiplier?: number;
  currentStreak?: number;
}

// ============================================
// SKILL NODE COMPONENT
// ============================================

function SkillNode({
  skill,
  state,
  onClick,
  streakMultiplier = 1,
}: {
  skill: Skill;
  state: 'locked' | 'available' | 'in_progress' | 'mastered';
  onClick: () => void;
  streakMultiplier?: number;
}) {
  const getStateStyles = () => {
    switch (state) {
      case 'mastered':
        return {
          bg: 'bg-green-500/20 border-green-500/50',
          icon: 'text-green-400',
          glow: 'shadow-green-500/20',
        };
      case 'available':
        return {
          bg: 'bg-blue-500/20 border-blue-500/50 hover:bg-blue-500/30 cursor-pointer',
          icon: 'text-blue-400',
          glow: 'shadow-blue-500/20 hover:shadow-blue-500/40',
        };
      case 'in_progress':
        return {
          bg: 'bg-yellow-500/20 border-yellow-500/50 hover:bg-yellow-500/30 cursor-pointer',
          icon: 'text-yellow-400',
          glow: 'shadow-yellow-500/20',
        };
      case 'locked':
      default:
        return {
          bg: 'bg-white/5 border-white/10',
          icon: 'text-white/30',
          glow: '',
        };
    }
  };
  
  const styles = getStateStyles();
  const isClickable = state === 'available' || state === 'in_progress';
  const adjustedXP = Math.round(skill.xpReward * streakMultiplier);
  
  return (
    <button
      onClick={isClickable ? onClick : undefined}
      disabled={!isClickable}
      className={`relative p-4 rounded-xl border-2 transition-all duration-300 text-left w-full ${styles.bg} ${styles.glow} shadow-lg`}
    >
      {/* State indicator */}
      <div className="absolute -top-2 -right-2">
        {state === 'mastered' && (
          <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
            <Check className="w-4 h-4 text-white" />
          </div>
        )}
        {state === 'locked' && (
          <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
            <Lock className="w-3 h-3 text-white/50" />
          </div>
        )}
        {state === 'available' && (
          <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center animate-pulse">
            <Play className="w-3 h-3 text-white" />
          </div>
        )}
        {state === 'in_progress' && (
          <div className="w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center">
            <Loader2 className="w-3 h-3 text-white animate-spin" />
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="flex items-start gap-3">
        <span className={`text-2xl ${state === 'locked' ? 'opacity-30' : ''}`}>{skill.icon}</span>
        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold ${state === 'locked' ? 'text-white/30' : 'text-white'}`}>
            {skill.name}
          </h3>
          <p className={`text-xs mt-1 line-clamp-2 ${state === 'locked' ? 'text-white/20' : 'text-white/60'}`}>
            {skill.description}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className={`text-xs px-2 py-0.5 rounded-full ${state === 'locked' ? 'bg-white/5 text-white/20' : 'bg-white/10 text-white/50'}`}>
              Tier {skill.tier}
            </span>
            <span className={`text-xs ${state === 'locked' ? 'text-white/20' : 'text-yellow-400'}`}>
              +{adjustedXP} IXP
              {streakMultiplier > 1 && state !== 'locked' && (
                <span className="text-orange-400 ml-1">({streakMultiplier}x)</span>
              )}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

// ============================================
// TRAINING MODAL
// ============================================

function TrainingModal({
  skill,
  tree,
  streak,
  onClose,
  onComplete,
}: {
  skill: Skill;
  tree: SkillTree;
  streak: StreakData | null;
  onClose: () => void;
  onComplete: () => void;
}) {
  const [response, setResponse] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [evaluation, setEvaluation] = useState<TrainingEvaluation | null>(null);
  const [xpAwarded, setXpAwarded] = useState<XPAwarded | null>(null);
  const [resultStreak, setResultStreak] = useState<{ current: number; multiplier: number } | null>(null);
  
  const potentialXP = Math.round(skill.xpReward * (streak?.streakMultiplier || 1));
  
  const submitTraining = async () => {
    if (!response.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    setEvaluation(null);
    
    try {
      const res = await fetch('/api/philosophy/training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          treeId: tree.id,
          skillId: skill.id,
          userResponse: response,
          mentorId: tree.mentorIds[0],
        }),
      });
      
      const data = await res.json();
      
      if (data.ok) {
        setEvaluation(data.evaluation);
        if (data.xpAwarded) {
          setXpAwarded(data.xpAwarded);
        }
        if (data.streak) {
          setResultStreak(data.streak);
        }
      }
    } catch (error) {
      console.error('Training error:', error);
      setEvaluation({
        passed: false,
        feedback: "Something went wrong. Please try again.",
        encouragement: "Don't give up!",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleContinue = () => {
    if (evaluation?.passed) {
      onComplete();
    }
    onClose();
  };
  
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 rounded-2xl border border-white/10 max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className="text-4xl">{skill.icon}</span>
              <div>
                <h2 className="text-xl font-bold">{skill.name}</h2>
                <p className="text-white/50 text-sm">{tree.name} • Tier {skill.tier}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {streak && streak.currentStreak > 0 && (
                <div className="flex items-center gap-1 px-3 py-1 bg-orange-500/20 rounded-lg border border-orange-500/30">
                  <span>{streak.tier.icon}</span>
                  <span className="text-sm font-medium text-orange-400">{streak.streakMultiplier}x</span>
                </div>
              )}
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Skill Description */}
          <div className="bg-white/5 rounded-lg p-4">
            <p className="text-white/80">{skill.description}</p>
          </div>
          
          {/* Streak Bonus Notice */}
          {streak && streak.streakMultiplier > 1 && !evaluation && (
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 flex items-center gap-3">
              <span className="text-2xl">{streak.tier.icon}</span>
              <div>
                <p className="text-sm font-medium text-orange-400">
                  {streak.currentStreak} Day Streak Active!
                </p>
                <p className="text-xs text-orange-300/70">
                  Complete this to earn {potentialXP} IXP ({streak.streakMultiplier}x bonus)
                </p>
              </div>
            </div>
          )}
          
          {/* Training Prompt */}
          <div>
            <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
              <span className="text-2xl">{tree.icon}</span>
              Training Challenge
            </h3>
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <p className="text-blue-100">{skill.trainingPrompt}</p>
            </div>
          </div>
          
          {/* Response Area (if no evaluation yet) */}
          {!evaluation && (
            <div>
              <h3 className="font-semibold mb-2">Your Response</h3>
              <textarea
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                placeholder="Take your time. Reflect deeply before answering..."
                className="w-full h-40 bg-white/5 border border-white/10 rounded-lg p-4 text-sm resize-none focus:outline-none focus:border-white/30"
              />
              <p className="text-xs text-white/30 mt-2">
                Mastery requires: {skill.masteryRequirement}
              </p>
            </div>
          )}
          
          {/* Evaluation Result */}
          {evaluation && (
            <div className={`rounded-lg p-6 ${evaluation.passed ? 'bg-green-500/10 border border-green-500/30' : 'bg-orange-500/10 border border-orange-500/30'}`}>
              <div className="flex items-center gap-3 mb-4">
                {evaluation.passed ? (
                  <>
                    <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
                      <Trophy className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-green-400 text-lg">Skill Mastered!</h3>
                      {xpAwarded && (
                        <div className="text-green-300 text-sm">
                          +{xpAwarded.amount} IXP
                          {xpAwarded.streakMultiplier && xpAwarded.streakMultiplier > 1 && (
                            <span className="text-orange-400 ml-2">
                              ({xpAwarded.streakMultiplier}x streak bonus!)
                            </span>
                          )}
                          {xpAwarded.wasCrit && <span className="text-yellow-400 ml-2">CRIT!</span>}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-orange-400 text-lg">Keep Growing</h3>
                      <p className="text-orange-300 text-sm">Not quite there yet</p>
                    </div>
                  </>
                )}
              </div>
              
              <p className="text-white/90 mb-3">{evaluation.feedback}</p>
              <p className="text-white/60 italic">{evaluation.encouragement}</p>
              
              {/* Streak Update */}
              {resultStreak && resultStreak.current > 0 && (
                <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span className="text-sm text-orange-400">
                    {resultStreak.current} day streak maintained!
                  </span>
                </div>
              )}
              
              {!evaluation.passed && evaluation.nextStep && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <p className="text-sm text-white/70">
                    <strong>Try this:</strong> {evaluation.nextStep}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-6 border-t border-white/10 flex justify-end gap-3">
          {!evaluation ? (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition"
              >
                Cancel
              </button>
              <button
                onClick={submitTraining}
                disabled={!response.trim() || isSubmitting}
                className={`px-6 py-2 rounded-lg transition flex items-center gap-2 ${
                  response.trim() && !isSubmitting
                    ? 'bg-blue-500 hover:bg-blue-600 text-white'
                    : 'bg-white/10 text-white/30 cursor-not-allowed'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Evaluating...
                  </>
                ) : (
                  <>
                    Submit
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              {!evaluation.passed && (
                <button
                  onClick={() => {
                    setEvaluation(null);
                    setResponse("");
                  }}
                  className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition"
                >
                  Try Again
                </button>
              )}
              <button
                onClick={handleContinue}
                className="px-6 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition"
              >
                {evaluation.passed ? 'Continue' : 'Close'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// TREE SELECTOR
// ============================================

function TreeSelector({
  trees,
  selectedTree,
  onSelect,
}: {
  trees: { id: string; name: string; icon: string; color: string; skillCount: number }[];
  selectedTree: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {trees.map((tree) => (
        <button
          key={tree.id}
          onClick={() => onSelect(tree.id)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition ${
            selectedTree === tree.id
              ? 'bg-white/20 border border-white/30'
              : 'bg-white/5 border border-white/10 hover:bg-white/10'
          }`}
        >
          <span className="text-xl">{tree.icon}</span>
          <span className="font-medium">{tree.name}</span>
        </button>
      ))}
    </div>
  );
}

// ============================================
// MAIN PAGE
// ============================================

export default function SkillTreePage() {
  const [trees, setTrees] = useState<{ id: string; name: string; icon: string; color: string; skillCount: number }[]>([]);
  const [selectedTreeId, setSelectedTreeId] = useState<string>('stoicism');
  const [currentTree, setCurrentTree] = useState<SkillTree | null>(null);
  const [progress, setProgress] = useState<UserProgress>({});
  const [stats, setStats] = useState<TreeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [trainingSkill, setTrainingSkill] = useState<Skill | null>(null);
  const [streak, setStreak] = useState<StreakData | null>(null);
  
  // Load available trees
  useEffect(() => {
    fetch('/api/philosophy/skills')
      .then(res => res.json())
      .then(data => {
        if (data.ok) {
          setTrees(data.trees);
        }
      });
    
    // Load streak data
    fetch('/api/philosophy/streaks')
      .then(res => res.json())
      .then(data => {
        if (data.ok) {
          setStreak(data);
        }
      });
  }, []);
  
  // Load selected tree
  useEffect(() => {
    if (!selectedTreeId) return;
    
    setLoading(true);
    fetch(`/api/philosophy/skills?tree=${selectedTreeId}`)
      .then(res => res.json())
      .then(data => {
        if (data.ok) {
          setCurrentTree(data.tree);
          setProgress(data.progress);
          setStats(data.stats);
        }
      })
      .finally(() => setLoading(false));
  }, [selectedTreeId]);
  
  const getSkillState = (skill: Skill): 'locked' | 'available' | 'in_progress' | 'mastered' => {
    const p = progress[skill.id];
    if (p) return p.state;
    
    // Check prerequisites
    const masteredSkills = Object.entries(progress)
      .filter(([_, p]) => p.state === 'mastered')
      .map(([id, _]) => id);
    
    const prereqsMet = skill.prerequisites.every(prereq => masteredSkills.includes(prereq));
    return prereqsMet ? 'available' : 'locked';
  };
  
  const handleTrainingComplete = () => {
    // Refresh tree data and streak
    fetch(`/api/philosophy/skills?tree=${selectedTreeId}`)
      .then(res => res.json())
      .then(data => {
        if (data.ok) {
          setProgress(data.progress);
          setStats(data.stats);
        }
      });
    
    fetch('/api/philosophy/streaks')
      .then(res => res.json())
      .then(data => {
        if (data.ok) {
          setStreak(data);
        }
      });
  };
  
  // Group skills by tier
  const skillsByTier = currentTree?.skills.reduce((acc, skill) => {
    if (!acc[skill.tier]) acc[skill.tier] = [];
    acc[skill.tier].push(skill);
    return acc;
  }, {} as Record<number, Skill[]>) || {};
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Link href="/philosophy-dojo" className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold">Skill Trees</h1>
                <p className="text-white/60">Master philosophical wisdom through training</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Streak Display */}
              {streak && streak.currentStreak > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 bg-orange-500/20 rounded-lg border border-orange-500/30">
                  <span className="text-xl">{streak.tier.icon}</span>
                  <div>
                    <p className="text-sm font-bold text-orange-400">{streak.currentStreak} Day Streak</p>
                    <p className="text-xs text-orange-300/70">{streak.streakMultiplier}x XP Bonus</p>
                  </div>
                </div>
              )}
              
              {stats && (
                <div className="hidden sm:flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-400">{stats.mastered}</p>
                    <p className="text-xs text-white/50">Mastered</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-400">{stats.available}</p>
                    <p className="text-xs text-white/50">Available</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white/30">{stats.locked}</p>
                    <p className="text-xs text-white/50">Locked</p>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Tree Selector */}
          <TreeSelector
            trees={trees}
            selectedTree={selectedTreeId}
            onSelect={setSelectedTreeId}
          />
        </div>
      </div>
      
      {/* Tree Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-white/50" />
          </div>
        ) : currentTree ? (
          <>
            {/* Tree Header */}
            <div className="mb-8 text-center">
              <span className="text-6xl mb-4 block">{currentTree.icon}</span>
              <h2 className="text-3xl font-bold mb-2">{currentTree.name}</h2>
              <p className="text-white/60 max-w-xl mx-auto">{currentTree.description}</p>
              
              {stats && (
                <div className="mt-4 flex items-center justify-center gap-2">
                  <div className="h-2 w-48 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-all duration-500"
                      style={{ width: `${stats.percentComplete}%` }}
                    />
                  </div>
                  <span className="text-sm text-white/50">{stats.percentComplete}%</span>
                </div>
              )}
            </div>
            
            {/* Skill Tree Grid by Tier */}
            <div className="space-y-12">
              {[1, 2, 3, 4].map(tier => {
                const tierSkills = skillsByTier[tier] || [];
                if (tierSkills.length === 0) return null;
                
                return (
                  <div key={tier}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`h-px flex-1 ${tier === 4 ? 'bg-gradient-to-r from-transparent to-yellow-500/50' : 'bg-white/10'}`} />
                      <h3 className={`font-semibold px-4 py-1 rounded-full ${
                        tier === 4 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-white/10 text-white/70'
                      }`}>
                        {tier === 4 ? '✨ Mastery' : `Tier ${tier}`}
                      </h3>
                      <div className={`h-px flex-1 ${tier === 4 ? 'bg-gradient-to-l from-transparent to-yellow-500/50' : 'bg-white/10'}`} />
                    </div>
                    
                    <div className={`grid gap-4 ${
                      tier === 4 ? 'grid-cols-1 max-w-md mx-auto' : 'grid-cols-1 sm:grid-cols-2'
                    }`}>
                      {tierSkills.map(skill => (
                        <SkillNode
                          key={skill.id}
                          skill={skill}
                          state={getSkillState(skill)}
                          onClick={() => setTrainingSkill(skill)}
                          streakMultiplier={streak?.streakMultiplier || 1}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="text-center py-20 text-white/50">
            Select a skill tree to begin
          </div>
        )}
      </div>
      
      {/* Training Modal */}
      {trainingSkill && currentTree && (
        <TrainingModal
          skill={trainingSkill}
          tree={currentTree}
          streak={streak}
          onClose={() => setTrainingSkill(null)}
          onComplete={handleTrainingComplete}
        />
      )}
    </div>
  );
}
