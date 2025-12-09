"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Send, Loader2, Sparkles, User, RefreshCw, Users, X, Search, ChevronDown } from "lucide-react";

interface Mentor {
  id: string;
  name: string;
  philosophy: string;
  icon: string;
  description: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface XPAward {
  amount: number;
  category: string;
  activity: string;
  wasCrit: boolean;
}

interface Person {
  id: string;
  name: string;
  company?: string;
  email?: string;
  type?: string;
  relationshipStatus?: string;
  notes?: string;
  rawData?: string;
}

interface CoachInsight {
  coachId: string;
  coachName: string;
  insight: string;
  action?: string;
  timestamp: string;
}

const MENTORS: Mentor[] = [
  { id: "marcus_aurelius", name: "Marcus Aurelius", philosophy: "Stoicism", icon: "👑", description: "Roman Emperor. Quiet strength, duty, and the inner citadel." },
  { id: "seneca", name: "Seneca", philosophy: "Stoicism", icon: "📜", description: "Practical wisdom on time, wealth, and living well." },
  { id: "epictetus", name: "Epictetus", philosophy: "Stoicism", icon: "⛓️", description: "Former slave. Tough love and the dichotomy of control." },
  { id: "musashi", name: "Miyamoto Musashi", philosophy: "Samurai", icon: "⚔️", description: "Undefeated swordsman. Decisive action, no wasted movement." },
  { id: "sun_tzu", name: "Sun Tzu", philosophy: "Strategy", icon: "🏹", description: "Ancient strategist. Win before fighting." },
  { id: "lao_tzu", name: "Lao Tzu", philosophy: "Taoism", icon: "☯️", description: "The Way that cannot be named. Softness, flow, paradox." },
  { id: "zen_master", name: "Zen Master", philosophy: "Zen", icon: "🧘", description: "Direct pointing. This moment. What is this?" },
  { id: "buddha", name: "The Buddha", philosophy: "Buddhism", icon: "☸️", description: "The Awakened One. Compassion and the end of suffering." },
  { id: "covey", name: "Stephen Covey", philosophy: "7 Habits", icon: "📘", description: "Principle-centered effectiveness. Begin with the end in mind." },
  { id: "goggins", name: "David Goggins", philosophy: "Discipline", icon: "��", description: "No excuses. Callus your mind. Stay hard." },
];

function MentorCard({ mentor, selected, onClick }: { mentor: Mentor; selected: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`relative p-4 rounded-xl border-2 transition-all duration-200 text-left w-full ${selected ? "border-white/50 bg-white/10 scale-[1.02]" : "border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10"}`}>
      <div className="flex items-start gap-3">
        <span className="text-3xl">{mentor.icon}</span>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white truncate">{mentor.name}</h3>
          <p className="text-xs text-white/50 mb-1">{mentor.philosophy}</p>
          <p className="text-xs text-white/70 line-clamp-2">{mentor.description}</p>
        </div>
      </div>
      {selected && <div className="absolute top-2 right-2"><div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /></div>}
    </button>
  );
}

