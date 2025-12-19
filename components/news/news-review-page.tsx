"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Suggestion {
  id: string;
  contact: {
    id: string;
    name: string;
    company: string | null;
    email: string | null;
  };
  article: {
    url: string;
    title: string;
    source: string | null;
    published_at: string;
    summary: string | null;
    key_points: string[] | null;
  } | null;
  recommendation: {
    score: number;
    reason: string;
  };
  draft: {
    id: string;
    subject: string;
    body: string;
    status: string;
  } | null;
}

export default function NewsReviewPage() {
  const router = useRouter();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    loadSuggestions();
  }, []);

  async function loadSuggestions() {
    try {
      const res = await fetch("/api/news/suggestions", { cache: "no-store" });
      const data = await res.json();
      if (data.ok) {
        setSuggestions(data.suggestions || []);
      }
    } catch (err) {
      console.error("Failed to load suggestions:", err);
    } finally {
      setLoading(false);
    }
  }

  async function runEngine() {
    setRunning(true);
    try {
      const res = await fetch("/api/news/run", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        alert(`Engine run complete: ${data.report.recommendationsCreated} new recommendations`);
        loadSuggestions();
      }
    } catch (err) {
      console.error("Failed to run engine:", err);
      alert("Failed to run news engine");
    } finally {
      setRunning(false);
    }
  }

  async function approveDraft(draftId: string, subject?: string, body?: string) {
    try {
      const res = await fetch(`/api/news/drafts/${draftId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body }),
      });
      const data = await res.json();
      if (data.ok) {
        loadSuggestions();
      }
    } catch (err) {
      console.error("Failed to approve draft:", err);
    }
  }

  async function markSent(draftId: string) {
    try {
      const res = await fetch(`/api/news/drafts/${draftId}/sent`, { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        loadSuggestions();
      }
    } catch (err) {
      console.error("Failed to mark as sent:", err);
    }
  }

  async function dismissRecommendation(recId: string) {
    try {
      const res = await fetch(`/api/news/recommendations/${recId}/dismiss`, { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        loadSuggestions();
      }
    } catch (err) {
      console.error("Failed to dismiss:", err);
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-lg">Loading news suggestions...</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">News Intelligence</h1>
          <p className="text-gray-600 mt-1">
            Personalized article recommendations for your business contacts
          </p>
        </div>
        <button
          onClick={runEngine}
          disabled={running}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {running ? "Running..." : "Run News Engine"}
        </button>
      </div>

      {suggestions.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No suggestions yet. Run the news engine to find relevant articles.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {suggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              className="border rounded-lg p-6 bg-white shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold">{suggestion.contact.name}</h3>
                  {suggestion.contact.company && (
                    <p className="text-sm text-gray-600">{suggestion.contact.company}</p>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">Score: {suggestion.recommendation.score}</div>
                  <div className="text-xs text-gray-400">{suggestion.recommendation.reason}</div>
                </div>
              </div>

              {suggestion.article && (
                <div className="mb-4">
                  <a
                    href={suggestion.article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline font-medium"
                  >
                    {suggestion.article.title}
                  </a>
                  <div className="text-sm text-gray-500 mt-1">
                    {suggestion.article.source} • {new Date(suggestion.article.published_at).toLocaleDateString()}
                  </div>
                  {suggestion.article.summary && (
                    <p className="text-sm text-gray-700 mt-2">{suggestion.article.summary}</p>
                  )}
                  {suggestion.article.key_points && suggestion.article.key_points.length > 0 && (
                    <ul className="text-sm text-gray-600 mt-2 list-disc list-inside">
                      {suggestion.article.key_points.slice(0, 3).map((point, i) => (
                        <li key={i}>{point}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {suggestion.draft && (
                <div className="border-t pt-4 mt-4">
                  <div className="text-sm font-medium mb-2">Email Draft:</div>
                  <div className="bg-gray-50 p-3 rounded text-sm">
                    <div className="font-semibold mb-1">{suggestion.draft.subject}</div>
                    <div className="text-gray-700 whitespace-pre-wrap">{suggestion.draft.body}</div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => approveDraft(suggestion.draft!.id)}
                      className="px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => markSent(suggestion.draft!.id)}
                      className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                    >
                      Mark Sent
                    </button>
                    <button
                      onClick={() => dismissRecommendation(suggestion.id)}
                      className="px-3 py-1.5 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

