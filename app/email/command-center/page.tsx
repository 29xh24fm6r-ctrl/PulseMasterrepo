import { SuggestedDraftsCard } from "@/app/email/inbox/_components/SuggestedDraftsCard";
import { ReminderCard } from "@/app/email/inbox/_components/ReminderCard";
import { OutboxHealthCard } from "@/app/email/inbox/_components/OutboxHealthCard";
import { OutboxFlushButton } from "@/app/email/inbox/_components/OutboxFlushButton";
import { TriageFeed } from "./triage-feed";
import { GenerateBatchButton } from "./generate-batch";
import { AutopilotQueue } from "./autopilot-queue";
import { AutopilotV2Card } from "./autopilot-v2";

export const dynamic = "force-dynamic";

export default function EmailCommandCenterPage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 p-4">
      <div className="flex items-end justify-between gap-3">
        <div className="flex flex-col">
          <div className="text-xl font-semibold text-white">Email Command Center</div>
          <div className="text-sm text-zinc-400">Triage, Drafts, Outbox, SLA, Autopilot — one cockpit.</div>
        </div>
        <a href="/email/inbox" className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-900/60">
          Back to Inbox
        </a>
      </div>

      <AutopilotQueue />
      <AutopilotV2Card />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <TriageFeed />
        </div>

        <div className="flex flex-col gap-4">
          <GenerateBatchButton />
          <SuggestedDraftsCard />
          <ReminderCard />
          <OutboxHealthCard />
          <OutboxFlushButton />
        </div>
      </div>
    </div>
  );
}
