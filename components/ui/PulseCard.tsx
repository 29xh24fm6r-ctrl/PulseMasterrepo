import React from "react";

type Props = {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "hero" | "quiet";
};

/**
 * PulseCard
 * - Consistent surface contrast
 * - Makes black-on-black readable and "important"
 * - No dependency on existing UI kit
 */
export default function PulseCard({ children, className = "", variant = "default" }: Props) {
  const base =
    "rounded-2xl border backdrop-blur-md shadow-[0_18px_60px_rgba(0,0,0,0.55)]";

  const variants: Record<string, string> = {
    default:
      "border-white/10 bg-white/[0.06] hover:bg-white/[0.075] transition-colors",
    hero:
      "border-white/14 bg-white/[0.075] shadow-[0_25px_90px_rgba(0,0,0,0.65)]",
    quiet: "border-white/8 bg-white/[0.045]",
  };

  return <div className={`${base} ${variants[variant]} ${className}`}>{children}</div>;
}

