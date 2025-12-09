// Auto-Scan Scheduler for Pulse AI
// Tracks last scan time and determines if auto-scan is needed

const STORAGE_KEY = "pulse_ai_last_scan";
const SCAN_INTERVAL_HOURS = 4; // Auto-scan if it's been this many hours
const BACKGROUND_INTERVAL_MINUTES = 30; // Background scan interval

export type ScanStatus = {
  lastScan: Date | null;
  hoursSinceLastScan: number;
  needsScan: boolean;
  nextScheduledScan: Date | null;
};

export function getLastScanTime(): Date | null {
  if (typeof window === "undefined") return null;
  
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  
  try {
    const data = JSON.parse(stored);
    return new Date(data.timestamp);
  } catch {
    return null;
  }
}

export function setLastScanTime(results?: { actionsCreated: number; contactsCreated: number }): void {
  if (typeof window === "undefined") return;
  
  const data = {
    timestamp: new Date().toISOString(),
    results: results || null,
  };
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getLastScanResults(): { actionsCreated: number; contactsCreated: number } | null {
  if (typeof window === "undefined") return null;
  
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  
  try {
    const data = JSON.parse(stored);
    return data.results || null;
  } catch {
    return null;
  }
}

export function getScanStatus(): ScanStatus {
  const lastScan = getLastScanTime();
  const now = new Date();
  
  let hoursSinceLastScan = Infinity;
  let needsScan = true;
  let nextScheduledScan: Date | null = null;
  
  if (lastScan) {
    hoursSinceLastScan = (now.getTime() - lastScan.getTime()) / (1000 * 60 * 60);
    needsScan = hoursSinceLastScan >= SCAN_INTERVAL_HOURS;
    
    if (!needsScan) {
      nextScheduledScan = new Date(lastScan.getTime() + SCAN_INTERVAL_HOURS * 60 * 60 * 1000);
    }
  }
  
  return {
    lastScan,
    hoursSinceLastScan: Math.round(hoursSinceLastScan * 10) / 10,
    needsScan,
    nextScheduledScan,
  };
}

export function formatTimeSince(date: Date | null): string {
  if (!date) return "Never";
  
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export function formatTimeUntil(date: Date | null): string {
  if (!date) return "Now";
  
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  
  if (diffMs <= 0) return "Now";
  
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  
  if (diffMins < 60) return `in ${diffMins}m`;
  return `in ${diffHours}h ${diffMins % 60}m`;
}

export const SCAN_CONFIG = {
  intervalHours: SCAN_INTERVAL_HOURS,
  backgroundIntervalMinutes: BACKGROUND_INTERVAL_MINUTES,
};