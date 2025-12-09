'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader2, Zap, ArrowLeft, Moon, Sparkles, BookOpen, Compass, Save, Mic, MicOff, Volume2 } from 'lucide-react';
import Link from 'next/link';
import { useXPToast } from '../components/xp-toast';

// ============================================
// MINI PULSE FACE FOR JOURNAL
// ============================================

function PulseFace({ 
  size = 60,
  speaking = false,
  listening = false,
}: {
  size?: number;
  speaking?: boolean;
  listening?: boolean;
}) {
  const [mouthOpen, setMouthOpen] = useState(0);

  useEffect(() => {
    if (speaking) {
      const interval = setInterval(() => setMouthOpen(Math.random() * 0.8 + 0.2), 80);
      return () => clearInterval(interval);
    } else {
      setMouthOpen(0);
    }
  }, [speaking]);

  const glowColor = speaking ? 'rgba(34, 211, 238, 0.5)' : listening ? 'rgba(52, 211, 153, 0.5)' : 'rgba(99, 102, 241, 0.4)';
  const faceColor = speaking ? '#0891b2' : listening ? '#10b981' : '#6366f1';

  const getMouthPath = () => {
    if (speaking && mouthOpen > 0.2) {
      const o = mouthOpen * 10;
      return `M 35 65 Q 50 ${65 + o} 65 65 Q 50 ${68 + o * 0.5} 35 65`;
    }
    return 'M 35 65 Q 50 72 65 65';
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div className="absolute inset-0 rounded-full blur-lg transition-all duration-200" style={{ background: glowColor }} />
      <svg width={size} height={size} viewBox="0 0 100 100" className="relative z-10">
        <circle cx="50" cy="50" r="42" fill={faceColor} className="transition-all duration-300" />
        <ellipse cx="35" cy="42" rx="6" ry="8" fill="white" />
        <circle cx="36" cy="43" r="3" fill="#1e293b" />
        <ellipse cx="65" cy="42" rx="6" ry="8" fill="white" />
        <circle cx="66" cy="43" r="3" fill="#1e293b" />
        <path d={getMouthPath()} fill={speaking && mouthOpen > 0.3 ? 'rgba(255,255,255,0.9)' : 'none'} stroke="white" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  );
}

// ============================================
// TYPES
// ============================================

interface Option {
  id: string;
  label: string;
  value: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  options?: Option[] | null;
}

interface DaySummary {
  completedTasks: string[];
  habitsCompleted: string[];
  dealsProgress: { name: string; stage: string }[];
  reflectionStreak: number;
}

// ============================================
// JOURNAL PAGE
// ============================================

