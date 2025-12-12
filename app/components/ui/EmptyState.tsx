// Empty State Component
// app/components/ui/EmptyState.tsx

import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-8 space-y-3 text-center ${className || ""}`}>
      {Icon && <Icon className="w-12 h-12 text-zinc-500 mb-2" />}
      <h3 className="text-sm font-medium text-zinc-300">{title}</h3>
      {description && <p className="text-xs text-zinc-500 max-w-sm">{description}</p>}
      {action && (
        <Button size="sm" variant="outline" onClick={action.onClick} className="mt-2">
          {action.label}
        </Button>
      )}
    </div>
  );
}




