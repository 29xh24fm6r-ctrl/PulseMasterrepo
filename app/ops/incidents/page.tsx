// src/app/ops/incidents/page.tsx
import IncidentWarRoom from "@/components/ops/IncidentWarRoom";

export const dynamic = "force-dynamic";

export default function IncidentsPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Incident War Room</h1>
        <p className="text-sm text-muted-foreground">
          Live ops status, rollback pipeline, and a timeline of what just happened.
        </p>
      </div>

      <IncidentWarRoom />
    </div>
  );
}

