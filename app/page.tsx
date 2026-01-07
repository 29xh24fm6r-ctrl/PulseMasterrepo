import { AdaptiveStream } from "@/components/AdaptiveStream";

export default function HomePage() {
  return (
    <div className="min-h-screen font-sans selection:bg-cyan-900 overflow-hidden relative">
      {/* Background provided by globals.css + TheOrb in layout */}

      {/* The Stream */}
      <AdaptiveStream />

      {/* Footer / Status */}
      <div className="fixed bottom-6 left-0 right-0 text-center pointer-events-none">
        <p className="text-[10px] uppercase tracking-[0.3em] text-white/20">Pulse OS Active</p>
      </div>
    </div>
  );
}

function RecentActivity() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch("/api/activity/recent?limit=10", { cache: "no-store" });
      const j = await r.json();
      if (!j.ok) throw new Error(j.detail || j.error || "Failed to load activity");
      setItems(j.items ?? []);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-semibold text-gray-200">Recent Activity</div>
        <button
          onClick={load}
          className="text-xs opacity-80 hover:opacity-100 underline text-cyan-400"
        >
          Refresh
        </button>
      </div>

      {loading && <div className="text-sm opacity-80 text-gray-500">Loading…</div>}

      {err && (
        <div className="text-sm">
          <div className="opacity-90 text-red-400">Failed to load: {err}</div>
        </div>
      )}

      {!loading && !err && items.length === 0 && (
        <div className="text-sm opacity-80 text-gray-500">No activity yet.</div>
      )}

      {!loading && !err && items.length > 0 && (
        <ul className="space-y-2">
          {items.map((x) => (
            <li key={x.id} className="text-sm border-b border-white/5 pb-2 last:border-0 last:pb-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium text-gray-300">{x.title}</div>
                  {x.detail ? <div className="opacity-80 truncate text-gray-500">{x.detail}</div> : null}
                </div>
                <div className="text-xs opacity-60 whitespace-nowrap text-gray-600">
                  {new Date(x.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
