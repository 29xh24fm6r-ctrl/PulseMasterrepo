'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Heart, 
  Smile,
  Frown,
  Meh,
  Sun,
  Moon,
  Battery,
  BatteryLow,
  BatteryMedium,
  BatteryFull,
  Loader2,
  Check,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';

interface EmotionalState {
  currentMood: string | null;
  energyLevel: number | null;
  stressLevel: number | null;
  lastCheckIn: string | null;
  recentTrend: string;
  needsSupport: boolean;
  suggestedIntervention: string | null;
}

interface CheckIn {
  id: string;
  mood: string;
  energy: number;
  stress: number;
  checkedInAt: string;
}

type MoodLevel = 'great' | 'good' | 'okay' | 'bad' | 'terrible';

const MOODS: { value: MoodLevel; emoji: string; label: string; color: string }[] = [
  { value: 'great', emoji: '😄', label: 'Great', color: 'bg-emerald-500' },
  { value: 'good', emoji: '🙂', label: 'Good', color: 'bg-green-500' },
  { value: 'okay', emoji: '😐', label: 'Okay', color: 'bg-yellow-500' },
  { value: 'bad', emoji: '😔', label: 'Bad', color: 'bg-orange-500' },
  { value: 'terrible', emoji: '😢', label: 'Terrible', color: 'bg-red-500' },
];

function getTrendIcon(trend: string) {
  switch (trend) {
    case 'improving':
      return <TrendingUp className="w-4 h-4 text-emerald-400" />;
    case 'declining':
      return <TrendingDown className="w-4 h-4 text-red-400" />;
    default:
      return <Minus className="w-4 h-4 text-zinc-400" />;
  }
}

export default function EmotionalCheckInWidget() {
  const [state, setState] = useState<EmotionalState | null>(null);
  const [todaysCheckIn, setTodaysCheckIn] = useState<CheckIn | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
  // Form state
  const [mood, setMood] = useState<MoodLevel | null>(null);
  const [energy, setEnergy] = useState(3);
  const [stress, setStress] = useState(3);

  const fetchState = useCallback(async () => {
    try {
      const [stateRes, checkInRes] = await Promise.all([
        fetch('/api/emotional/checkin?mode=state'),
        fetch('/api/emotional/checkin?mode=today'),
      ]);
      
      const stateData = await stateRes.json();
      const checkInData = await checkInRes.json();
      
      if (stateData.state) setState(stateData.state);
      if (checkInData.checkIn) setTodaysCheckIn(checkInData.checkIn);
    } catch (error) {
      console.error('Failed to fetch emotional state:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  const submitCheckIn = async () => {
    if (!mood) return;
    
    setSubmitting(true);
    try {
      const res = await fetch('/api/emotional/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mood, energy, stress }),
      });
      
      const data = await res.json();
      if (data.success) {
        setTodaysCheckIn(data.checkIn);
        setState(data.state);
        setShowForm(false);
      }
    } catch (error) {
      console.error('Failed to submit check-in:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl">
        <div className="flex items-center gap-2 mb-4">
          <Heart className="w-5 h-5 text-pink-400" />
          <h3 className="font-semibold">How are you?</h3>
        </div>
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
        </div>
      </div>
    );
  }

  // Already checked in today
  if (todaysCheckIn && !showForm) {
    const moodConfig = MOODS.find(m => m.value === todaysCheckIn.mood);
    
    return (
      <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-pink-400" />
            <h3 className="font-semibold">How you're doing</h3>
          </div>
          {state && getTrendIcon(state.recentTrend)}
        </div>

        <div className="flex items-center gap-4">
          <div className="text-4xl">{moodConfig?.emoji || '😐'}</div>
          <div className="flex-1">
            <div className="text-sm font-medium mb-2">
              Feeling {moodConfig?.label || todaysCheckIn.mood}
            </div>
            <div className="flex items-center gap-4 text-xs text-zinc-400">
              <span className="flex items-center gap-1">
                <Battery className="w-3 h-3" />
                Energy: {todaysCheckIn.energy}/5
              </span>
              <span className="flex items-center gap-1">
                <Sun className="w-3 h-3" />
                Stress: {todaysCheckIn.stress}/5
              </span>
            </div>
          </div>
        </div>

        {state?.needsSupport && (
          <div className="mt-4 p-3 bg-pink-500/10 border border-pink-500/20 rounded-lg">
            <p className="text-sm text-pink-300">
              I'm here if you need support. Would you like to talk?
            </p>
          </div>
        )}

        <button
          onClick={() => setShowForm(true)}
          className="w-full mt-4 py-2 text-xs text-zinc-400 hover:text-white transition-colors"
        >
          Update check-in
        </button>
      </div>
    );
  }

  // Show check-in form
  return (
    <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl">
      <div className="flex items-center gap-2 mb-4">
        <Heart className="w-5 h-5 text-pink-400" />
        <h3 className="font-semibold">How are you feeling?</h3>
      </div>

      {/* Mood Selection */}
      <div className="flex justify-between mb-4">
        {MOODS.map(m => (
          <button
            key={m.value}
            onClick={() => setMood(m.value)}
            className={`p-2 rounded-xl transition-all ${
              mood === m.value
                ? 'bg-pink-500/20 ring-2 ring-pink-500 scale-110'
                : 'hover:bg-zinc-800'
            }`}
          >
            <span className="text-2xl">{m.emoji}</span>
          </button>
        ))}
      </div>

      {mood && (
        <>
          {/* Energy Slider */}
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
              <span>Energy</span>
              <span>{energy}/5</span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              value={energy}
              onChange={(e) => setEnergy(parseInt(e.target.value))}
              className="w-full accent-emerald-500"
            />
          </div>

          {/* Stress Slider */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
              <span>Stress</span>
              <span>{stress}/5</span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              value={stress}
              onChange={(e) => setStress(parseInt(e.target.value))}
              className="w-full accent-amber-500"
            />
          </div>

          <button
            onClick={submitCheckIn}
            disabled={submitting}
            className="w-full py-2 bg-pink-600 hover:bg-pink-500 rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            Check In
          </button>
        </>
      )}

      {!mood && (
        <p className="text-center text-xs text-zinc-500">
          Tap an emoji to check in
        </p>
      )}
    </div>
  );
}
