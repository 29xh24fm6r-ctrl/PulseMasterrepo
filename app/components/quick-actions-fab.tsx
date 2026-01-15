"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Plus,
  X,
  CheckSquare,
  Users,
  Briefcase,
  Sparkles,
  BookOpen,
  Mic,
  Send,
} from "lucide-react";

type ActionType = "task" | "contact" | "deal" | "journal" | "identity" | null;

interface QuickTaskForm {
  name: string;
  priority: "High" | "Medium" | "Low";
  dueDate: string;
}

interface QuickContactForm {
  name: string;
  company: string;
  email: string;
  notes: string;
}

interface QuickDealForm {
  name: string;
  company: string;
  value: string;
  stage: string;
}

export function QuickActionsFAB() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<ActionType>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Forms
  const [taskForm, setTaskForm] = useState<QuickTaskForm>({
    name: "",
    priority: "Medium",
    dueDate: "",
  });
  const [contactForm, setContactForm] = useState<QuickContactForm>({
    name: "",
    company: "",
    email: "",
    notes: "",
  });
  const [dealForm, setDealForm] = useState<QuickDealForm>({
    name: "",
    company: "",
    value: "",
    stage: "Lead",
  });

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard shortcut (Ctrl/Cmd + K)
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (event.key === "Escape") {
        setIsOpen(false);
        setActiveModal(null);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  function openModal(type: ActionType) {
    setActiveModal(type);
    setIsOpen(false);
    setSuccess(false);
  }

  function closeModal() {
    setActiveModal(null);
    setSuccess(false);
    // Reset forms
    setTaskForm({ name: "", priority: "Medium", dueDate: "" });
    setContactForm({ name: "", company: "", email: "", notes: "" });
    setDealForm({ name: "", company: "", value: "", stage: "Lead" });
  }

  async function handleSaveTask() {
    if (!taskForm.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/tasks/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: taskForm.name,
          priority: taskForm.priority,
          dueDate: taskForm.dueDate || null,
          status: "Not Started",
        }),
      });
      if (res.ok) {
        setSuccess(true);
        setTimeout(closeModal, 1000);
      }
    } catch (err) {
      console.error("Failed to create task:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveContact() {
    if (!contactForm.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/second-brain/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: contactForm.name,
          company: contactForm.company,
          email: contactForm.email,
          notes: contactForm.notes,
        }),
      });
      if (res.ok) {
        setSuccess(true);
        setTimeout(closeModal, 1000);
      }
    } catch (err) {
      console.error("Failed to create contact:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveDeal() {
    if (!dealForm.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/deals/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: dealForm.name,
          company: dealForm.company,
          value: parseFloat(dealForm.value) || 0,
          stage: dealForm.stage,
        }),
      });
      if (res.ok) {
        setSuccess(true);
        setTimeout(closeModal, 1000);
      }
    } catch (err) {
      console.error("Failed to create deal:", err);
    } finally {
      setSaving(false);
    }
  }

  const actions = [
    { type: "task" as const, icon: CheckSquare, label: "Add Task", color: "from-blue-500 to-cyan-500", shortcut: "T" },
    { type: "contact" as const, icon: Users, label: "Add Contact", color: "from-pink-500 to-rose-500", shortcut: "C" },
    { type: "deal" as const, icon: Briefcase, label: "Add Deal", color: "from-green-500 to-emerald-500", shortcut: "D" },
    { type: "journal" as const, icon: BookOpen, label: "Journal", color: "from-violet-500 to-purple-500", shortcut: "J", href: "/journal" },
    { type: "identity" as const, icon: Sparkles, label: "Track Identity", color: "from-amber-500 to-orange-500", shortcut: "I", href: "/bridge" },
  ];

  return (
    <>
      {/* FAB Container */}
      <div ref={menuRef} className="fixed bottom-6 right-6 z-50">
        {/* Action Menu */}
        {isOpen && (
          <div className="absolute bottom-16 right-0 flex flex-col gap-2 mb-2">
            {actions.map((action, index) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.type}
                  onClick={() => {
                    if (action.href) {
                      window.location.href = action.href;
                    } else {
                      openModal(action.type);
                    }
                  }}
                  className={`
                    flex items-center gap-3 px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl
                    hover:border-zinc-600 hover:bg-zinc-800 transition-all shadow-lg
                    animate-in slide-in-from-bottom-2 fade-in
                  `}
                  style={{ animationDelay: `${index * 50}ms`, animationFillMode: "both" }}
                >
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-medium text-zinc-200 whitespace-nowrap">{action.label}</span>
                  <span className="text-xs text-zinc-500 ml-auto">{action.shortcut}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Main FAB Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`
            w-14 h-14 rounded-full flex items-center justify-center shadow-lg
            transition-all duration-300 ease-out
            ${isOpen
              ? "bg-zinc-800 rotate-45"
              : "bg-gradient-to-br from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500"
            }
          `}
        >
          {isOpen ? (
            <X className="w-6 h-6 text-zinc-300" />
          ) : (
            <Plus className="w-6 h-6 text-white" />
          )}
        </button>

        {/* Keyboard hint */}
        {!isOpen && (
          <div className="absolute -top-8 right-0 text-[10px] text-zinc-600 whitespace-nowrap">
            ⌘K to open
          </div>
        )}
      </div>

      {/* Modal Backdrop */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />

          {/* Task Modal */}
          {activeModal === "task" && (
            <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl p-6 shadow-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                  <CheckSquare className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-semibold">Quick Add Task</h2>
                <button onClick={closeModal} className="ml-auto p-2 hover:bg-zinc-800 rounded-lg">
                  <X className="w-5 h-5 text-zinc-400" />
                </button>
              </div>

              {success ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <CheckSquare className="w-8 h-8 text-emerald-400" />
                  </div>
                  <p className="text-emerald-400 font-medium">Task Created!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Task Name</label>
                    <input
                      type="text"
                      value={taskForm.name}
                      onChange={(e) => setTaskForm({ ...taskForm, name: e.target.value })}
                      placeholder="What needs to be done?"
                      autoFocus
                      className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-zinc-400 mb-1">Priority</label>
                      <select
                        value={taskForm.priority}
                        onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as QuickTaskForm["priority"] })}
                        className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:border-blue-500 focus:outline-none"
                      >
                        <option value="High">🔴 High</option>
                        <option value="Medium">🟡 Medium</option>
                        <option value="Low">🟢 Low</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-zinc-400 mb-1">Due Date</label>
                      <input
                        type="date"
                        value={taskForm.dueDate}
                        onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                        className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleSaveTask}
                    disabled={saving || !taskForm.name.trim()}
                    className="w-full py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 disabled:opacity-50 rounded-xl font-semibold flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Create Task
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Contact Modal */}
          {activeModal === "contact" && (
            <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl p-6 shadow-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-semibold">Quick Add Contact</h2>
                <button onClick={closeModal} className="ml-auto p-2 hover:bg-zinc-800 rounded-lg">
                  <X className="w-5 h-5 text-zinc-400" />
                </button>
              </div>

              {success ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <Users className="w-8 h-8 text-emerald-400" />
                  </div>
                  <p className="text-emerald-400 font-medium">Contact Added!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Name</label>
                    <input
                      type="text"
                      value={contactForm.name}
                      onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                      placeholder="Contact name"
                      autoFocus
                      className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:border-pink-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Company</label>
                    <input
                      type="text"
                      value={contactForm.company}
                      onChange={(e) => setContactForm({ ...contactForm, company: e.target.value })}
                      placeholder="Company name"
                      className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:border-pink-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Email</label>
                    <input
                      type="email"
                      value={contactForm.email}
                      onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                      placeholder="email@example.com"
                      className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:border-pink-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Notes</label>
                    <textarea
                      value={contactForm.notes}
                      onChange={(e) => setContactForm({ ...contactForm, notes: e.target.value })}
                      placeholder="Quick notes about this contact..."
                      rows={2}
                      className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:border-pink-500 focus:outline-none resize-none"
                    />
                  </div>
                  <button
                    onClick={handleSaveContact}
                    disabled={saving || !contactForm.name.trim()}
                    className="w-full py-3 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 disabled:opacity-50 rounded-xl font-semibold flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Add Contact
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Deal Modal */}
          {activeModal === "deal" && (
            <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl p-6 shadow-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-semibold">Quick Add Deal</h2>
                <button onClick={closeModal} className="ml-auto p-2 hover:bg-zinc-800 rounded-lg">
                  <X className="w-5 h-5 text-zinc-400" />
                </button>
              </div>

              {success ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <Briefcase className="w-8 h-8 text-emerald-400" />
                  </div>
                  <p className="text-emerald-400 font-medium">Deal Created!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Deal Name</label>
                    <input
                      type="text"
                      value={dealForm.name}
                      onChange={(e) => setDealForm({ ...dealForm, name: e.target.value })}
                      placeholder="Deal name"
                      autoFocus
                      className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:border-green-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Company</label>
                    <input
                      type="text"
                      value={dealForm.company}
                      onChange={(e) => setDealForm({ ...dealForm, company: e.target.value })}
                      placeholder="Company name"
                      className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:border-green-500 focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-zinc-400 mb-1">Value ($)</label>
                      <input
                        type="number"
                        value={dealForm.value}
                        onChange={(e) => setDealForm({ ...dealForm, value: e.target.value })}
                        placeholder="10000"
                        className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:border-green-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-zinc-400 mb-1">Stage</label>
                      <select
                        value={dealForm.stage}
                        onChange={(e) => setDealForm({ ...dealForm, stage: e.target.value })}
                        className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:border-green-500 focus:outline-none"
                      >
                        <option value="Lead">Lead</option>
                        <option value="Qualified">Qualified</option>
                        <option value="Proposal">Proposal</option>
                        <option value="Negotiation">Negotiation</option>
                        <option value="Closed Won">Closed Won</option>
                      </select>
                    </div>
                  </div>
                  <button
                    onClick={handleSaveDeal}
                    disabled={saving || !dealForm.name.trim()}
                    className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 disabled:opacity-50 rounded-xl font-semibold flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Create Deal
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* CSS for animations */}
      <style jsx>{`
        @keyframes slide-in-from-bottom-2 {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-in {
          animation: slide-in-from-bottom-2 0.2s ease-out;
        }
      `}</style>
    </>
  );
}

export default QuickActionsFAB;
