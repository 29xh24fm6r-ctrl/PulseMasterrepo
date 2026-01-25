"use client";

import React from 'react';
import { Domain } from '../types/nerve-center';

interface LifeVitalSignsProps {
  domains: Domain[];
  score: number;
  level: string;
}

export function LifeVitalSigns({ domains, score, level }: LifeVitalSignsProps) {
  return (
    <section className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wide">
          LIFE VITAL SIGNS
        </h2>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-2xl font-bold text-violet-500">{score}</div>
            <div className="text-xs text-zinc-400 uppercase tracking-wide">{level}</div>
          </div>
          <LifePulseIndicator score={score} />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {domains.map((domain, index) => (
          <DomainHealthBar
            key={domain.id}
            domain={domain}
            index={index}
          />
        ))}
      </div>
    </section>
  );
}

function LifePulseIndicator({ score }: { score: number }) {
  const getPulseColor = () => {
    if (score >= 80) return 'bg-emerald-500';
    if (score >= 60) return 'bg-violet-500';
    if (score >= 40) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <div className="relative w-12 h-12">
      <div className={`absolute inset-0 rounded-full ${getPulseColor()} opacity-20 animate-ping`} />
      <div className={`absolute inset-2 rounded-full ${getPulseColor()} animate-pulse`} />
      <div className={`absolute inset-4 rounded-full ${getPulseColor()}`} />
    </div>
  );
}

function DomainHealthBar({ domain, index }: { domain: Domain; index: number }) {
  const getStatusColor = () => {
    if (domain.status === 'thriving') return 'bg-emerald-500';
    if (domain.status === 'active') return 'bg-violet-500';
    return 'bg-amber-500';
  };

  const getStatusGlow = () => {
    if (domain.status === 'thriving') return 'shadow-emerald-500/20';
    if (domain.status === 'active') return 'shadow-violet-500/20';
    return 'shadow-amber-500/20';
  };

  return (
    <div
      className="space-y-2 animate-slide-up"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-center gap-2">
        <span className="text-2xl transform transition-transform hover:scale-110">
          {domain.icon}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-zinc-400 truncate">{domain.label}</div>
          <div className="text-lg font-bold tabular-nums">{domain.health}</div>
        </div>
      </div>

      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-1000 ease-out ${getStatusColor()} ${getStatusGlow()} shadow-lg`}
          style={{
            width: `${domain.health}%`,
            transitionDelay: `${index * 100}ms`
          }}
        />
      </div>

      <div className="text-xs text-zinc-500 truncate">
        <span className="font-semibold text-zinc-400">{domain.metric}</span>
        <span className="text-zinc-600 ml-1">{domain.metricLabel}</span>
      </div>

      {domain.activeThreads > 0 && (
        <div className="flex items-center gap-1 text-xs text-zinc-500">
          <div className="w-1 h-1 rounded-full bg-violet-500 animate-pulse" />
          <span>{domain.activeThreads} active</span>
        </div>
      )}
    </div>
  );
}
