// Decision Theater - Dossiers History Page
// app/decision-theater/dossiers/page.tsx

'use client';

import { useRouter } from 'next/navigation';
import { useDossiers } from '@/lib/hooks/decisionTheater';

export default function DecisionTheaterDossiersPage() {
  const router = useRouter();
  const { dossiers, loading, error } = useDossiers();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading dossiers...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-600">Failed to load dossiers: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => router.push('/decision-theater')}
            className="text-blue-600 hover:text-blue-800 mb-4 text-sm"
          >
            ← Back to Decision Theater
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Decision History</h1>
          <p className="text-gray-600">Review past council sessions and decisions</p>
        </div>

        {dossiers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No decisions recorded yet.</p>
            <button
              onClick={() => router.push('/decision-theater')}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Start Your First Council Session
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {dossiers.map((dossier) => (
              <div
                key={dossier.id}
                className="border rounded-lg p-6 bg-white hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push(`/decision-theater/session/${dossier.session_id}`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {dossier.decision_label}
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">{dossier.question}</p>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(dossier.created_at).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {dossier.user_choice && (
                    <span
                      className={`px-3 py-1 rounded-full text-sm ${
                        dossier.user_choice === 'follow'
                          ? 'bg-green-100 text-green-700'
                          : dossier.user_choice === 'other'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {dossier.user_choice === 'follow'
                        ? 'Followed Recommendation'
                        : dossier.user_choice === 'other'
                        ? 'Chose Alternative'
                        : 'Still Deciding'}
                    </span>
                  )}
                  {dossier.outcome && dossier.outcome.status && (
                    <span
                      className={`px-3 py-1 rounded-full text-sm ${
                        dossier.outcome.status === 'good'
                          ? 'bg-blue-100 text-blue-700'
                          : dossier.outcome.status === 'mixed'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {dossier.outcome.status}
                    </span>
                  )}
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/decision-theater/session/${dossier.session_id}`);
                  }}
                  className="mt-4 text-sm text-blue-600 hover:text-blue-800"
                >
                  Open in Decision Theater →
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


