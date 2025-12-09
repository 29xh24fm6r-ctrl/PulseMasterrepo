"use client";
import { VoiceOverlay } from "@/components/VoiceOverlay";

import { useState, useEffect } from "react";
import Link from "next/link";
import CascadingJobSelector from "./CascadingJobSelector";
import { CoachModal } from "@/app/components/coach-modal";

interface JobModel {
  industryId: string;
  industryName: string;
  functionId: string;
  functionName: string;
  roleId: string;
  roleName: string;
  seniorityId: string;
  seniorityName: string;
  employmentTypeId: string;
  employmentTypeName: string;
  fullTitle: string;
  company?: string;
  typicalOutcomes: string[];
  coreSkills: string[];
  customSkills?: string[];
  dailyActivities: string[];
  confidenceScore: number;
  dataSource?: {
    intake?: boolean;
    deepDive?: boolean;
  };
  deepDiveInsights?: {
    teamContext?: { teamSize?: string; directReports?: string; reportsTo?: string };
    challenges?: string[];
    goals?: { twoYear?: string };
    workStyle?: { location?: string };
    companyContext?: string;
  };
  stakeholders?: string[];
  constraints?: string[];
}

interface UsageStats {
  roleplaySessions: number;
  questionsAsked: number;
  skillLessons: number;
  lastActive?: string;
}

const INDUSTRY_ICONS: Record<string, string> = {
  tech: '💻', finance: '🏦', healthcare: '🏥', retail: '🛍️',
  manufacturing: '🏭', consulting: '📊', media: '📺', education: '🎓',
  government: '🏛️', nonprofit: '💚', real_estate: '🏠', hospitality: '🏨',
  legal: '⚖️', energy: '⚡', creator: '🎬', startup: '🚀', other: '🌐'
};

