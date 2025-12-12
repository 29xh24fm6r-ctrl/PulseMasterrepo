// App Card Component with Variants
// app/components/ui/AppCard.tsx

"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AppCardProps {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  variant?: "default" | "quiet" | "interactive" | "metric";
  className?: string;
  onClick?: () => void;
}

export function AppCard({
  title,
  description,
  actions,
  children,
  variant = "default",
  className,
  onClick,
}: AppCardProps) {
  const baseClasses = "p-5 rounded-xl transition-all duration-200";
  
  const variantClasses = {
    default: "bg-zinc-900/50 border border-zinc-800 shadow-sm hover:shadow-md hover:-translate-y-[1px]",
    quiet: "bg-zinc-900/30 border border-zinc-800/50 shadow-sm",
    interactive: "bg-zinc-900/50 border border-zinc-800 shadow-sm hover:shadow-lg hover:border-zinc-700 hover:-translate-y-[1px] cursor-pointer active:scale-[0.99]",
    metric: "bg-zinc-900/50 border border-zinc-800 shadow-sm hover:shadow-md hover:-translate-y-[1px]",
  };

  const Component = onClick ? motion.button : motion.div;

  return (
    <Component
      onClick={onClick}
      className={cn(
        baseClasses,
        variantClasses[variant],
        className
      )}
    >
      {(title || description || actions) && (
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex-1 min-w-0">
            {title && (
              <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
            )}
            {description && (
              <p className="text-sm text-zinc-400">{description}</p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2 flex-shrink-0">
              {actions}
            </div>
          )}
        </div>
      )}
      <div className="text-sm text-zinc-300">{children}</div>
    </Component>
  );
}

// Quiet variant for secondary info
export function AppCardQuiet({
  title,
  description,
  children,
  className,
}: Omit<AppCardProps, "variant" | "actions" | "onClick">) {
  return (
    <AppCard
      title={title}
      description={description}
      variant="quiet"
      className={className}
    >
      {children}
    </AppCard>
  );
}

// Interactive variant for clickable cards
export function AppCardInteractive({
  title,
  description,
  children,
  onClick,
  className,
}: Omit<AppCardProps, "variant" | "actions">) {
  return (
    <AppCard
      title={title}
      description={description}
      variant="interactive"
      onClick={onClick}
      className={className}
    >
      {children}
    </AppCard>
  );
}

// Metric variant for large number displays
export function AppCardMetric({
  title,
  value,
  trend,
  subtitle,
  className,
}: {
  title: string;
  value: string | number;
  trend?: "up" | "down" | "neutral";
  subtitle?: string;
  className?: string;
}) {
  return (
    <AppCard variant="metric" className={className}>
      <div className="text-xs uppercase tracking-wide text-zinc-500 mb-2">{title}</div>
      <div className="text-3xl font-semibold text-white mb-1">{value}</div>
      {subtitle && (
        <div className="text-sm text-zinc-400">{subtitle}</div>
      )}
      {trend && (
        <div className={`text-xs mt-2 ${
          trend === "up" ? "text-emerald-400" :
          trend === "down" ? "text-red-400" :
          "text-zinc-400"
        }`}>
          {trend === "up" && "↑"} {trend === "down" && "↓"}
        </div>
      )}
    </AppCard>
  );
}
