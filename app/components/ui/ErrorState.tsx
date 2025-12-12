// Error State Component
// app/components/ui/ErrorState.tsx

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({ 
  message = "Something went off track", 
  onRetry, 
  className 
}: ErrorStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-8 space-y-3 text-center ${className || ""}`}>
      <AlertCircle className="w-12 h-12 text-red-400 mb-2" />
      <p className="text-sm text-zinc-400">{message}</p>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry} className="mt-2">
          Try Again
        </Button>
      )}
    </div>
  );
}




