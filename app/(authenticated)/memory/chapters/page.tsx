// Life Chapters
// app/(authenticated)/memory/chapters/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { AppCard } from '@/components/ui/AppCard';
import { LoadingState } from '@/components/ui/LoadingState';
import { Badge } from '@/components/ui/badge';
import ReactMarkdown from 'react-markdown';

interface Chapter {
  id: string;
  title: string;
  summary_md: string;
  period_start: string;
  period_end: string;
  tags: string[];
  key_node_ids: string[];
}

export default function MemoryChaptersPage() {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChapters();
  }, []);

  async function fetchChapters() {
    try {
      const response = await fetch('/api/thirdbrain/chapters');
      const result = await response.json();
      setChapters(result.chapters || []);
    } catch (err) {
      console.error('[Chapters] Failed to fetch:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <LoadingState message="Loading life chapters..." />;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Life Chapters</h1>
        <p className="text-zinc-400">The story of your life, organized by periods</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white">All Chapters</h2>
          {chapters.length === 0 ? (
            <AppCard className="p-6">
              <p className="text-white/60">No chapters yet. Generate one to get started.</p>
            </AppCard>
          ) : (
            chapters.map((chapter) => (
              <AppCard
                key={chapter.id}
                className="p-6 cursor-pointer"
                onClick={() => setSelectedChapter(chapter)}
                variant={selectedChapter?.id === chapter.id ? 'interactive' : 'default'}
              >
                <h3 className="text-lg font-semibold text-white mb-2">{chapter.title}</h3>
                <p className="text-sm text-zinc-400 mb-3">
                  {new Date(chapter.period_start).toLocaleDateString()} - {new Date(chapter.period_end).toLocaleDateString()}
                </p>
                {chapter.tags && chapter.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {chapter.tags.map((tag, idx) => (
                      <Badge key={idx} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </AppCard>
            ))
          )}
        </div>

        <div>
          {selectedChapter ? (
            <AppCard className="p-6">
              <h2 className="text-xl font-semibold text-white mb-4">{selectedChapter.title}</h2>
              <p className="text-sm text-zinc-400 mb-4">
                {new Date(selectedChapter.period_start).toLocaleDateString()} - {new Date(selectedChapter.period_end).toLocaleDateString()}
              </p>
              <div className="prose prose-invert max-w-none">
                <ReactMarkdown>{selectedChapter.summary_md}</ReactMarkdown>
              </div>
            </AppCard>
          ) : (
            <AppCard className="p-6">
              <p className="text-white/60">Select a chapter to view details</p>
            </AppCard>
          )}
        </div>
      </div>
    </div>
  );
}


