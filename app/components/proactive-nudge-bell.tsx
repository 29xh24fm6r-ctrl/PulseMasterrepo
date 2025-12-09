"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Bell, X, ChevronRight } from 'lucide-react';
import { useProactiveNudges } from '@/app/hooks/use-proactive-nudges';

export function ProactiveNudgeBell() {
  const { insights, highPriorityCount, dismissInsight, refresh, suppressed } = useProactiveNudges({
    pollInterval: 5 * 60 * 1000, // 5 minutes
  });
  
  const [isOpen, setIsOpen] = useState(false);

  if (suppressed) return null;

  const hasInsights = insights.length > 0;

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          relative p-2 rounded-lg transition-colors
          ${hasInsights 
            ? 'bg-violet-500/20 text-violet-400 hover:bg-violet-500/30' 
            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
          }
        `}
      >
        <Bell className="w-5 h-5" />
        {highPriorityCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {highPriorityCount}
          </span>
        )}
        {hasInsights && highPriorityCount === 0 && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full" />
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Panel */}
          <div className="absolute right-0 top-full mt-2 w-80 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl z-50 overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b border-zinc-800">
              <span className="font-medium text-sm">Notifications</span>
              <button
                onClick={() => { refresh(); }}
                className="text-xs text-zinc-500 hover:text-zinc-300"
              >
                Refresh
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {insights.length === 0 ? (
                <div className="p-6 text-center text-zinc-500 text-sm">
                  No notifications
                </div>
              ) : (
                <div className="divide-y divide-zinc-800">
                  {insights.map((insight) => (
                    <div
                      key={insight.id}
                      className={`
                        p-3 hover:bg-zinc-800/50 transition-colors
                        ${insight.priority === 'high' ? 'bg-red-500/5' : ''}
                      `}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-xl">{insight.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="font-medium text-sm">{insight.title}</div>
                            <button
                              onClick={() => dismissInsight(insight.id)}
                              className="p-1 rounded hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                          <p className="text-xs text-zinc-500 mt-0.5">{insight.message}</p>
                          {insight.action && (
                            <Link
                              href={insight.action.href}
                              onClick={() => setIsOpen(false)}
                              className="inline-flex items-center gap-1 mt-2 text-xs text-violet-400 hover:text-violet-300"
                            >
                              {insight.action.label}
                              <ChevronRight className="w-3 h-3" />
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-2 border-t border-zinc-800">
              <Link
                href="/notifications"
                onClick={() => setIsOpen(false)}
                className="block text-center text-xs text-zinc-500 hover:text-zinc-300 py-1"
              >
                View all notifications
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ProactiveNudgeBell;
