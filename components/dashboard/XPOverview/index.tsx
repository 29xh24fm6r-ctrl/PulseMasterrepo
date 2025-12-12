interface XPOverviewProps {
  dxp?: number;
  pxp?: number;
  ixp?: number;
  axp?: number;
  mxp?: number;
  belt?: string;
  loading?: boolean;
}

export default function XPOverview({
  dxp = 0,
  pxp = 0,
  ixp = 0,
  axp = 0,
  mxp = 0,
  belt = "White",
  loading = false
}: XPOverviewProps) {
  const xpCategories = [
    { label: "Discipline", value: dxp, color: "text-violet-400" },
    { label: "Power", value: pxp, color: "text-amber-400" },
    { label: "Identity", value: ixp, color: "text-cyan-400" },
    { label: "Achievement", value: axp, color: "text-emerald-400" },
    { label: "Momentum", value: mxp, color: "text-rose-400" },
  ];

  if (loading) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">XP Overview</h2>
        <div className="text-center py-8">
          <p className="text-zinc-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">XP Overview</h2>
        <span className="text-xs px-2 py-1 bg-zinc-800 text-zinc-300 rounded-full">
          {belt} Belt
        </span>
      </div>
      <div className="space-y-3">
        {xpCategories.map((category) => (
          <div key={category.label}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-zinc-400">{category.label}</span>
              <span className={`text-xs font-medium ${category.color}`}>
                {category.value.toLocaleString()}
              </span>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-1.5">
              <div 
                className={`h-1.5 rounded-full ${category.color.replace('text-', 'bg-')}`}
                style={{ width: `${Math.min((category.value / 1000) * 100, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}





