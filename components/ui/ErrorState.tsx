import React from "react";

interface ErrorStateProps {
  title?: string;
  message?: string;
}

export function ErrorState({
  title = "Something went wrong",
  message = "Please try again or check back in a moment.",
}: ErrorStateProps) {
  return (
    <div className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-6 text-center">
      <p className="text-sm font-semibold text-destructive">{title}</p>
      <p className="text-xs text-muted-foreground max-w-md">{message}</p>
    </div>
  );
}
