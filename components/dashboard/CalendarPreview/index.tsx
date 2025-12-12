interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  location?: string;
}

interface CalendarPreviewProps {
  events?: CalendarEvent[];
  date?: Date;
}

export default function CalendarPreview({ 
  events = [],
  date = new Date()
}: CalendarPreviewProps) {
  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Today's Calendar</h2>
        <span className="text-xs text-zinc-500">
          {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
      </div>
      {events.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-zinc-500 text-sm">No events scheduled</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <div 
              key={event.id} 
              className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{event.title}</p>
                  {event.location && (
                    <p className="text-xs text-zinc-400 mt-1">{event.location}</p>
                  )}
                </div>
                <div className="text-xs text-zinc-500 ml-4">
                  {formatTime(event.start)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}





