"use client";

import React from "react";
import Link from "next/link";
import { Rocket, Handshake, MessageSquare, Leaf, Moon } from "lucide-react";
import { useAutonomy, AutonomyLevel } from "@/lib/use-autonomy";

const LEVEL_CONFIG: Record<AutonomyLevel, {
  icon: React.ReactNode;
  label: string;
  color: string;
  bgColor: string;
}> = {
  jarvis: {
    icon: <Rocket className="w-3.5 h-3.5" />,
    label: "Jarvis",
    color: "text-purple-400",
    bgColor: "bg-purple-500/20",
  },
  copilot: {
    icon: <Handshake className="w-3.5 h-3.5" />,
    label: "Co-Pilot",
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/20",
  },
  advisor: {
    icon: <MessageSquare className="w-3.5 h-3.5" />,
    label: "Advisor",
    color: "text-amber-400",
    bgColor: "bg-amber-500/20",
  },
  zen: {
    icon: <Leaf className="w-3.5 h-3.5" />,
    label: "Zen",
    color: "text-green-400",
    bgColor: "bg-green-500/20",
  },
};

interface AutonomyIndicatorProps {
  showLabel?: boolean;
  size?: "sm" | "md";
  clickable?: boolean;
}

export function AutonomyIndicator({ 
  showLabel = true, 
  size = "sm",
  clickable = true 
}: AutonomyIndicatorProps) {
  const { settings, isInQuietHours } = useAutonomy();
  const config = LEVEL_CONFIG[settings.globalLevel];
  const inQuietHours = isInQuietHours();

  const content = (
    <div className={`flex items-center gap-1.5 ${clickable ? "cursor-pointer hover:opacity-80" : ""}`}>
      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg ${config.bgColor} ${config.color}`}>
        {config.icon}
        {showLabel && (
          <span className={`font-medium ${size === "sm" ? "text-xs" : "text-sm"}`}>
            {config.label}
          </span>
        )}
      </div>
      {inQuietHours && (
        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-700/50 text-slate-400">
          <Moon className="w-3 h-3" />
          {showLabel && <span className={`${size === "sm" ? "text-xs" : "text-sm"}`}>Quiet</span>}
        </div>
      )}
    </div>
  );

  if (clickable) {
    return (
      <Link href="/settings/autonomy" title="Autonomy Settings">
        {content}
      </Link>
    );
  }

  return content;
}

// Compact version for tight spaces
export function AutonomyBadge() {
  const { settings } = useAutonomy();
  const config = LEVEL_CONFIG[settings.globalLevel];

  return (
    <Link 
      href="/settings/autonomy"
      className={`flex items-center justify-center w-8 h-8 rounded-lg ${config.bgColor} ${config.color} hover:opacity-80 transition-opacity`}
      title={`${config.label} Mode - Click to change`}
    >
      {config.icon}
    </Link>
  );
}
