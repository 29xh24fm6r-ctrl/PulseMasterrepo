import React from "react";

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = "Loading..." }: LoadingStateProps) {
  return (
    <div className="flex w-full items-center justify-center py-8">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
