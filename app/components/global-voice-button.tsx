'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

// Compact Pulse Face
function PulseFace({ size = 120, speaking = false, listening = false }: { size?: number; speaking?: boolean; listening?: boolean }) {
  const [mouthOpen, setMouthOpen] = useState(0);

  useEffect(() => {
    if (speaking) {
      const interval = setInterval(() => setMouthOpen(Math.random() * 0.8 + 0.2), 80);
      return () => clearInterval(interval);
    }
    setMouthOpen(0);
  }, [speaking]);

  const glow = speaking ? 'rgba(34, 211, 238, 0.5)' : listening ? 'rgba(52, 211, 153, 0.5)' : 'rgba(99, 102, 241, 0.4)';
  const face = speaking ? '#0891b2' : listening ? '#10b981' : '#6366f1';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div className="absolute inset-0 rounded-full blur-lg" style={{ background: glow }} />
      <svg width={size} height={size} viewBox="0 0 100 100" className="relative z-10">
        <circle cx="50" cy="50" r="42" fill={face} />
        <ellipse cx="35" cy="42" rx="6" ry="8" fill="white" />
        <circle cx="36" cy="43" r="3" fill="#1e293b" />
        <ellipse cx="65" cy="42" rx="6" ry="8" fill="white" />
        <circle cx="66" cy="43" r="3" fill="#1e293b" />
        <path
          d={speaking && mouthOpen > 0.2 ? `M 35 65 Q 50 ${65 + mouthOpen * 10} 65 65` : 'M 35 65 Q 50 72 65 65'}
          fill={speaking ? 'rgba(255,255,255,0.9)' : 'none'}
          stroke="white"
          strokeWidth="2"
        />
      </svg>
    </div>
  );
}

