// src/components/create/CreateLauncher.tsx
"use client";

import { useState } from "react";
import { Plus, User, CheckSquare, Handshake, BookOpen, Target, X } from "lucide-react";

type CreateType = "contact" | "task" | "deal" | "journal" | "habit" | null;

export default function CreateLauncher() {
  const [activeModal, setActiveModal] = useState<CreateType>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const tiles = [
    {
      type: "contact" as CreateType,
      label: "New Contact",
      icon: User,
      color: "bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/15",
    },
    {
      type: "task" as CreateType,
      label: "New Task",
      icon: CheckSquare,
      color: "bg-green-500/10 border-green-500/30 hover:bg-green-500/15",
    },
    {
      type: "deal" as CreateType,
      label: "New Deal",
      icon: Handshake,
      color: "bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/15",
    },
    {
      type: "journal" as CreateType,
      label: "New Journal Entry",
      icon: BookOpen,
      color: "bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/15",
    },
    {
      type: "habit" as CreateType,
      label: "New Habit",
      icon: Target,
      color: "bg-pink-500/10 border-pink-500/30 hover:bg-pink-500/15",
    },
  ];

  async function handleSubmit(type: CreateType, data: any) {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      let endpoint = "";
      let payload: any = {};

      switch (type) {
        case "contact":
          endpoint = "/api/contacts";
          payload = { name: data.name || `${data.firstName || ""} ${data.lastName || ""}`.trim() };
          if (data.email) payload.email = data.email;
          if (data.phone) payload.phone = data.phone;
          break;
        case "task":
          endpoint = "/api/crm/tasks";
          // For simplicity, create a placeholder contact if none exists
          // In production, you'd want to handle this better
          if (!data.contact_id) {
            // Create a minimal contact first
            const contactRes = await fetch("/api/contacts", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: "Self" }),
            });
            const contactData = await contactRes.json();
            payload.contact_id = contactData.item?.id || contactData.id;
          } else {
            payload.contact_id = data.contact_id;
          }
          payload.title = data.title;
          if (data.description) payload.description = data.description;
          if (data.due_at) payload.due_at = data.due_at;
          break;
        case "deal":
          endpoint = "/api/deals";
          payload.name = data.name;
          if (data.company) payload.company = data.company;
          if (data.amount) payload.amount = data.amount;
          if (data.stage) payload.stage = data.stage;
          if (data.notes) payload.notes = data.notes;
          break;
        case "journal":
          endpoint = "/api/journal";
          payload.content = data.content;
          if (data.title) payload.title = data.title;
          if (data.mood) payload.mood = data.mood;
          break;
        case "habit":
          endpoint = "/api/habits";
          payload.name = data.name;
          if (data.frequency) payload.frequency = data.frequency;
          if (data.target) payload.target = data.target;
          if (data.notes) payload.notes = data.notes;
          break;
        default:
          throw new Error("Unknown type");
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || json.error) {
        throw new Error(json.error || `Failed to create ${type}`);
      }

      setSuccess(`${tiles.find((t) => t.type === type)?.label} created!`);
      setTimeout(() => {
        setActiveModal(null);
        setSuccess(null);
      }, 1500);
    } catch (e: any) {
      setError(e?.message || "Failed to create");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="rounded-2xl border p-5 bg-background shadow-sm">
        <div className="flex items-center gap-3">
          <Plus className="w-6 h-6" />
          <div>
            <div className="text-xl font-semibold">Create</div>
            <div className="text-sm text-muted-foreground">Add something new in seconds</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <button
              key={tile.type}
              onClick={() => setActiveModal(tile.type)}
              className={`rounded-2xl border p-6 text-left transition-colors ${tile.color}`}
            >
              <Icon className="w-8 h-8 mb-3" />
              <div className="font-semibold">{tile.label}</div>
            </button>
          );
        })}
      </div>

      {/* Contact Modal */}
      {activeModal === "contact" && (
        <CreateModal
          title="New Contact"
          onClose={() => setActiveModal(null)}
          onSubmit={(data) => handleSubmit("contact", data)}
          loading={loading}
          error={error}
          success={success}
        >
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name *</label>
              <input
                type="text"
                name="name"
                className="w-full rounded-xl border px-3 py-2 mt-1"
                placeholder="John Doe"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <input
                type="email"
                name="email"
                className="w-full rounded-xl border px-3 py-2 mt-1"
                placeholder="john@example.com"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Phone</label>
              <input
                type="tel"
                name="phone"
                className="w-full rounded-xl border px-3 py-2 mt-1"
                placeholder="+1 234 567 8900"
              />
            </div>
          </div>
        </CreateModal>
      )}

      {/* Task Modal */}
      {activeModal === "task" && (
        <CreateModal
          title="New Task"
          onClose={() => setActiveModal(null)}
          onSubmit={(data) => handleSubmit("task", data)}
          loading={loading}
          error={error}
          success={success}
        >
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Title *</label>
              <input
                type="text"
                name="title"
                className="w-full rounded-xl border px-3 py-2 mt-1"
                placeholder="Complete project proposal"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <textarea
                name="description"
                className="w-full rounded-xl border px-3 py-2 mt-1"
                rows={3}
                placeholder="Additional details..."
              />
            </div>
            <div>
              <label className="text-sm font-medium">Due Date</label>
              <input
                type="date"
                name="due_at"
                className="w-full rounded-xl border px-3 py-2 mt-1"
              />
            </div>
          </div>
        </CreateModal>
      )}

      {/* Deal Modal */}
      {activeModal === "deal" && (
        <CreateModal
          title="New Deal"
          onClose={() => setActiveModal(null)}
          onSubmit={(data) => handleSubmit("deal", data)}
          loading={loading}
          error={error}
          success={success}
        >
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Deal Name *</label>
              <input
                type="text"
                name="name"
                className="w-full rounded-xl border px-3 py-2 mt-1"
                placeholder="Q4 Enterprise Contract"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Company</label>
              <input
                type="text"
                name="company"
                className="w-full rounded-xl border px-3 py-2 mt-1"
                placeholder="Acme Corp"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Amount</label>
              <input
                type="number"
                name="amount"
                className="w-full rounded-xl border px-3 py-2 mt-1"
                placeholder="50000"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Stage</label>
              <select name="stage" className="w-full rounded-xl border px-3 py-2 mt-1">
                <option value="prospect">Prospect</option>
                <option value="qualified">Qualified</option>
                <option value="proposal">Proposal</option>
                <option value="negotiation">Negotiation</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>
        </CreateModal>
      )}

      {/* Journal Modal */}
      {activeModal === "journal" && (
        <CreateModal
          title="New Journal Entry"
          onClose={() => setActiveModal(null)}
          onSubmit={(data) => handleSubmit("journal", data)}
          loading={loading}
          error={error}
          success={success}
        >
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Title (optional)</label>
              <input
                type="text"
                name="title"
                className="w-full rounded-xl border px-3 py-2 mt-1"
                placeholder="Morning reflection"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Content *</label>
              <textarea
                name="content"
                className="w-full rounded-xl border px-3 py-2 mt-1"
                rows={6}
                placeholder="What's on your mind?"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Mood</label>
              <select name="mood" className="w-full rounded-xl border px-3 py-2 mt-1">
                <option value="">Select mood</option>
                <option value="great">Great</option>
                <option value="good">Good</option>
                <option value="okay">Okay</option>
                <option value="tough">Tough</option>
                <option value="difficult">Difficult</option>
              </select>
            </div>
          </div>
        </CreateModal>
      )}

      {/* Habit Modal */}
      {activeModal === "habit" && (
        <CreateModal
          title="New Habit"
          onClose={() => setActiveModal(null)}
          onSubmit={(data) => handleSubmit("habit", data)}
          loading={loading}
          error={error}
          success={success}
        >
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Habit Name *</label>
              <input
                type="text"
                name="name"
                className="w-full rounded-xl border px-3 py-2 mt-1"
                placeholder="Morning meditation"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Frequency</label>
              <select name="frequency" className="w-full rounded-xl border px-3 py-2 mt-1">
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Target</label>
              <input
                type="number"
                name="target"
                className="w-full rounded-xl border px-3 py-2 mt-1"
                placeholder="1"
                defaultValue={1}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Notes</label>
              <textarea
                name="notes"
                className="w-full rounded-xl border px-3 py-2 mt-1"
                rows={2}
                placeholder="Why this habit matters..."
              />
            </div>
          </div>
        </CreateModal>
      )}
    </div>
  );
}

function CreateModal({
  title,
  children,
  onClose,
  onSubmit,
  loading,
  error,
  success,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  onSubmit: (data: any) => void;
  loading: boolean;
  error: string | null;
  success: string | null;
}) {
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: any = {};
    for (const [key, value] of formData.entries()) {
      data[key] = value;
    }
    onSubmit(data);
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-2xl border p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && <div className="mb-4 text-sm text-red-600 bg-red-500/10 border border-red-500/30 rounded-xl p-3">{error}</div>}
        {success && <div className="mb-4 text-sm text-green-600 bg-green-500/10 border border-green-500/30 rounded-xl p-3">{success}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {children}
          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border px-4 py-2 hover:bg-muted"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded-xl border px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

