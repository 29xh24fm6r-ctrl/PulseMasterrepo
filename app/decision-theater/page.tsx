// Decision Theater - Home Page
// app/decision-theater/page.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDossiers, useStartCouncilSession } from '@/lib/hooks/decisionTheater';

export default function DecisionTheaterHomePage() {
  const router = useRouter();
  const { dossiers, loading: dossiersLoading } = useDossiers();
  const { startSession, pending, error } = useStartCouncilSession();

  const [formData, setFormData] = useState({
    topic: '',
    question: '',
    timescale: 'quarter',
    importance: 75,
    context: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.topic.trim() || !formData.question.trim()) {
      alert('Please fill in topic and question');
      return;
    }

    try {
      const result = await startSession({
        topic: formData.topic.trim(),
        question: formData.question.trim(),
        timescale: formData.timescale,
        importance: formData.importance / 100,
        context: formData.context.trim() ? { notes: formData.context.trim() } : undefined,
      });

      router.push(`/decision-theater/session/${result.sessionId}`);
    } catch (err) {
      console.error('Failed to start session', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Decision Theater</h1>
          <p className="text-lg text-gray-600">
            When the next move really matters, this is where you come.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Recent Decisions */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Major Decisions</h2>
            {dossiersLoading ? (
              <div className="text-gray-500">Loading...</div>
            ) : dossiers.length === 0 ? (
              <div className="text-gray-500">No decisions yet. Start your first council session!</div>
            ) : (
              <div className="space-y-3">
                {dossiers.slice(0, 5).map((dossier) => (
                  <div
                    key={dossier.id}
                    className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => router.push(`/decision-theater/session/${dossier.session_id}`)}
                  >
                    <h3 className="font-semibold text-gray-900 mb-1">{dossier.decision_label}</h3>
                    <p className="text-sm text-gray-600 mb-2">{dossier.question}</p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{new Date(dossier.created_at).toLocaleDateString()}</span>
                      {dossier.user_choice && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                          {dossier.user_choice}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: New Council Session Form */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Start a New Council Session</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Topic *
                </label>
                <input
                  type="text"
                  value={formData.topic}
                  onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                  placeholder="e.g., Quit OGB for startup?"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Decision Question *
                </label>
                <textarea
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  placeholder="Should I leave Old Glory Bank for a startup opportunity in the next 3-6 months?"
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Timescale
                </label>
                <select
                  value={formData.timescale}
                  onChange={(e) => setFormData({ ...formData, timescale: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="day">Day</option>
                  <option value="week">Week</option>
                  <option value="month">Month</option>
                  <option value="quarter">Quarter</option>
                  <option value="year">Year</option>
                  <option value="lifetime">Lifetime</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Importance: {formData.importance}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={formData.importance}
                  onChange={(e) => setFormData({ ...formData, importance: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Additional Context (Optional)
                </label>
                <textarea
                  value={formData.context}
                  onChange={(e) => setFormData({ ...formData, context: e.target.value })}
                  placeholder="Any additional context or constraints..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {error && (
                <div className="text-red-600 text-sm">{error}</div>
              )}

              <button
                type="submit"
                disabled={pending}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
              >
                {pending ? 'Convening Council...' : 'Convene Council'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}