export default function JournalPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [journalMode, setJournalMode] = useState<'select' | 'freeflow' | 'guided' | 'quick'>('select');
  const [daySummary, setDaySummary] = useState<DaySummary | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  
  // XP Toast hook
  const { showXPToast } = useXPToast();
  
  // Voice state
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceConnected, setVoiceConnected] = useState(false);
  
  // Voice refs
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Cleanup voice on unmount
  useEffect(() => {
    return () => disconnectVoice();
  }, []);

  // ============================================
  // VOICE FUNCTIONS
  // ============================================

  const connectVoice = async () => {
    try {
      const tokenResponse = await fetch('/api/realtime/session', { method: 'POST' });
      if (!tokenResponse.ok) throw new Error('Failed to get session');
      const { client_secret } = await tokenResponse.json();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      const pc = new RTCPeerConnection();
      peerConnectionRef.current = pc;

      pc.ontrack = (event) => {
        const audio = new Audio();
        audio.srcObject = event.streams[0];
        audio.play();
      };

      stream.getAudioTracks().forEach(track => pc.addTrack(track, stream));

      const dc = pc.createDataChannel('oai-events');
      dataChannelRef.current = dc;

      dc.onopen = () => setVoiceConnected(true);
      dc.onmessage = (event) => handleVoiceEvent(JSON.parse(event.data));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpResponse = await fetch('https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${client_secret}`, 'Content-Type': 'application/sdp' },
        body: offer.sdp,
      });

      if (!sdpResponse.ok) throw new Error('Failed to connect');

      const answerSdp = await sdpResponse.text();
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

      setIsVoiceMode(true);
    } catch (err) {
      console.error('Voice connection error:', err);
      setIsVoiceMode(false);
    }
  };

  const handleVoiceEvent = (event: any) => {
    switch (event.type) {
      case 'input_audio_buffer.speech_started':
        setIsListening(true);
        setIsSpeaking(false);
        break;
      case 'input_audio_buffer.speech_stopped':
        setIsListening(false);
        break;
      case 'response.audio.delta':
        setIsSpeaking(true);
        break;
      case 'response.audio.done':
        setIsSpeaking(false);
        break;
      case 'conversation.item.input_audio_transcription.completed':
        if (event.transcript) {
          const userMessage: Message = { role: 'user', content: event.transcript, timestamp: new Date() };
          setMessages(prev => [...prev, userMessage]);
        }
        break;
      case 'response.audio_transcript.done':
        if (event.transcript) {
          const assistantMessage: Message = { role: 'assistant', content: event.transcript, timestamp: new Date() };
          setMessages(prev => [...prev, assistantMessage]);
        }
        break;
    }
  };

  const disconnectVoice = () => {
    if (dataChannelRef.current) dataChannelRef.current.close();
    if (peerConnectionRef.current) peerConnectionRef.current.close();
    if (localStreamRef.current) localStreamRef.current.getTracks().forEach(track => track.stop());
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') audioContextRef.current.close();
    
    peerConnectionRef.current = null;
    dataChannelRef.current = null;
    localStreamRef.current = null;
    
    setVoiceConnected(false);
    setIsVoiceMode(false);
    setIsListening(false);
    setIsSpeaking(false);
  };

  // ============================================
  // TEXT FUNCTIONS
  // ============================================

  const startJournal = async (mode: 'freeflow' | 'guided' | 'quick') => {
    setJournalMode(mode);
    setIsLoading(true);

    const modePrompts = {
      freeflow: "I want to do free flow journaling tonight - let me just share what's on my mind.",
      guided: "Guide me through my evening reflection with your questions.",
      quick: "I only have a few minutes tonight - let's do a quick check-in.",
    };

    try {
      const response = await fetch('/api/journal/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: modePrompts[mode] }] }),
      });

      const data = await response.json();
      setDaySummary(data.daySummary);

      setMessages([
        { role: 'user', content: modePrompts[mode], timestamp: new Date() },
        { role: 'assistant', content: data.response, timestamp: new Date(), options: data.options },
      ]);
    } catch (error) {
      console.error('Error starting journal:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (messageText?: string) => {
    const textToSend = messageText || input.trim();
    if (!textToSend || isLoading) return;

    const userMessage: Message = { role: 'user', content: textToSend, timestamp: new Date() };

    setMessages(prev => prev.map(m => ({ ...m, options: null })));
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    if (inputRef.current) inputRef.current.style.height = 'auto';

    try {
      const response = await fetch('/api/journal/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await response.json();

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        options: data.options,
      }]);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px';
  };

  const saveJournal = async () => {
    setIsSaving(true);
    
    const transcript = messages
      .map(m => `${m.role === 'user' ? 'Me' : 'Pulse'}: ${m.content}`)
      .join('\n\n');

    const xpAmount = journalMode === 'quick' ? 25 : 50;

    try {
      const response = await fetch('/api/journal/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save',
          journalData: {
            title: `Evening Reflection - ${new Date().toLocaleDateString()}`,
            mode: journalMode === 'freeflow' ? 'Free Flow' : journalMode === 'guided' ? 'Guided' : 'Quick',
            transcript,
            streak: (daySummary?.reflectionStreak || 0) + 1,
            xpEarned: xpAmount,
          },
        }),
      });
      
      const data = await response.json();
      
      // 🎉 Show XP Toast!
      showXPToast({
        amount: data.xp?.amount || xpAmount,
        category: data.xp?.category || "DXP",
        activity: "Journal entry saved",
        wasCrit: data.xp?.wasCrit || false,
        critMultiplier: data.xp?.critMultiplier,
      });
      
      // Disconnect voice if connected
      if (isVoiceMode) disconnectVoice();
      
      setShowSaveModal(true);
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-indigo-950/30 to-gray-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800/50 bg-gray-900/30 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Dashboard</span>
          </Link>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Moon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-white font-semibold">Evening Journal</h1>
              <p className="text-xs text-gray-500">{dateStr}</p>
            </div>
          </div>
          
          {messages.length > 2 && (
            <button
              onClick={saveJournal}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white text-sm font-medium hover:from-green-500 hover:to-emerald-500 transition-all"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </button>
          )}
          
          {messages.length <= 2 && <div className="w-20" />}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6">
          
          {/* Mode Selection */}
          {journalMode === 'select' && (
            <div className="flex flex-col items-center justify-center min-h-[70vh] text-center">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/20">
                <Sparkles className="w-12 h-12 text-white" />
              </div>
              
              <h2 className="text-3xl font-bold text-white mb-2">Good Evening</h2>
              <p className="text-gray-400 max-w-md mb-8">
                Time to reflect on your day and capture your growth.
              </p>
              
              <p className="text-gray-500 text-sm mb-6">How would you like to journal tonight?</p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-2xl">
                <button
                  onClick={() => startJournal('freeflow')}
                  className="group p-6 rounded-2xl bg-gray-800/50 border border-gray-700 hover:bg-gray-800 hover:border-indigo-500/50 transition-all text-left"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-white font-semibold mb-2">Free Flow</h3>
                  <p className="text-gray-400 text-sm">Just talk. I'll listen and help you process.</p>
                </button>
                
                <button
                  onClick={() => startJournal('guided')}
                  className="group p-6 rounded-2xl bg-gray-800/50 border border-gray-700 hover:bg-gray-800 hover:border-indigo-500/50 transition-all text-left"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Compass className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-white font-semibold mb-2">Guided Reflection</h3>
                  <p className="text-gray-400 text-sm">I'll ask thought-provoking questions.</p>
                </button>
                
                <button
                  onClick={() => startJournal('quick')}
                  className="group p-6 rounded-2xl bg-gray-800/50 border border-gray-700 hover:bg-gray-800 hover:border-indigo-500/50 transition-all text-left"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-white font-semibold mb-2">Quick Check-in</h3>
                  <p className="text-gray-400 text-sm">Just a few minutes to capture the essentials.</p>
                </button>
              </div>
            </div>
          )}

          {/* Conversation */}
          {journalMode !== 'select' && (
            <div className="space-y-6">
              {/* Day Summary Card */}
              {daySummary && messages.length <= 3 && (
                <div className="bg-gray-800/30 border border-gray-700/50 rounded-2xl p-4 mb-6">
                  <h3 className="text-sm font-medium text-gray-400 mb-3">Your Day at a Glance</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-white">{daySummary.completedTasks.length}</div>
                      <div className="text-xs text-gray-500">Tasks Done</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-400">{daySummary.habitsCompleted.length}</div>
                      <div className="text-xs text-gray-500">Habits ✓</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-blue-400">{daySummary.dealsProgress.length}</div>
                      <div className="text-xs text-gray-500">Deal Updates</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-amber-400">{daySummary.reflectionStreak || 0}🔥</div>
                      <div className="text-xs text-gray-500">Day Streak</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Messages */}
              {messages.filter(m => m.role === 'assistant' || messages.indexOf(m) > 0).map((message, index) => (
                <div key={index}>
                  <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[80%] ${
                        message.role === 'user'
                          ? 'bg-gradient-to-br from-indigo-600 to-purple-700 text-white rounded-2xl rounded-br-sm'
                          : 'bg-gray-800/70 text-gray-100 rounded-2xl rounded-bl-sm'
                      } px-4 py-3`}
                    >
                      {message.role === 'assistant' && (
                        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-700/50">
                          <PulseFace size={28} speaking={isSpeaking && index === messages.length - 1} listening={isListening} />
                          <span className="text-xs text-indigo-400 font-medium">Pulse</span>
                        </div>
                      )}
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</div>
                    </div>
                  </div>
                  
                  {/* Options */}
                  {message.role === 'assistant' && message.options && !isLoading && !isVoiceMode && (
                    <div className="flex flex-wrap justify-start mt-3 ml-4 gap-2">
                      {message.options.map((option) => (
                        <button
                          key={option.id}
                          onClick={() => sendMessage(option.value)}
                          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                            option.id === 'yes' || option.label.toLowerCase().includes('yes') || option.label.toLowerCase().includes('save')
                              ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-500'
                              : option.id === 'no' || option.label.toLowerCase().includes('no')
                              ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                              : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-500'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-800/70 rounded-2xl rounded-bl-sm px-4 py-3">
                    <div className="flex items-center gap-2 text-gray-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Reflecting...</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      {journalMode !== 'select' && (
        <div className="border-t border-gray-800/50 bg-gray-900/50 backdrop-blur-sm sticky bottom-0">
          <div className="max-w-4xl mx-auto px-4 py-4">
            
            {/* Voice Mode Active */}
            {isVoiceMode && (
              <div className="flex items-center justify-between mb-3 px-2">
                <div className="flex items-center gap-3">
                  <PulseFace size={40} speaking={isSpeaking} listening={isListening} />
                  <div>
                    <p className={`text-sm font-medium ${isListening ? 'text-green-400' : isSpeaking ? 'text-cyan-400' : 'text-gray-400'}`}>
                      {isListening ? 'Listening...' : isSpeaking ? 'Speaking...' : 'Ready — just speak'}
                    </p>
                    <p className="text-xs text-gray-500">Voice journaling active</p>
                  </div>
                </div>
                <button
                  onClick={disconnectVoice}
                  className="px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm transition-colors"
                >
                  Switch to Text
                </button>
              </div>
            )}
            
            {/* Text Input with Voice Toggle */}
            {!isVoiceMode && (
              <div className="flex items-end gap-3">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Share your thoughts..."
                  rows={1}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none text-sm"
                  style={{ minHeight: '48px', maxHeight: '150px' }}
                />
                
                {/* Voice Toggle Button */}
                <button
                  onClick={connectVoice}
                  className="p-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-500 transition-all"
                  title="Switch to voice"
                >
                  <Mic className="w-5 h-5" />
                </button>
                
                {/* Send Button */}
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || isLoading}
                  className={`p-3 rounded-xl transition-all ${
                    input.trim() && !isLoading
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20'
                      : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Save Success Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-md w-full text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Reflection Saved!</h3>
            <p className="text-gray-400 mb-2">+{journalMode === 'quick' ? 25 : 50} XP earned</p>
            {daySummary && (
              <p className="text-amber-400 text-sm mb-6">🔥 {(daySummary.reflectionStreak || 0) + 1} day streak!</p>
            )}
            <p className="text-gray-500 text-sm mb-6">Your reflection has been saved to your Second Brain.</p>
            <div className="flex gap-3">
              <Link href="/" className="flex-1 px-4 py-3 rounded-xl bg-gray-800 text-white font-medium hover:bg-gray-700 transition-colors">
                Dashboard
              </Link>
              <Link href="/journal/history" className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium hover:from-indigo-500 transition-colors">
                View Journal
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
