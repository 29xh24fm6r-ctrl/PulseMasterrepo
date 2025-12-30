import TraceView from "@/components/traces/TraceView";

export const dynamic = "force-dynamic";

export default function Page({ params }: { params: { trace_id: string } }) {
    return <TraceView traceId={params.trace_id} />;
}
