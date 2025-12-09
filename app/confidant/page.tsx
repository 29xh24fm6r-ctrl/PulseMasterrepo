'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Heart, BookOpen, Brain, Sparkles, Moon, Sun,
  MessageCircle, TrendingUp, Calendar, ChevronRight, Flame,
  Cloud, CloudRain, CloudSun, Smile, Meh, Frown, Zap,
  Coffee, Battery, BatteryLow, BatteryMedium, BatteryFull,
  Wind, Leaf, Star, Shield
} from 'lucide-react';

type MoodLevel = 1 | 2 | 3 | 4 | 5;
type EnergyLevel = 'low' | 'medium' | 'high';

const MOOD_CONFIG: Record<MoodLevel, { icon: React.ReactNode; label: string; color: string; bg: string }> = {
  1: { icon: <Frown className="w-6 h-6" />, label: 'Struggling', color: 'text-red-400', bg: 'bg-red-500/20 border-red-500/30' },
  2: { icon: <CloudRain className="w-6 h-6" />, label: 'Low', color: 'text-orange-400', bg: 'bg-orange-500/20 border-orange-500/30' },
  3: { icon: <Meh className="w-6 h-6" />, label: 'Okay', color: 'text-yellow-400', bg: 'bg-yellow-500/20 border-yellow-500/30' },
  4: { icon: <CloudSun className="w-6 h-6" />, label: 'Good', color: 'text-green-400', bg: 'bg-green-500/20 border-green-500/30' },
  5: { icon: <Smile className="w-6 h-6" />, label: 'Great', color: 'text-emerald-400', bg: 'bg-emerald-500/20 border-emerald-500/30' },
};

const ENERGY_CONFIG: Record<EnergyLevel, { icon: React.ReactNode; label: string; color: string }> = {
  low: { icon: <BatteryLow className="w-5 h-5" />, label: 'Low Energy', color: 'text-red-400' },
  medium: { icon: <BatteryMedium className="w-5 h-5" />, label: 'Moderate', color: 'text-yellow-400' },
  high: { icon: <BatteryFull className="w-5 h-5" />, label: 'High Energy', color: 'text-green-400' },
};

