interface Relationship {
  id: string;
  name: string;
  health: number;
  lastContact?: string;
}

interface RelationshipHealthProps {
  relationships?: Relationship[];
  loading?: boolean;
}

export default function RelationshipHealth({
  relationships = [],
  loading = false
}: RelationshipHealthProps) {
  if (loading) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Relationship Health</h2>
        <div className="text-center py-8">
          <p className="text-zinc-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  const getHealthColor = (health: number) => {
    if (health >= 0.7) return "text-emerald-400";
    if (health >= 0.4) return "text-amber-400";
    return "text-red-400";
  };

  const getHealthLabel = (health: number) => {
    if (health >= 0.7) return "Strong";
    if (health >= 0.4) return "Moderate";
    return "Needs Attention";
  };

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Relationship Health</h2>
        <span className="text-xs text-zinc-500">{relationships.length} tracked</span>
      </div>
      {relationships.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-zinc-500 text-sm">No relationships tracked</p>
        </div>
      ) : (
        <div className="space-y-3">
          {relationships.slice(0, 5).map((relationship) => (
            <div 
              key={relationship.id}
              className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-white">{relationship.name}</p>
                <span className={`text-xs font-medium ${getHealthColor(relationship.health)}`}>
                  {getHealthLabel(relationship.health)}
                </span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-1.5">
                <div 
                  className={`h-1.5 rounded-full ${getHealthColor(relationship.health).replace('text-', 'bg-')}`}
                  style={{ width: `${relationship.health * 100}%` }}
                />
              </div>
              {relationship.lastContact && (
                <p className="text-xs text-zinc-500 mt-2">
                  Last contact: {new Date(relationship.lastContact).toLocaleDateString()}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

