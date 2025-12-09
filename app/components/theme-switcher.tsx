"use client";
import React, { useState, useEffect } from "react";
import { Sun, Moon, Monitor, Palette } from "lucide-react";

type Theme = "dark" | "light" | "system" | "midnight" | "forest" | "ocean";

const THEMES: { id: Theme; label: string; icon: any; colors: { bg: string; accent: string } }[] = [
  { id: "dark", label: "Dark", icon: Moon, colors: { bg: "#09090b", accent: "#8b5cf6" } },
  { id: "light", label: "Light", icon: Sun, colors: { bg: "#ffffff", accent: "#7c3aed" } },
  { id: "system", label: "System", icon: Monitor, colors: { bg: "#18181b", accent: "#a78bfa" } },
  { id: "midnight", label: "Midnight", icon: Palette, colors: { bg: "#0f0f23", accent: "#6366f1" } },
  { id: "forest", label: "Forest", icon: Palette, colors: { bg: "#0a1f0a", accent: "#22c55e" } },
  { id: "ocean", label: "Ocean", icon: Palette, colors: { bg: "#0a192f", accent: "#06b6d4" } },
];

export function ThemeSwitcher() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("pulse_theme") as Theme;
    if (saved) setTheme(saved);
  }, []);

  function selectTheme(t: Theme) {
    setTheme(t);
    localStorage.setItem("pulse_theme", t);
    document.documentElement.setAttribute("data-theme", t);
    setIsOpen(false);
  }

  const current = THEMES.find((t) => t.id === theme) || THEMES[0];
  const Icon = current.icon;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-zinc-800 rounded-lg transition-colors flex items-center gap-2"
      >
        <Icon className="w-5 h-5" style={{ color: current.colors.accent }} />
        <span className="text-sm hidden sm:inline">{current.label}</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 bg-zinc-900 border border-zinc-700 rounded-xl p-2 shadow-xl min-w-[180px]">
            <div className="text-xs text-zinc-500 px-2 py-1 mb-1">Theme</div>
            {THEMES.map((t) => {
              const TIcon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => selectTheme(t.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    theme === t.id ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                  }`}
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: t.colors.bg, border: `2px solid ${t.colors.accent}` }}
                  >
                    <TIcon className="w-3 h-3" style={{ color: t.colors.accent }} />
                  </div>
                  <span>{t.label}</span>
                  {theme === t.id && <span className="ml-auto text-xs">✓</span>}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default ThemeSwitcher;
