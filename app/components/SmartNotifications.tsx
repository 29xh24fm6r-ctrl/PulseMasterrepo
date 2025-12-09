"use client";

import React, { useState, useEffect, useCallback } from "react";

type Notification = {
  id: string;
  type: "overdue" | "due_today" | "high_priority" | "follow_up";
  title: string;
  message: string;
  priority: "urgent" | "high" | "normal";
  source: "tasks" | "follow-ups";
  dueDate?: string;
};

type NotificationStats = {
  total: number;
  urgent: number;
  high: number;
  overdue: number;
  dueToday: number;
};

type Props = {
  checkInterval?: number; // in minutes, default 5
  showToasts?: boolean;
  onNotification?: (notification: Notification) => void;
};

export default function SmartNotifications({ 
  checkInterval = 5, 
  showToasts = true,
  onNotification 
}: Props) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // Request notification permission
  useEffect(() => {
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if ("Notification" in window) {
      const perm = await Notification.requestPermission();
      setPermission(perm);
    }
  };

  // Check for notifications
  const checkNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      
      const data = await res.json();
      
      if (data.ok) {
        const newNotifications = data.notifications.filter(
          (n: Notification) => !dismissed.has(n.id)
        );
        
        setNotifications(newNotifications);
        setStats(data.stats);
        setLastChecked(new Date());

        // Show browser notifications for urgent items
        if (showToasts && permission === "granted") {
          const urgentNew = newNotifications.filter(
            (n: Notification) => n.priority === "urgent"
          );
          
          for (const n of urgentNew.slice(0, 3)) {
            showBrowserNotification(n);
            onNotification?.(n);
          }
        }
      }
    } catch (err) {
      console.error("Failed to check notifications:", err);
    }
  }, [dismissed, permission, showToasts, onNotification]);

  // Initial check and interval
  useEffect(() => {
    checkNotifications();
    
    const interval = setInterval(checkNotifications, checkInterval * 60 * 1000);
    return () => clearInterval(interval);
  }, [checkNotifications, checkInterval]);

  // Show browser notification
  const showBrowserNotification = (notification: Notification) => {
    if ("Notification" in window && permission === "granted") {
      const n = new Notification(notification.title, {
        body: notification.message,
        icon: "/favicon.ico",
        tag: notification.id, // Prevents duplicate notifications
        requireInteraction: notification.priority === "urgent",
      });

      n.onclick = () => {
        window.focus();
        setIsOpen(true);
        n.close();
      };
    }
  };

  // Dismiss a notification
  const dismissNotification = (id: string) => {
    setDismissed((prev) => new Set([...prev, id]));
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  // Dismiss all
  const dismissAll = () => {
    const ids = notifications.map((n) => n.id);
    setDismissed((prev) => new Set([...prev, ...ids]));
    setNotifications([]);
  };

  const urgentCount = stats?.urgent || 0;
  const totalCount = notifications.length;

  return (
    <>
      {/* Notification Bell Button */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`relative p-2 rounded-xl transition-all ${
            urgentCount > 0
              ? "bg-red-900/30 border border-red-500/30 text-red-400 animate-pulse"
              : totalCount > 0
              ? "bg-yellow-900/30 border border-yellow-500/30 text-yellow-400"
              : "bg-slate-800 text-slate-400 hover:bg-slate-700"
          }`}
        >
          <span className="text-xl">🔔</span>
          
          {totalCount > 0 && (
            <span className={`absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center ${
              urgentCount > 0 ? "bg-red-500 text-white" : "bg-yellow-500 text-black"
            }`}>
              {totalCount > 9 ? "9+" : totalCount}
            </span>
          )}
        </button>

        {/* Dropdown Panel */}
        {isOpen && (
          <div className="absolute right-0 top-12 w-80 md:w-96 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 max-h-[70vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">🔔 Notifications</h3>
                <p className="text-xs text-slate-400">
                  {lastChecked ? `Checked ${lastChecked.toLocaleTimeString()}` : "Loading..."}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={checkNotifications}
                  className="p-1 text-slate-400 hover:text-white text-sm"
                  title="Refresh"
                >
                  🔄
                </button>
                {totalCount > 0 && (
                  <button
                    onClick={dismissAll}
                    className="p-1 text-slate-400 hover:text-white text-sm"
                    title="Dismiss all"
                  >
                    ✓ Clear
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Permission Banner */}
            {permission === "default" && (
              <div className="p-3 bg-blue-900/30 border-b border-blue-500/30">
                <p className="text-xs text-blue-300 mb-2">
                  Enable browser notifications to get alerts even when this tab isn't focused.
                </p>
                <button
                  onClick={requestPermission}
                  className="px-3 py-1 bg-blue-500 text-white text-xs rounded-lg hover:bg-blue-400"
                >
                  Enable Notifications
                </button>
              </div>
            )}

            {permission === "denied" && (
              <div className="p-3 bg-red-900/30 border-b border-red-500/30">
                <p className="text-xs text-red-300">
                  Browser notifications are blocked. Enable them in your browser settings.
                </p>
              </div>
            )}

            {/* Stats Bar */}
            {stats && stats.total > 0 && (
              <div className="p-2 bg-slate-800/50 border-b border-slate-700 flex gap-2 text-xs">
                {stats.overdue > 0 && (
                  <span className="px-2 py-1 bg-red-900/50 text-red-300 rounded">
                    ⚠️ {stats.overdue} overdue
                  </span>
                )}
                {stats.dueToday > 0 && (
                  <span className="px-2 py-1 bg-yellow-900/50 text-yellow-300 rounded">
                    📅 {stats.dueToday} today
                  </span>
                )}
              </div>
            )}

            {/* Notification List */}
            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <div className="text-4xl mb-2">✨</div>
                  <p>All caught up!</p>
                  <p className="text-xs mt-1">No pending notifications</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-800">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-3 hover:bg-slate-800/50 transition-colors ${
                        n.priority === "urgent" ? "bg-red-900/10" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {n.title}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            {n.message}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                              n.source === "tasks" 
                                ? "bg-blue-900/50 text-blue-300" 
                                : "bg-purple-900/50 text-purple-300"
                            }`}>
                              {n.source === "tasks" ? "📋 Task" : "⚡ Follow-up"}
                            </span>
                            {n.dueDate && (
                              <span className="text-[10px] text-slate-500">
                                Due: {new Date(n.dueDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => dismissNotification(n.id)}
                          className="p-1 text-slate-500 hover:text-slate-300 text-xs"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-2 border-t border-slate-700 bg-slate-800/50">
              <div className="flex gap-2 text-xs">
                <a
                  href="/follow-ups"
                  className="flex-1 text-center py-2 bg-slate-700 rounded-lg hover:bg-slate-600"
                >
                  ⚡ Follow-Ups
                </a>
                <button
                  onClick={checkNotifications}
                  className="flex-1 text-center py-2 bg-slate-700 rounded-lg hover:bg-slate-600"
                >
                  🔄 Refresh
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