export default function CareerCoachPage() {
  const [jobModel, setJobModel] = useState<JobModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [stats, setStats] = useState<UsageStats>({ roleplaySessions: 0, questionsAsked: 0, skillLessons: 0 });
  
  useEffect(() => {
    loadJobModel();
    loadStats();
  }, []);

  async function loadStats() {
    try {
      const res = await fetch('/api/career/stats');
      const data = await res.json();
      if (data.ok && data.stats) {
        setStats(data.stats);
      }
    } catch (error) {
      // Stats are optional, fail silently
    }
  }
  
  async function loadJobModel() {
    try {
      const res = await fetch('/api/career/job-model');
      const data = await res.json();
      if (data.ok && data.jobModel) {
        setJobModel(data.jobModel);
        setShowWizard(false);
      } else {
        setShowWizard(true);
      }
    } catch (error) {
      console.error('Failed to load job model:', error);
      setShowWizard(true);
    } finally {
      setLoading(false);
    }
  }
  
  async function handleJobSelection(result: any) {
    try {
      const res = await fetch('/api/career/job-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'intake_complete',
          selection: result,
        }),
      });
      
      const data = await res.json();
      if (data.ok) {
        setJobModel(data.jobModel);
        setShowWizard(false);
      }
    } catch (error) {
      console.error('Failed to save job model:', error);
    }
  }
  
  async function resetProfile() {
    if (!confirm('Reset your career profile? You\'ll need to set it up again.')) return;
    try {
      await fetch('/api/career/job-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' }),
      });
      setJobModel(null);
      setShowWizard(true);
    } catch (error) {
      console.error('Failed to reset:', error);
    }
  }
  
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-10 w-10 border-2 border-violet-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-zinc-500">Loading your career profile...</p>
        </div>
      </div>
    );
  }
  
  if (showWizard) {
    return (
      <div className="min-h-screen bg-zinc-950 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <Link href="/" className="text-zinc-500 hover:text-white text-sm mb-4 inline-flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">🎯</div>
            <h1 className="text-3xl font-bold text-white mb-2">Career Coach</h1>
            <p className="text-zinc-400">Let's set up your profile for personalized coaching</p>
          </div>
          <CascadingJobSelector onComplete={handleJobSelection} />
        </div>
      </div>
    );
  }

  const hasDeepDive = jobModel?.dataSource?.deepDive;
  
  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link 
              href="/"
              className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-white">Career Coach</h1>
              <p className="text-xs text-zinc-500">Your AI career development partner</p>
            </div>
          </div>
          <button
            onClick={resetProfile}
            className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
            title="Reset profile"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </header>
      
      <main className="max-w-4xl mx-auto px-4 py-6">
        {jobModel && (
          <div className="space-y-6">
            {/* Job Profile Card */}
            <div className="bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/30 rounded-2xl p-6">
              <div className="flex items-start gap-4">
                <div className="text-4xl">
                  {INDUSTRY_ICONS[jobModel.industryId] || '💼'}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-2xl font-bold text-white mb-1 truncate">
                    {jobModel.fullTitle}
                  </h2>
                  {jobModel.company && (
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-violet-300">at</span>
                      <span className="px-2 py-0.5 bg-violet-500/30 text-violet-200 text-sm rounded-lg font-medium">
                        {jobModel.company}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="px-2 py-1 bg-zinc-800/80 text-zinc-300 text-xs rounded-full">
                      {jobModel.industryName}
                    </span>
                    <span className="px-2 py-1 bg-zinc-800/80 text-zinc-300 text-xs rounded-full">
                      {jobModel.functionName}
                    </span>
                    <span className="px-2 py-1 bg-zinc-800/80 text-zinc-300 text-xs rounded-full">
                      {jobModel.seniorityName}
                    </span>
                  </div>
                  
                  {/* Core Skills */}
                  {jobModel.coreSkills?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {jobModel.coreSkills.slice(0, 5).map((skill, i) => (
                        <span key={i} className="px-2 py-0.5 bg-violet-500/20 text-violet-300 text-xs rounded-full">
                          {skill}
                        </span>
                      ))}
                      {jobModel.coreSkills.length > 5 && (
                        <span className="px-2 py-0.5 bg-zinc-800 text-zinc-500 text-xs rounded-full">
                          +{jobModel.coreSkills.length - 5}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Profile Status */}
                <div className="text-center flex-shrink-0">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-1 ${
                    hasDeepDive ? 'bg-emerald-500/20' : 'bg-amber-500/20'
                  }`}>
                    <span className={`text-lg ${hasDeepDive ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {hasDeepDive ? '✓' : '!'}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500">
                    {Math.round((jobModel.confidenceScore || 0.5) * 100)}%
                  </p>
                </div>
              </div>
            </div>
            
            {/* Deep Dive CTA */}
            {!hasDeepDive && (
              <Link 
                href="/career-coach/deep-dive"
                className="block bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 border border-amber-500/50 rounded-2xl p-5 hover:border-amber-400 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-amber-500/20 rounded-xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                    ⚡
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-amber-300 group-hover:text-amber-200 transition-colors">
                      Unlock Better Coaching
                    </h3>
                    <p className="text-sm text-zinc-400">
                      Quick multiple-choice questions to understand YOUR specific situation
                    </p>
                  </div>
                  <div className="flex-shrink-0 px-4 py-2 bg-amber-500 text-black font-semibold rounded-lg group-hover:bg-amber-400 transition-colors">
                    30 sec →
                  </div>
                </div>
              </Link>
            )}
            
            {/* Deep Dive Complete Badge */}
            {hasDeepDive && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-center gap-3">
                <span className="text-2xl">✅</span>
                <div className="flex-1">
                  <p className="text-emerald-400 font-medium">Deep Dive Complete</p>
                  <p className="text-xs text-zinc-500">
                    {jobModel.deepDiveInsights?.goals?.twoYear && `Goal: ${jobModel.deepDiveInsights.goals.twoYear}`}
                    {jobModel.deepDiveInsights?.challenges?.[0] && ` • Challenge: ${jobModel.deepDiveInsights.challenges[0]}`}
                  </p>
                </div>
                <Link 
                  href="/career-coach/deep-dive" 
                  className="text-xs text-zinc-500 hover:text-zinc-300 px-3 py-1 hover:bg-zinc-800 rounded-lg"
                >
                  Update
                </Link>
              </div>
            )}
            
            {/* Feature Cards */}
            <div className="grid md:grid-cols-2 gap-4">
              <Link 
                href="/career-coach/chat"
                className="group p-5 bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800 hover:border-violet-500/50 rounded-xl transition-all hover:scale-[1.02]"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-violet-500/20 rounded-lg flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                    💬
                  </div>
                  <h3 className="text-lg font-semibold text-white group-hover:text-violet-400 transition-colors">
                    AI Coach
                  </h3>
                </div>
                <p className="text-sm text-zinc-500">
                  Get personalized advice on any career challenge
                </p>
                {stats.questionsAsked > 0 && (
                  <p className="text-xs text-violet-400/70 mt-2">{stats.questionsAsked} question{stats.questionsAsked !== 1 ? 's' : ''} asked</p>
                )}
              </Link>
              
              <Link 
                href="/career-coach/roleplay"
                className="group p-5 bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800 hover:border-cyan-500/50 rounded-xl transition-all hover:scale-[1.02] relative"
              >
                <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-cyan-500 text-black text-xs font-bold rounded-full">
                  NEW
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                    🎭
                  </div>
                  <h3 className="text-lg font-semibold text-white group-hover:text-cyan-400 transition-colors">
                    Role-Play Practice
                  </h3>
                </div>
                <p className="text-sm text-zinc-500">
                  Practice tough conversations with AI feedback
                </p>
                {stats.roleplaySessions > 0 && (
                  <p className="text-xs text-cyan-400/70 mt-2">{stats.roleplaySessions} session{stats.roleplaySessions !== 1 ? 's' : ''} completed</p>
                )}
              </Link>
              
              <Link 
                href="/career-coach/advancement"
                className="group p-5 bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800 hover:border-amber-500/50 rounded-xl transition-all hover:scale-[1.02]"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                    📈
                  </div>
                  <h3 className="text-lg font-semibold text-white group-hover:text-amber-400 transition-colors">
                    Advancement Plan
                  </h3>
                </div>
                <p className="text-sm text-zinc-500">
                  Your roadmap to the next level
                </p>
              </Link>
              
              <Link 
                href="/career-coach/skills"
                className="group p-5 bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800 hover:border-emerald-500/50 rounded-xl transition-all hover:scale-[1.02]"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                    📚
                  </div>
                  <h3 className="text-lg font-semibold text-white group-hover:text-emerald-400 transition-colors">
                    Skill Building
                  </h3>
                </div>
                <p className="text-sm text-zinc-500">
                  Micro-lessons tailored to your role
                </p>
                {stats.skillLessons > 0 && (
                  <p className="text-xs text-emerald-400/70 mt-2">{stats.skillLessons} lesson{stats.skillLessons !== 1 ? 's' : ''} completed</p>
                )}
              </Link>
            </div>
            
            {/* Quick Actions */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Quick Actions</p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/career-coach/chat"
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg text-sm transition-all"
                >
                  💬 Ask a question
                </Link>
                <Link
                  href="/career-coach/roleplay"
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg text-sm transition-all"
                >
                  🎭 Practice a conversation
                </Link>
                <Link
                  href="/career-coach/advancement"
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg text-sm transition-all"
                >
                  📈 See my roadmap
                </Link>
              </div>
            </div>
            
            {/* Context Preview - only show if deep dive complete */}
            {hasDeepDive && jobModel.deepDiveInsights && (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Your Context</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {jobModel.deepDiveInsights.teamContext?.teamSize && (
                    <div className="p-3 bg-zinc-800/50 rounded-lg">
                      <p className="text-xs text-zinc-500">Team</p>
                      <p className="text-sm text-white truncate">{jobModel.deepDiveInsights.teamContext.teamSize}</p>
                    </div>
                  )}
                  {jobModel.deepDiveInsights.teamContext?.reportsTo && (
                    <div className="p-3 bg-zinc-800/50 rounded-lg">
                      <p className="text-xs text-zinc-500">Reports To</p>
                      <p className="text-sm text-white truncate">{jobModel.deepDiveInsights.teamContext.reportsTo}</p>
                    </div>
                  )}
                  {jobModel.deepDiveInsights.workStyle?.location && (
                    <div className="p-3 bg-zinc-800/50 rounded-lg">
                      <p className="text-xs text-zinc-500">Work Style</p>
                      <p className="text-sm text-white capitalize">{jobModel.deepDiveInsights.workStyle.location}</p>
                    </div>
                  )}
                  {jobModel.deepDiveInsights.companyContext && (
                    <div className="p-3 bg-zinc-800/50 rounded-lg">
                      <p className="text-xs text-zinc-500">Company</p>
                      <p className="text-sm text-white truncate">{jobModel.deepDiveInsights.companyContext}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Daily Activities - collapsed by default */}
            {jobModel.dailyActivities?.length > 0 && (
              <details className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden group">
                <summary className="p-4 cursor-pointer hover:bg-zinc-800/50 transition-colors flex items-center justify-between">
                  <span className="text-sm text-zinc-400">Typical Day Activities</span>
                  <svg className="w-4 h-4 text-zinc-500 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="p-4 pt-0 grid md:grid-cols-3 gap-2">
                  {jobModel.dailyActivities.map((activity, i) => (
                    <div 
                      key={i}
                      className="p-2 bg-zinc-800/50 rounded-lg text-xs text-zinc-400"
                    >
                      {activity}
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}
      </main>
    {/* Coach Modal */}
      <CoachModal
        coach="career-coach"
        coachName="Career Coach"
        coachIcon="💼"
        coachDescription="Your strategic career advisor"
        context={jobModel}
      />
    </div>
  );
}