function PulseFace({ size = 80, mood = 'neutral' }: { size?: number; mood?: 'happy' | 'neutral' | 'concerned' }) {
  const getMouthPath = () => {
    switch (mood) {
      case 'happy': return 'M 35 62 Q 50 75 65 62';
      case 'concerned': return 'M 35 68 Q 50 62 65 68';
      default: return 'M 35 65 Q 50 70 65 65';
    }
  };

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <div className="absolute inset-0 rounded-full blur-xl bg-indigo-500/30" />
      <svg width={size} height={size} viewBox="0 0 100 100" className="relative z-10">
        <defs>
          <linearGradient id="faceGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="42" fill="url(#faceGradient)" />
        <ellipse cx="35" cy="42" rx="6" ry="8" fill="white" />
        <circle cx="36" cy="43" r="3" fill="#1e293b" />
        <ellipse cx="65" cy="42" rx="6" ry="8" fill="white" />
        <circle cx="66" cy="43" r="3" fill="#1e293b" />
        <path d={getMouthPath()} fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Hey there';
}

function getDailyReminder(): string {
  const reminders = [
    "You're not behind. You're exactly where you need to be.",
    "Progress isn't always visible. Trust the process.",
    "Your energy is finite. Protect it fiercely.",
    "Discipline is choosing between what you want now and what you want most.",
    "The obstacle is the way. Every challenge is training.",
    "Small consistent actions compound into extraordinary results.",
    "Rest is not the opposite of productivity. It's the foundation.",
    "Comparison is the thief of joy. Run your own race.",
  ];
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  return reminders[dayOfYear % reminders.length];
}

export default function ConfidantPage() {
  const router = useRouter();
  const [currentMood, setCurrentMood] = useState<MoodLevel | null>(null);
  const [currentEnergy, setCurrentEnergy] = useState<EnergyLevel | null>(null);
  const [moodNote, setMoodNote] = useState('');
  const [showMoodCheck, setShowMoodCheck] = useState(true);
  const [loading, setLoading] = useState(true);

  const greeting = getGreeting();
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  useEffect(() => {
    setLoading(false);
    const savedMood = localStorage.getItem('pulse-today-mood');
    if (savedMood) {
      try {
        const parsed = JSON.parse(savedMood);
        const savedDate = new Date(parsed.timestamp);
        if (savedDate.toDateString() === new Date().toDateString()) {
          setCurrentMood(parsed.mood);
          setCurrentEnergy(parsed.energy);
          setShowMoodCheck(false);
        }
      } catch {}
    }
  }, []);

  function saveMood() {
    if (!currentMood || !currentEnergy) return;
    const entry = { mood: currentMood, energy: currentEnergy, note: moodNote, timestamp: new Date().toISOString() };
    localStorage.setItem('pulse-today-mood', JSON.stringify(entry));
    setShowMoodCheck(false);
  }

  function getPulseMood(): 'happy' | 'neutral' | 'concerned' {
    if (!currentMood) return 'neutral';
    if (currentMood >= 4) return 'happy';
    if (currentMood <= 2) return 'concerned';
    return 'neutral';
  }

  function getPulseMessage(): string {
    if (!currentMood) return "Hey there. How are you feeling today? I'm here whenever you need to talk.";
    if (currentMood <= 2) return "I see today's been tough. Remember, it's okay to not be okay. Want to talk about it?";
    if (currentMood === 3) return "Sounds like a steady day. Sometimes 'okay' is exactly where we need to be.";
    return "Great to see you're doing well! Let's capture this positive energy.";
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950/20 to-slate-950">
      <header className="border-b border-slate-800/50 bg-slate-900/30 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" /><span className="text-sm">Dashboard</span>
          </Link>
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-pink-400" />
            <span className="font-semibold text-white">Confidant</span>
          </div>
          <div className="w-20" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <section className="text-center space-y-4">
          <PulseFace size={100} mood={getPulseMood()} />
          <div>
            <h1 className="text-2xl font-bold text-white">{greeting}</h1>
            <p className="text-slate-400 text-sm">{today}</p>
          </div>
          <p className="text-slate-300 max-w-md mx-auto text-sm leading-relaxed">{getPulseMessage()}</p>
        </section>

        {showMoodCheck && (
          <section className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6 space-y-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-white mb-1">Quick Check-in</h2>
              <p className="text-slate-400 text-sm">How are you feeling right now?</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">Mood</p>
              <div className="flex justify-center gap-2">
                {([1, 2, 3, 4, 5] as MoodLevel[]).map((level) => {
                  const config = MOOD_CONFIG[level];
                  const isSelected = currentMood === level;
                  return (
                    <button key={level} onClick={() => setCurrentMood(level)}
                      className={`p-4 rounded-xl border-2 transition-all ${isSelected ? `${config.bg} ${config.color} scale-110` : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'}`}
                      title={config.label}>{config.icon}</button>
                  );
                })}
              </div>
              {currentMood && <p className={`text-center text-sm mt-2 ${MOOD_CONFIG[currentMood].color}`}>{MOOD_CONFIG[currentMood].label}</p>}
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">Energy Level</p>
              <div className="flex justify-center gap-3">
                {(['low', 'medium', 'high'] as EnergyLevel[]).map((level) => {
                  const config = ENERGY_CONFIG[level];
                  const isSelected = currentEnergy === level;
                  return (
                    <button key={level} onClick={() => setCurrentEnergy(level)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${isSelected ? `bg-slate-700 border-slate-500 ${config.color}` : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'}`}>
                      {config.icon}<span className="text-sm">{config.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Quick note (optional)</p>
              <input type="text" value={moodNote} onChange={(e) => setMoodNote(e.target.value)} placeholder="What's on your mind?"
                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
            </div>
            <button onClick={saveMood} disabled={!currentMood || !currentEnergy}
              className={`w-full py-3 rounded-xl font-medium transition-all ${currentMood && currentEnergy ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-500' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}>
              Save Check-in
            </button>
          </section>
        )}

        {!showMoodCheck && currentMood && currentEnergy && (
          <section className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${MOOD_CONFIG[currentMood].bg}`}>{MOOD_CONFIG[currentMood].icon}</div>
                <div>
                  <p className="text-white font-medium">Today's Check-in</p>
                  <p className="text-slate-400 text-sm">Feeling {MOOD_CONFIG[currentMood].label.toLowerCase()} · {ENERGY_CONFIG[currentEnergy].label}</p>
                </div>
              </div>
              <button onClick={() => setShowMoodCheck(true)} className="text-sm text-indigo-400 hover:text-indigo-300">Update</button>
            </div>
          </section>
        )}

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/journal" className="group p-5 rounded-2xl bg-gradient-to-br from-indigo-900/30 to-purple-900/30 border border-indigo-500/30 hover:border-indigo-400/50 transition-all">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center group-hover:scale-110 transition-transform"><Moon className="w-5 h-5 text-indigo-400" /></div>
              <h3 className="font-semibold text-white">Evening Journal</h3>
            </div>
            <p className="text-slate-400 text-sm">Reflect on your day with guided prompts or free flow writing.</p>
          </Link>
          <Link href="/pulse" className="group p-5 rounded-2xl bg-gradient-to-br from-cyan-900/30 to-blue-900/30 border border-cyan-500/30 hover:border-cyan-400/50 transition-all">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center group-hover:scale-110 transition-transform"><MessageCircle className="w-5 h-5 text-cyan-400" /></div>
              <h3 className="font-semibold text-white">Talk to Pulse</h3>
            </div>
            <p className="text-slate-400 text-sm">Have a conversation about anything. I'm here to listen.</p>
          </Link>
          <Link href="/identity" className="group p-5 rounded-2xl bg-gradient-to-br from-purple-900/30 to-pink-900/30 border border-purple-500/30 hover:border-purple-400/50 transition-all">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center group-hover:scale-110 transition-transform"><Shield className="w-5 h-5 text-purple-400" /></div>
              <h3 className="font-semibold text-white">Identity Check</h3>
            </div>
            <p className="text-slate-400 text-sm">Explore who you're becoming. Align with your core identities.</p>
          </Link>
        </section>

        <section className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4">Conversation Starters</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { icon: <Wind className="w-4 h-4" />, text: "I'm feeling overwhelmed and need to vent" },
              { icon: <Leaf className="w-4 h-4" />, text: "Help me process a difficult conversation" },
              { icon: <Star className="w-4 h-4" />, text: "I want to celebrate a win today" },
              { icon: <Coffee className="w-4 h-4" />, text: "I need motivation to keep going" },
            ].map((prompt, i) => (
              <button key={i} onClick={() => router.push(`/pulse?prompt=${encodeURIComponent(prompt.text)}`)}
                className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-slate-600 text-left transition-all group">
                <div className="text-slate-400 group-hover:text-indigo-400 transition-colors">{prompt.icon}</div>
                <span className="text-slate-300 text-sm">{prompt.text}</span>
                <ChevronRight className="w-4 h-4 text-slate-600 ml-auto group-hover:text-slate-400" />
              </button>
            ))}
          </div>
        </section>

        <section className="bg-gradient-to-br from-amber-900/20 to-orange-900/20 border border-amber-500/20 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h2 className="font-semibold text-white">Daily Reminder</h2>
          </div>
          <p className="text-amber-100/80 text-sm leading-relaxed">{getDailyReminder()}</p>
        </section>
      </main>
    </div>
  );
}
