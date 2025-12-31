import ExecutionTimeline from "@/components/today/ExecutionTimeline";

export const dynamic = "force-dynamic";

export default function Page() {
    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
            <div className="max-w-4xl mx-auto space-y-6">
                <h1 className="text-2xl font-semibold">Today</h1>
                <ExecutionTimeline />
            </div>
        </div>
    );
}
