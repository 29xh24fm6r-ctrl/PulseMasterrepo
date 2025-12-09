import { NextRequest, NextResponse } from "next/server";

interface Notification {
  id: string; type: string; title: string; message: string; icon: string; color: string;
  read: boolean; actionUrl?: string; actionLabel?: string; createdAt: string;
}

function generateNotifications(): Notification[] {
  const now = new Date();
  return [
    { id: "n1", type: "achievement", title: "🏆 Badge Unlocked!", message: "You earned Week Warrior!", icon: "🏆", color: "#f59e0b", read: false, actionUrl: "/achievements", createdAt: new Date(now.getTime() - 5*60*1000).toISOString() },
    { id: "n2", type: "task_due", title: "Task Due Today", message: "Review Q4 pipeline is due", icon: "⏰", color: "#ef4444", read: false, actionUrl: "/tasks", createdAt: new Date(now.getTime() - 30*60*1000).toISOString() },
    { id: "n3", type: "streak_risk", title: "🔥 Streak at Risk!", message: "Complete a habit to keep your streak", icon: "🔥", color: "#f97316", read: false, actionUrl: "/habits", createdAt: new Date(now.getTime() - 3*60*60*1000).toISOString() },
    { id: "n4", type: "goal_progress", title: "Goal Milestone!", message: "75% complete on Q4 goal", icon: "🎯", color: "#8b5cf6", read: true, actionUrl: "/goals", createdAt: new Date(now.getTime() - 5*60*60*1000).toISOString() },
    { id: "n5", type: "identity", title: "Archetype Ready!", message: "Stoic reached 500+ resonance", icon: "🏛️", color: "#a855f7", read: true, actionUrl: "/identity/dashboard", createdAt: new Date(now.getTime() - 24*60*60*1000).toISOString() },
  ];
}

export async function GET() {
  const notifications = generateNotifications();
  return NextResponse.json({ notifications, unreadCount: notifications.filter(n => !n.read).length, total: notifications.length });
}

export async function POST(request: NextRequest) {
  const { action, notificationId } = await request.json();
  if (action === "mark_read") return NextResponse.json({ message: "Marked as read", notificationId });
  if (action === "mark_all_read") return NextResponse.json({ message: "All marked as read" });
  if (action === "delete") return NextResponse.json({ message: "Deleted", notificationId });
  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
