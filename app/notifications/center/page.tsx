"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Bell, Check, CheckCheck, Trash2, X, ChevronRight } from "lucide-react";

interface Notification { id: string; type: string; title: string; message: string; icon: string; color: string; read: boolean; actionUrl?: string; createdAt: string; }

export default function NotificationsCenterPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => { loadNotifications(); }, []);

  async function loadNotifications() {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications/center");
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } finally { setLoading(false); }
  }

  async function markAsRead(id: string) {
    await fetch("/api/notifications/center", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "mark_read", notificationId: id }) });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  }

  async function markAllAsRead() {
    await fetch("/api/notifications/center", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "mark_all_read" }) });
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }

  function formatTime(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(diff / 3600000);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-zinc-800 rounded-lg"><ArrowLeft className="w-5 h-5" /></Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Bell className="w-7 h-7 text-blue-400" />Notifications
                {unreadCount > 0 && <span className="px-2 py-0.5 bg-red-500 text-xs rounded-full">{unreadCount}</span>}
              </h1>
            </div>
          </div>
          {unreadCount > 0 && <button onClick={markAllAsRead} className="px-3 py-2 bg-zinc-800 rounded-lg text-sm flex items-center gap-2"><CheckCheck className="w-4 h-4" />Mark All Read</button>}
        </div>

        {loading ? <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" /></div> :
         notifications.length === 0 ? <div className="text-center py-12"><Bell className="w-12 h-12 text-zinc-700 mx-auto mb-4" /><p className="text-zinc-500">No notifications</p></div> :
         <div className="space-y-2">
           {notifications.map(n => (
             <div key={n.id} className={`bg-zinc-900/80 rounded-xl border p-4 ${n.read ? "border-zinc-800 opacity-70" : "border-zinc-700"}`}>
               <div className="flex items-start gap-4">
                 <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl" style={{ backgroundColor: `${n.color}20` }}>{n.icon}</div>
                 <div className="flex-1">
                   <div className="flex justify-between"><h3 className="font-medium">{n.title}</h3><span className="text-xs text-zinc-600">{formatTime(n.createdAt)}</span></div>
                   <p className="text-sm text-zinc-500">{n.message}</p>
                   <div className="flex gap-2 mt-2">
                     {n.actionUrl && <Link href={n.actionUrl} className="px-3 py-1 bg-zinc-800 rounded text-xs flex items-center gap-1">View<ChevronRight className="w-3 h-3" /></Link>}
                     {!n.read && <button onClick={() => markAsRead(n.id)} className="px-3 py-1 text-zinc-500 text-xs flex items-center gap-1"><Check className="w-3 h-3" />Mark Read</button>}
                   </div>
                 </div>
                 {!n.read && <div className="w-2 h-2 rounded-full mt-2" style={{ backgroundColor: n.color }} />}
               </div>
             </div>
           ))}
         </div>}
      </div>
    </main>
  );
}