function ChatMessage({ message, mentorIcon }: { message: Message; mentorIcon: string }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isUser ? "bg-blue-500/20" : "bg-white/10"}`}>
        {isUser ? <User className="w-4 h-4 text-blue-400" /> : <span>{mentorIcon}</span>}
      </div>
      <div className={`max-w-[80%] p-3 rounded-2xl ${isUser ? "bg-blue-500/20 text-white rounded-tr-sm" : "bg-white/10 text-white/90 rounded-tl-sm"}`}>
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
}

function XPToast({ xp }: { xp: XPAward }) {
  return (
    <div className="fixed bottom-24 right-4 animate-slide-up">
      <div className={`px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 ${xp.wasCrit ? "bg-yellow-500" : "bg-green-500"}`}>
        <Sparkles className="w-4 h-4" />
        <span className="font-semibold">+{xp.amount} {xp.category}{xp.wasCrit && " CRIT!"}</span>
      </div>
    </div>
  );
}

function PersonDropdown({ 
  activePerson,
  onSelect, 
  onClear,
}: { 
  activePerson: Person | null;
  onSelect: (person: Person) => void;
  onClear: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Load all contacts on mount
  useEffect(() => {
    loadPeople("");
  }, []);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  
  const loadPeople = async (query: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/person-lookup?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.ok) {
        setPeople(data.people || []);
      }
    } catch (error) {
      console.error("Person search error:", error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    loadPeople(query);
  };
  
  const handleSelect = (person: Person) => {
    onSelect(person);
    setIsOpen(false);
    setSearchQuery("");
  };
  
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'hot': return 'bg-green-500/20 text-green-400';
      case 'warm': return 'bg-yellow-500/20 text-yellow-400';
      case 'cooling': return 'bg-orange-500/20 text-orange-400';
      case 'cold': return 'bg-red-500/20 text-red-400';
      default: return 'bg-white/10 text-white/50';
    }
  };
  
  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition ${
          activePerson 
            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
            : 'bg-white/10 text-white/70 hover:bg-white/20'
        }`}
      >
        <Users className="w-4 h-4" />
        {activePerson ? (
          <>
            <span className="text-sm font-medium">{activePerson.name}</span>
            <span 
              onClick={(e) => { e.stopPropagation(); onClear(); }}
              className="ml-1 p-0.5 hover:bg-white/20 rounded cursor-pointer"
            >
              <X className="w-3 h-3" />
            </span>
          </>
        ) : (
          <>
            <span className="text-sm">Select Person</span>
            <ChevronDown className="w-3 h-3" />
          </>
        )}
      </button>
      
      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-zinc-800 rounded-xl border border-white/20 shadow-xl overflow-hidden z-50">
          {/* Search */}
          <div className="p-3 border-b border-white/10">
            <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
              <Search className="w-4 h-4 text-white/50" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search contacts..."
                className="flex-1 bg-transparent text-sm focus:outline-none"
                autoFocus
              />
            </div>
          </div>
          
          {/* List */}
          <div className="max-h-64 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-white/50">
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              </div>
            ) : people.length > 0 ? (
              people.map(person => (
                <button
                  key={person.id}
                  onClick={() => handleSelect(person)}
                  className="w-full p-3 text-left hover:bg-white/10 transition flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/30 flex items-center justify-center">
                    <span className="text-sm font-semibold">{person.name.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{person.name}</p>
                    <p className="text-xs text-white/50 truncate">
                      {person.company || person.type || 'Contact'}
                    </p>
                  </div>
                  {person.relationshipStatus && person.relationshipStatus !== 'unknown' && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(person.relationshipStatus)}`}>
                      {person.relationshipStatus}
                    </span>
                  )}
                </button>
              ))
            ) : (
              <div className="p-4 text-center text-white/50 text-sm">
                No contacts found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ActivePersonBadge({ person, onClear }: { person: Person; onClear: () => void }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 rounded-lg text-sm border border-blue-500/30">
      <User className="w-3 h-3 text-blue-400" />
      <span>Discussing: <strong>{person.name}</strong></span>
      {person.company && <span className="text-white/50">({person.company})</span>}
      <button onClick={onClear} className="ml-1 p-0.5 hover:bg-white/10 rounded">
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

export default function MentorPage() {
  const [selectedMentor, setSelectedMentor] = useState<Mentor | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [xpToast, setXpToast] = useState<XPAward | null>(null);
  const [showMentorSelect, setShowMentorSelect] = useState(true);
  const [activePerson, setActivePerson] = useState<Person | null>(null);
  const [coachInsights, setCoachInsights] = useState<CoachInsight[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { if (inputRef.current) { inputRef.current.style.height = "auto"; inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`; } }, [input]);
  useEffect(() => { if (xpToast) { const timer = setTimeout(() => setXpToast(null), 3000); return () => clearTimeout(timer); } }, [xpToast]);

  const selectMentor = (mentor: Mentor) => { 
    setSelectedMentor(mentor); 
    setMessages([]); 
    setShowMentorSelect(false); 
  };
  
  const changeMentor = () => { setShowMentorSelect(true); };
  const selectPerson = (person: Person) => { setActivePerson(person); };
  const clearPerson = () => { setActivePerson(null); };

  const sendMessage = async () => {
    if (!input.trim() || !selectedMentor || isLoading) return;
    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/philosophy/mentor-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          mentorId: selectedMentor.id, 
          userMessage, 
          conversationHistory: messages,
          personContext: activePerson || undefined,
          coachInsights: coachInsights.length > 0 ? coachInsights : undefined,
        }),
      });

      if (!response.ok) throw new Error("Failed to get mentor response");
      const data = await response.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.mentorResponse }]);
      
      if (data.coachInsight) {
        setCoachInsights(prev => [...prev.slice(-9), {
          ...data.coachInsight,
          timestamp: new Date().toISOString(),
        }]);
      }
      
      if (data.xpAwarded) setXpToast(data.xpAwarded);
    } catch (error) {
      console.error("Mentor session error:", error);
      setMessages(prev => [...prev, { role: "assistant", content: "I apologize, but I'm having trouble connecting right now. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => { 
    if (e.key === "Enter" && !e.shiftKey) { 
      e.preventDefault(); 
      sendMessage(); 
    }
  };

  // MENTOR SELECTION SCREEN
  if (showMentorSelect) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 text-white p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Link href="/philosophy-dojo" className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition"><ArrowLeft className="w-5 h-5" /></Link>
            <div>
              <h1 className="text-2xl font-bold">Choose Your Mentor</h1>
              <p className="text-white/60">Select a mentor to begin your session</p>
            </div>
          </div>
          
          {activePerson && (
            <div className="mb-4 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <p className="text-sm text-white/70 mb-1">Continuing discussion about:</p>
              <ActivePersonBadge person={activePerson} onClear={clearPerson} />
            </div>
          )}
          
          {coachInsights.length > 0 && (
            <div className="mb-4 p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
              <p className="text-sm text-white/70 mb-2">Previous coach insights this session:</p>
              <div className="space-y-1">
                {coachInsights.slice(-3).map((insight, i) => (
                  <p key={i} className="text-xs text-white/60">
                    <span className="text-purple-400">{insight.coachName}:</span> {insight.insight.substring(0, 100)}...
                  </p>
                ))}
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {MENTORS.map(mentor => (<MentorCard key={mentor.id} mentor={mentor} selected={selectedMentor?.id === mentor.id} onClick={() => selectMentor(mentor)} />))}
          </div>
        </div>
      </div>
    );
  }

  // CHAT INTERFACE
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 text-white flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/philosophy-dojo" className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition"><ArrowLeft className="w-4 h-4" /></Link>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{selectedMentor?.icon}</span>
              <div>
                <h1 className="font-semibold">{selectedMentor?.name}</h1>
                <p className="text-xs text-white/50">{selectedMentor?.philosophy}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <PersonDropdown 
              activePerson={activePerson}
              onSelect={selectPerson}
              onClear={clearPerson}
            />
            <button onClick={changeMentor} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <span className="text-6xl mb-4 block">{selectedMentor?.icon}</span>
              <h2 className="text-xl font-semibold mb-2">Begin your session with {selectedMentor?.name}</h2>
              <p className="text-white/60 max-w-md mx-auto mb-4">{selectedMentor?.description}</p>
              
              {activePerson && (
                <div className="mb-4 flex justify-center">
                  <ActivePersonBadge person={activePerson} onClear={clearPerson} />
                </div>
              )}
              
              <div className="flex flex-wrap justify-center gap-2">
                {["I'm feeling overwhelmed", "How do I deal with difficult people?", "I need motivation", "Help me make a decision"].map(prompt => (
                  <button key={prompt} onClick={() => setInput(prompt)} className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-sm transition">{prompt}</button>
                ))}
              </div>
            </div>
          )}
          {messages.map((message, index) => (<ChatMessage key={index} message={message} mentorIcon={selectedMentor?.icon || "🧘"} />))}
          {isLoading && (<div className="flex gap-3"><div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"><span>{selectedMentor?.icon}</span></div><div className="bg-white/10 rounded-2xl rounded-tl-sm p-3"><Loader2 className="w-5 h-5 animate-spin text-white/50" /></div></div>)}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex gap-2 items-end">
            <div className="flex-1 bg-white/10 rounded-xl border border-white/10 focus-within:border-white/30 transition">
              <textarea 
                ref={inputRef} 
                value={input} 
                onChange={(e) => setInput(e.target.value)} 
                onKeyDown={handleKeyDown} 
                placeholder={activePerson ? `Ask about ${activePerson.name}...` : `Ask ${selectedMentor?.name}...`}
                rows={1} 
                className="w-full bg-transparent px-4 py-3 text-sm resize-none focus:outline-none max-h-32" 
              />
            </div>
            <button onClick={sendMessage} disabled={!input.trim() || isLoading} className={`p-3 rounded-xl transition flex-shrink-0 ${input.trim() && !isLoading ? "bg-blue-500 hover:bg-blue-600 text-white" : "bg-white/10 text-white/30 cursor-not-allowed"}`}>
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
          <p className="text-xs text-white/30 mt-2 text-center">Enter to send • Shift+Enter for new line</p>
        </div>
      </div>

      {xpToast && <XPToast xp={xpToast} />}
      <style jsx global>{`@keyframes slide-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } } .animate-slide-up { animation: slide-up 0.3s ease-out; }`}</style>
    </div>
  );
}
