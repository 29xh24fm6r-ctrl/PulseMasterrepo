// src/components/today/TodayDashboard.tsx
"use client";

import { useEffect, useState } from "react";
import { Calendar, CheckSquare, User, Handshake, Target, BookOpen, Plus } from "lucide-react";
import Link from "next/link";

type Task = { id: string; title: string; status: string; due_date: string | null };
type Contact = { id: string; full_name: string; created_at: string };
type Deal = { id: string; name: string; stage: string; amount: number | null };
type Habit = { id: string; name: string; frequency: string };
type JournalEntry = { id: string; title: string | null; content: string; entry_date: string };

export default function TodayDashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      // Load tasks due today/overdue
      const today = new Date().toISOString().split("T")[0];
      const tasksRes = await fetch("/api/tasks?status=pending");
      const tasksData = await tasksRes.json();
      const allTasks = (tasksData.tasks || []).filter((t: Task) => {
        if (!t.due_date) return false;
        return t.due_date <= today;
      });
      setTasks(allTasks.slice(0, 5));

      // Load recent contacts
      const contactsRes = await fetch("/api/contacts");
      const contactsData = await contactsRes.json();
      setContacts((contactsData.items || contactsData.contacts || []).slice(0, 5));

      // Load active deals
      const dealsRes = await fetch("/api/deals");
      const dealsData = await dealsRes.json();
      setDeals((dealsData.items || dealsData.deals || []).slice(0, 5));

      // Load active habits
      const habitsRes = await fetch("/api/habits?active=true");
      const habitsData = await habitsRes.json();
      setHabits((habitsData.items || []).slice(0, 5));
    } catch (e) {
      console.error("Failed to load today data:", e);
    } finally {
      setLoading(false);
    }
  }

  const today = new Date();
  const dayName = today.toLocaleDateString("en-US", { weekday: "long" });
  const dateStr = today.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const overdueTasks = tasks.filter((t) => t.due_date && t.due_date < today.toISOString().split("T")[0]);
  const dueTodayTasks = tasks.filter((t) => t.due_date === today.toISOString().split("T")[0]);

  return (
    <div className="space-y-6 p-6">
      <div className="rounded-2xl border p-5 bg-background shadow-sm">
        <div className="flex items-center gap-3">
          <Calendar className="w-6 h-6" />
          <div>
            <div className="text-xl font-semibold">Today</div>
            <div className="text-sm text-muted-foreground">
              {dayName}, {dateStr}
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tasks */}
          <div className="rounded-2xl border p-5 bg-background shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5" />
                <h3 className="font-semibold">Tasks</h3>
              </div>
              <Link href="/tasks" className="text-sm text-muted-foreground hover:text-foreground">
                View all
              </Link>
            </div>

            {overdueTasks.length > 0 && (
              <div className="mb-4">
                <div className="text-xs font-semibold text-red-600 mb-2">OVERDUE</div>
                <div className="space-y-2">
                  {overdueTasks.map((t) => (
                    <div key={t.id} className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      <span className="line-through text-muted-foreground">{t.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {dueTodayTasks.length > 0 && (
              <div className="mb-4">
                <div className="text-xs font-semibold text-orange-600 mb-2">DUE TODAY</div>
                <div className="space-y-2">
                  {dueTodayTasks.map((t) => (
                    <div key={t.id} className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 rounded-full bg-orange-500" />
                      <span>{t.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tasks.length === 0 && (
              <div className="text-sm text-muted-foreground py-4">No tasks due today</div>
            )}

            <Link
              href="/create"
              className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <Plus className="w-4 h-4" />
              Add task
            </Link>
          </div>

          {/* Recent Contacts */}
          <div className="rounded-2xl border p-5 bg-background shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5" />
                <h3 className="font-semibold">Recent Contacts</h3>
              </div>
              <Link href="/contacts" className="text-sm text-muted-foreground hover:text-foreground">
                View all
              </Link>
            </div>

            {contacts.length > 0 ? (
              <div className="space-y-2">
                {contacts.map((c) => (
                  <div key={c.id} className="text-sm">
                    {c.full_name || "Unnamed"}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground py-4">No contacts yet</div>
            )}

            <Link
              href="/create"
              className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <Plus className="w-4 h-4" />
              Add contact
            </Link>
          </div>

          {/* Active Deals */}
          {deals.length > 0 && (
            <div className="rounded-2xl border p-5 bg-background shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Handshake className="w-5 h-5" />
                  <h3 className="font-semibold">Active Deals</h3>
                </div>
                <Link href="/deals" className="text-sm text-muted-foreground hover:text-foreground">
                  View all
                </Link>
              </div>

              <div className="space-y-3">
                {deals.map((d) => (
                  <div key={d.id} className="text-sm">
                    <div className="font-medium">{d.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {d.stage} {d.amount ? `· $${d.amount.toLocaleString()}` : ""}
                    </div>
                  </div>
                ))}
              </div>

              <Link
                href="/create"
                className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              >
                <Plus className="w-4 h-4" />
                Add deal
              </Link>
            </div>
          )}

          {/* Habits */}
          {habits.length > 0 && (
            <div className="rounded-2xl border p-5 bg-background shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  <h3 className="font-semibold">Habits</h3>
                </div>
                <Link href="/habits" className="text-sm text-muted-foreground hover:text-foreground">
                  View all
                </Link>
              </div>

              <div className="space-y-2">
                {habits.map((h) => (
                  <div key={h.id} className="text-sm">
                    {h.name} <span className="text-xs text-muted-foreground">({h.frequency})</span>
                  </div>
                ))}
              </div>

              <Link
                href="/create"
                className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              >
                <Plus className="w-4 h-4" />
                Add habit
              </Link>
            </div>
          )}

          {/* Journal Prompt */}
          <div className="rounded-2xl border p-5 bg-background shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-5 h-5" />
              <h3 className="font-semibold">Journal</h3>
            </div>

            <div className="text-sm text-muted-foreground mb-4">
              What's one thing you're grateful for today?
            </div>

            <Link
              href="/create"
              className="inline-flex items-center gap-2 text-sm rounded-xl border px-4 py-2 hover:bg-muted"
            >
              <Plus className="w-4 h-4" />
              Write entry
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

