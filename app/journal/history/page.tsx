'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, Search, Filter, Calendar, X, BookOpen,
  Smile, Meh, Frown, CloudSun, CloudRain, ChevronRight,
  Loader2, Moon, Sparkles
} from 'lucide-react';

type MoodType = 'Great' | 'Good' | 'Okay' | 'Low' | 'Struggling' | null;

interface JournalEntry {
  id: string;
  title: string;
  date: string;
  mood: MoodType;
  tags: string[];
  preview: string;
}

const MOOD_CONFIG: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  'Great': { icon: <Smile className="w-4 h-4" />, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
  'Good': { icon: <CloudSun className="w-4 h-4" />, color: 'text-green-400', bg: 'bg-green-500/20' },
  'Okay': { icon: <Meh className="w-4 h-4" />, color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  'Low': { icon: <CloudRain className="w-4 h-4" />, color: 'text-orange-400', bg: 'bg-orange-500/20' },
  'Struggling': { icon: <Frown className="w-4 h-4" />, color: 'text-red-400', bg: 'bg-red-500/20' },
};

export default function JournalHistoryPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [moodFilter, setMoodFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  useEffect(() => {
    fetchEntries();
  }, [moodFilter, dateRange]);

  async function fetchEntries() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (moodFilter) params.set('mood', moodFilter);
      if (dateRange.start) params.set('startDate', dateRange.start);
      if (dateRange.end) params.set('endDate', dateRange.end);

      const res = await fetch(`/api/journal/pull?${params}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries || []);
      }
    } catch (e) {
      console.error('Error fetching journals:', e);
    }
    setLoading(false);
  }

  // Filter by search client-side
  const filteredEntries = search
    ? entries.filter(e =>
        e.title.toLowerCase().includes(search.toLowerCase()) ||
        e.preview.toLowerCase().includes(search.toLowerCase()) ||
        e.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
      )
    : entries;

  // Group by month
  const groupedEntries = filteredEntries.reduce((acc, entry) => {
    const date = new Date(entry.date);
    const monthKey = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    if (!acc[monthKey]) acc[monthKey] = [];
    acc[monthKey].push(entry);
    return acc;
  }, {} as Record<string, JournalEntry[]>);

  function clearFilters() {
    setMoodFilter('');
    setDateRange({ start: '', end: '' });
    setSearch('');
  }

  const hasFilters = moodFilter || dateRange.start || dateRange.end || search;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950/20 to-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800/50 bg-slate-900/30 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/journal" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Journal</span>
          </Link>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            <span className="font-semibold text-white">Journal History</span>
          </div>
          <Link href="/journal" className="text-sm text-indigo-400 hover:text-indigo-300">
            + New Entry
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search journals..."
              className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-colors ${
              showFilters || hasFilters
                ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-400'
                : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span className="text-sm">Filters</span>
            {hasFilters && (
              <span className="w-2 h-2 rounded-full bg-indigo-400" />
            )}
          </button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-white">Filters</h3>
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Clear all
                </button>
              )}
            </div>

            {/* Mood Filter */}
            <div>
              <p className="text-xs text-slate-500 mb-2">Mood</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(MOOD_CONFIG).map(([mood, config]) => (
                  <button
                    key={mood}
                    onClick={() => setMoodFilter(moodFilter === mood ? '' : mood)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      moodFilter === mood
                        ? `${config.bg} ${config.color} border border-current`
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {config.icon}
                    {mood}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div>
              <p className="text-xs text-slate-500 mb-2">Date Range</p>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-slate-600 mb-1 block">From</label>
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange(d => ({ ...d, start: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-slate-600 mb-1 block">To</label>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange(d => ({ ...d, end: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results Summary */}
        <div className="flex items-center justify-between text-sm">
          <p className="text-slate-400">
            {filteredEntries.length} {filteredEntries.length === 1 ? 'entry' : 'entries'}
            {hasFilters && ' (filtered)'}
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredEntries.length === 0 && (
          <div className="text-center py-12 bg-slate-800/30 border border-slate-700/50 rounded-2xl">
            <Moon className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">
              {hasFilters ? 'No matching entries' : 'No journal entries yet'}
            </h3>
            <p className="text-slate-400 text-sm mb-4">
              {hasFilters
                ? 'Try adjusting your filters'
                : 'Start your first reflection to see it here'}
            </p>
            {hasFilters ? (
              <button
                onClick={clearFilters}
                className="text-indigo-400 hover:text-indigo-300 text-sm"
              >
                Clear filters
              </button>
            ) : (
              <Link
                href="/journal"
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm hover:bg-indigo-500 transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                Start Journaling
              </Link>
            )}
          </div>
        )}

        {/* Entries List */}
        {!loading && Object.entries(groupedEntries).map(([month, monthEntries]) => (
          <div key={month}>
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
              {month}
            </h2>
            <div className="space-y-3">
              {monthEntries.map((entry) => (
                <Link
                  key={entry.id}
                  href={`/journal/${entry.id}`}
                  className="block bg-slate-800/30 border border-slate-700/50 rounded-xl p-4 hover:border-slate-600 transition-all group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-white truncate group-hover:text-indigo-300 transition-colors">
                        {entry.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {new Date(entry.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {entry.mood && MOOD_CONFIG[entry.mood] && (
                        <div className={`p-1.5 rounded-lg ${MOOD_CONFIG[entry.mood].bg}`}>
                          <span className={MOOD_CONFIG[entry.mood].color}>
                            {MOOD_CONFIG[entry.mood].icon}
                          </span>
                        </div>
                      )}
                      <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400" />
                    </div>
                  </div>
                  
                  {entry.preview && (
                    <p className="text-sm text-slate-400 line-clamp-2 mb-2">
                      {entry.preview}...
                    </p>
                  )}

                  {entry.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {entry.tags.slice(0, 4).map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 bg-slate-700/50 text-slate-400 rounded text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                      {entry.tags.length > 4 && (
                        <span className="text-xs text-slate-500">
                          +{entry.tags.length - 4} more
                        </span>
                      )}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
