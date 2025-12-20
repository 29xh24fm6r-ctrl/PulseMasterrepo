// src/lib/ui/pulseCopy.ts

export function getTimeGreeting(now = new Date()) {
  const h = now.getHours();
  if (h < 5) return "Late night clarity";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 22) return "Good evening";
  return "Night mode";
}

export function getPulseThinkingLine() {
  // Keep it subtle, never cheesy
  const options = [
    "Calibrating your day…",
    "Reading signals…",
    "Connecting the dots…",
    "Synthesizing momentum…",
    "Scanning open loops…",
  ];
  return options[Math.floor(Math.random() * options.length)];
}

