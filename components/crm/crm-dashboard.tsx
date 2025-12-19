"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, DollarSign, CheckSquare, FileText, Users } from "lucide-react";
import { Deal, Task, Activity, CrmOverviewData } from "@/lib/crm/overview";
import AddDealModal from "./add-deal-modal";
import AddTaskModal from "./add-task-modal";
import AddNoteModal from "./add-note-modal";
import PipelineKanban from "./pipeline-kanban";
import TaskInbox from "./task-inbox";
import ActivityFeed from "./activity-feed";

export default function CrmDashboard({ data }: { data: CrmOverviewData }) {
  const router = useRouter();
  const [activeModal, setActiveModal] = useState<"deal" | "task" | "note" | null>(null);

  if (!data.ok) {
    return (
      <div className="p-8">
        <div className="text-red-400">Failed to load CRM</div>
      </div>
    );
  }

  const handleSuccess = () => {
    setActiveModal(null);
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white">
      {/* Top Bar */}
      <div className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-[1920px] mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">CRM</h1>
              <p className="text-sm text-gray-400 mt-1">{data.summary}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveModal("deal")}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Deal
              </button>
              <button
                onClick={() => setActiveModal("task")}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Task
              </button>
              <button
                onClick={() => setActiveModal("note")}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Note
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="max-w-[1920px] mx-auto px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
          {/* Left: Pipeline Kanban */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Pipeline
            </h2>
            <PipelineKanban pipeline={data.pipeline} />
          </div>

          {/* Right: Task Inbox + Activity */}
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <CheckSquare className="w-5 h-5" />
                Task Inbox
              </h2>
              <TaskInbox tasks={data.tasks} />
            </div>

            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5" />
                Recent Activity
              </h2>
              <ActivityFeed activity={data.activity} />
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {activeModal === "deal" && (
        <AddDealModal onClose={() => setActiveModal(null)} onSuccess={handleSuccess} />
      )}
      {activeModal === "task" && (
        <AddTaskModal onClose={() => setActiveModal(null)} onSuccess={handleSuccess} />
      )}
      {activeModal === "note" && (
        <AddNoteModal onClose={() => setActiveModal(null)} onSuccess={handleSuccess} />
      )}
    </div>
  );
}

