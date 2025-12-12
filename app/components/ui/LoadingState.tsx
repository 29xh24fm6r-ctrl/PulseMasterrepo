// Loading State Component
// app/components/ui/LoadingState.tsx

import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({ message = "Pulling in your data…", className }: LoadingStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-8 space-y-3 ${className || ""}`}>
      <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
      <p className="text-sm text-zinc-400">{message}</p>
    </div>
  );
}