export default function GlobalVoiceButton() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [userSpeaking, setUserSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [proactiveInsight, setProactiveInsight] = useState<string | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const frameRef = useRef<number | null>(null);
  const hasGreetedRef = useRef(false);

  useEffect(() => () => disconnect(), []);

  const monitor = useCallback(() => {
    if (!analyserRef.current) return;
    const data = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(data);
    const avg = data.reduce((a, b) => a + b, 0) / data.length / 255;
    setAudioLevel(avg);
    setUserSpeaking(avg > 0.05);
    frameRef.current = requestAnimationFrame(monitor);
  }, []);

  // Fetch proactive insights
  const fetchProactiveInsights = async () => {
    try {
      const res = await fetch('/api/pulse/proactive');
      const data = await res.json();
      if (data.success && data.insights?.length > 0) {
        return data.insights[0];
      }
      return null;
    } catch {
      return null;
    }
  };

  // Send proactive greeting
  const sendProactiveGreeting = async (insight: any) => {
    if (!dcRef.current || dcRef.current.readyState !== 'open') return;
    if (hasGreetedRef.current) return;
    
    hasGreetedRef.current = true;
    
    let greetingContext = '';
    
    if (insight) {
      switch (insight.type) {
        case 'overdue_tasks':
          greetingContext = `PROACTIVE: User has overdue tasks. "${insight.title}" - ${insight.message}. Greet briefly and mention this.`;
          break;
        case 'streak_risk':
          greetingContext = `PROACTIVE: Streak at risk! ${insight.title}. Give a friendly nudge.`;
          break;
        case 'cold_relationship':
          greetingContext = `PROACTIVE: ${insight.title}. Gently mention this relationship needs attention.`;
          break;
        case 'stale_deal':
          greetingContext = `PROACTIVE: ${insight.title}. Mention this deal could use attention.`;
          break;
        case 'celebration':
        case 'momentum':
          greetingContext = `PROACTIVE: Good news! ${insight.title}. Celebrate with enthusiasm!`;
          break;
        default:
          greetingContext = `PROACTIVE: ${insight.title}. Mention this briefly.`;
      }
    } else {
      greetingContext = `PROACTIVE: No urgent items. Greet warmly and ask what's on their mind.`;
    }
    
    dcRef.current.send(JSON.stringify({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text: `[SYSTEM: ${greetingContext}] Hey Pulse!` }]
      }
    }));
    
    dcRef.current.send(JSON.stringify({ type: 'response.create' }));
  };

  const connect = async () => {
    try {
      setConnectionState('connecting');
      hasGreetedRef.current = false;

      // Fetch insights while connecting
      const insightPromise = fetchProactiveInsights();

      const tokenRes = await fetch('/api/realtime/session', { method: 'POST' });
      if (!tokenRes.ok) throw new Error('Session failed');
      const { client_secret } = await tokenRes.json();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      ctxRef.current = new AudioContext();
      analyserRef.current = ctxRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      ctxRef.current.createMediaStreamSource(stream).connect(analyserRef.current);

      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      pc.ontrack = e => {
        const audio = new Audio();
        audio.srcObject = e.streams[0];
        audio.play();
      };

      stream.getAudioTracks().forEach(t => pc.addTrack(t, stream));

      const dc = pc.createDataChannel('oai-events');
      dcRef.current = dc;
      
      dc.onopen = async () => {
        setConnectionState('connected');
        monitor();
        
        const insight = await insightPromise;
        setProactiveInsight(insight?.title || null);
        
        setTimeout(() => sendProactiveGreeting(insight), 500);
      };
      
      dc.onmessage = e => handleEvent(JSON.parse(e.data));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdp = await fetch('https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${client_secret}`, 'Content-Type': 'application/sdp' },
        body: offer.sdp,
      });

      if (!sdp.ok) throw new Error('Connect failed');
      await pc.setRemoteDescription({ type: 'answer', sdp: await sdp.text() });

    } catch (err) {
      console.error(err);
      setConnectionState('disconnected');
    }
  };

  const executeAction = async (name: string, args: any) => {
    setLastAction(name);
    try {
      const res = await fetch('/api/pulse/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: name, args }),
      });
      const result = await res.json();
      
      if (result.navigate) {
        setTimeout(() => {
          disconnect();
          setIsOpen(false);
          router.push(result.navigate);
        }, 1500);
      }
      
      return result;
    } catch (err) {
      return { success: false };
    }
  };

  const handleEvent = async (event: any) => {
    switch (event.type) {
      case 'input_audio_buffer.speech_started':
        setUserSpeaking(true);
        setIsSpeaking(false);
        setLastAction(null);
        break;
      case 'input_audio_buffer.speech_stopped':
        setUserSpeaking(false);
        break;
      case 'conversation.item.input_audio_transcription.completed':
        setTranscript(event.transcript || '');
        break;
      case 'response.audio.delta':
        setIsSpeaking(true);
        break;
      case 'response.audio.done':
        setIsSpeaking(false);
        break;
      case 'response.audio_transcript.delta':
        setResponse(prev => prev + (event.delta || ''));
        break;
      case 'response.done':
        setIsSpeaking(false);
        for (const item of event.response?.output || []) {
          if (item.type === 'function_call') {
            try {
              const args = JSON.parse(item.arguments || '{}');
              const result = await executeAction(item.name, args);
              
              if (dcRef.current?.readyState === 'open') {
                dcRef.current.send(JSON.stringify({
                  type: 'conversation.item.create',
                  item: { type: 'function_call_output', call_id: item.call_id, output: JSON.stringify(result) }
                }));
                dcRef.current.send(JSON.stringify({ type: 'response.create' }));
              }
            } catch {}
          }
        }
        setTimeout(() => { setResponse(''); setTranscript(''); }, 3000);
        break;
    }
  };

  const disconnect = () => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    dcRef.current?.close();
    pcRef.current?.close();
    streamRef.current?.getTracks().forEach(t => t.stop());
    if (ctxRef.current?.state !== 'closed') ctxRef.current?.close();
    
    pcRef.current = null;
    dcRef.current = null;
    streamRef.current = null;
    hasGreetedRef.current = false;
    
    setConnectionState('disconnected');
    setIsSpeaking(false);
    setUserSpeaking(false);
    setTranscript('');
    setResponse('');
    setLastAction(null);
    setProactiveInsight(null);
  };

  const handleOpen = () => { setIsOpen(true); connect(); };
  const handleClose = () => { disconnect(); setIsOpen(false); };

  if (!isOpen) {
    return (
      <button
        onClick={handleOpen}
        className="fixed bottom-24 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg hover:scale-110 transition-all flex items-center justify-center"
      >
        <Mic className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-24 right-6 z-50">
      <div className="relative bg-gray-900/95 backdrop-blur-sm rounded-3xl p-5 shadow-2xl border border-gray-700/50 min-w-[200px]">
        <button onClick={handleClose} className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center text-white">
          <X className="w-4 h-4" />
        </button>

        <div className="flex justify-center">
          <PulseFace size={120} speaking={isSpeaking} listening={userSpeaking} />
        </div>

        <p className={`mt-3 text-sm font-medium text-center ${
          connectionState === 'connecting' ? 'text-amber-400' :
          isSpeaking ? 'text-cyan-400' :
          userSpeaking ? 'text-green-400' :
          'text-gray-400'
        }`}>
          {connectionState === 'connecting' ? 'Connecting...' :
           isSpeaking ? '' : userSpeaking ? '' : 'Listening...'}
        </p>

        {/* Proactive insight indicator */}
        {proactiveInsight && !response && connectionState === 'connected' && (
          <div className="mt-2 text-center">
            <span className="text-xs text-purple-400 bg-purple-500/20 px-2 py-1 rounded-full">
              🧠 {proactiveInsight.length > 25 ? proactiveInsight.substring(0, 25) + '...' : proactiveInsight}
            </span>
          </div>
        )}

        {lastAction && (
          <div className="mt-2 text-center">
            <span className="text-xs text-green-400">✓ {lastAction.replace('_', ' ')}</span>
          </div>
        )}

        {(transcript || response) && (
          <div className="mt-2 max-w-48 text-center">
            {transcript && <p className="text-gray-500 text-xs truncate">"{transcript}"</p>}
            {response && <p className="text-cyan-400 text-xs mt-1 line-clamp-2">{response}</p>}
          </div>
        )}

        {connectionState === 'connected' && (
          <div className="flex items-end gap-0.5 h-6 mt-3 justify-center">
            {[...Array(12)].map((_, i) => {
              const level = userSpeaking ? audioLevel : isSpeaking ? Math.random() * 0.4 : 0.02;
              return (
                <div
                  key={i}
                  className={`w-1 rounded-full ${userSpeaking ? 'bg-green-400' : isSpeaking ? 'bg-cyan-400' : 'bg-gray-600'}`}
                  style={{ height: `${Math.max(4, level * 100 * (Math.sin(i * 0.5) * 0.3 + 0.7))}%` }}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
