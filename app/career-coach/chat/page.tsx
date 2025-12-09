"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface JobModel {
  fullTitle?: string;
  roleName?: string;
  seniorityName?: string;
  industryName?: string;
  functionName?: string;
  company?: string;
  coreSkills?: string[];
  typicalOutcomes?: string[];
  dailyActivities?: string[];
  deepDiveInsights?: any;
}

const STARTER_PROMPTS = [
  { icon: '🎯', text: 'How can I stand out for promotion?' },
  { icon: '💬', text: 'Help me prepare for a difficult conversation' },
  { icon: '📈', text: 'What skills should I focus on?' },
  { icon: '🤔', text: 'How do I handle imposter syndrome?' },
];

export default function CareerChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [jobModel, setJobModel] = useState<JobModel | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadJobModel();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadJobModel() {
    try {
      const res = await fetch('/api/career/job-model');
      const data = await res.json();
      if (data.ok && data.jobModel) {
        setJobModel(data.jobModel);
      }
    } catch (error) {
      console.error('Failed to load job model:', error);
    } finally {
      setInitialLoading(false);
    }
  }

  async function sendMessage(content?: string) {
    const messageContent = content || input.trim();
    if (!messageContent || loading) return;

    const userMessage: Message = { role: 'user', content: messageContent };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/career/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          jobModel,
        }),
      });

      const data = await res.json();
      if (data.ok && data.response) {
        setMessages([...newMessages, { role: 'assistant', content: data.response }]);
        
        // Track question asked
        fetch('/api/career/stats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'question' }),
        }).catch(() => {}); // Fire and forget
      } else {
        setMessages([...newMessages, { 
          role: 'assistant', 
          content: 'Sorry, I had trouble processing that. Please try again.' 
        }]);
      }
    } catch (error) {
      setMessages([...newMessages, { 
        role: 'assistant', 
        content: 'Sorry, something went wrong. Please try again.' 
      }]);
    } finally {
      setLoading(false);
    }
  }

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-violet-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link 
            href="/career-coach"
            className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-white">💬 AI Coach</h1>
            {jobModel?.fullTitle && (
              <p className="text-xs text-zinc-500">Coaching for {jobModel.fullTitle}</p>
            )}
          </div>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-6 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">💬</div>
            <h2 className="text-xl font-semibold text-white mb-2">What's on your mind?</h2>
            <p className="text-zinc-400 mb-8">
              Ask me anything about your career - I know your role and context.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto">
              {STARTER_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(prompt.text)}
                  className="p-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-violet-500/50 rounded-xl text-left transition-all group"
                >
                  <span className="text-xl mr-2">{prompt.icon}</span>
                  <span className="text-sm text-zinc-300 group-hover:text-white">{prompt.text}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, i) => (
              <div
                key={i}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-violet-600 text-white'
                      : 'bg-zinc-800 text-zinc-100'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex justify-start">
                <div className="bg-zinc-800 rounded-2xl px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" />
                    <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </main>

      {/* Input */}
      <div className="border-t border-zinc-800 bg-zinc-900/50 backdrop-blur-sm p-4">
        <div className="max-w-3xl mx-auto flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Ask your career coach..."
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500"
            disabled={loading}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="px-4 py-3 bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
