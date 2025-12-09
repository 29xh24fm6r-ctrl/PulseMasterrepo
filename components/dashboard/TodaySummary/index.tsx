interface TodaySummaryProps {
  greeting?: string;
  focusItems?: string[];
  stats?: {
    tasksCompleted?: number;
    tasksTotal?: number;
    habitsCompleted?: number;
    habitsTotal?: number;
  };
}

export default function TodaySummary({ 
  greeting = "Good morning",
  focusItems = [],
  stats = {}
}: TodaySummaryProps) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
      <h2 className="text-lg font-semibold text-white mb-4">Today's Summary</h2>
      <div className="space-y-4">
        <div>
          <p className="text-zinc-400">{greeting}</p>
        </div>
        {focusItems.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-zinc-300 mb-2">Focus Items</h3>
            <ul className="space-y-1">
              {focusItems.map((item, idx) => (
                <li key={idx} className="text-sm text-zinc-400">• {item}</li>
              ))}
            </ul>
          </div>
        )}
        {(stats.tasksTotal !== undefined || stats.habitsTotal !== undefined) && (
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-zinc-800">
            {stats.tasksTotal !== undefined && (
              <div>
                <p className="text-xs text-zinc-500">Tasks</p>
                <p className="text-sm font-medium text-white">
                  {stats.tasksCompleted || 0} / {stats.tasksTotal}
                </p>
              </div>
            )}
            {stats.habitsTotal !== undefined && (
              <div>
                <p className="text-xs text-zinc-500">Habits</p>
                <p className="text-sm font-medium text-white">
                  {stats.habitsCompleted || 0} / {stats.habitsTotal}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

