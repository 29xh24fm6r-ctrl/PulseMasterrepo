'use client';

import { useEffect, useState } from 'react';

export type PulseEmotion = 
  | 'neutral'      // Default, calm presence
  | 'listening'    // Attentive, focused on user
  | 'thinking'     // Processing, contemplative
  | 'happy'        // Smiling, celebratory
  | 'excited'      // Big smile, energized
  | 'empathetic'   // Soft, understanding
  | 'concerned'    // Worried, caring
  | 'serious'      // Focused, strategic
  | 'determined'   // Strong, motivating
  | 'sad'          // Compassionate, heavy moment
  | 'surprised';   // Eyebrows up, wow moment

interface PulseFaceProps {
  emotion?: PulseEmotion;
  size?: number;
  speaking?: boolean;
  audioLevel?: number; // 0-1 for voice reactivity
}

export default function PulseFace({ 
  emotion = 'neutral', 
  size = 200,
  speaking = false,
  audioLevel = 0
}: PulseFaceProps) {
  const [blinking, setBlinking] = useState(false);
  const [mouthOpen, setMouthOpen] = useState(0);

  // Natural blinking
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      if (Math.random() > 0.7) {
        setBlinking(true);
        setTimeout(() => setBlinking(false), 150);
      }
    }, 2000);

    return () => clearInterval(blinkInterval);
  }, []);

  // Mouth movement when speaking
  useEffect(() => {
    if (speaking) {
      const mouthInterval = setInterval(() => {
        setMouthOpen(Math.random() * 0.8 + 0.2);
      }, 100);
      return () => clearInterval(mouthInterval);
    } else {
      setMouthOpen(0);
    }
  }, [speaking]);

  // Expression configurations
  const expressions: Record<PulseEmotion, {
    eyeShape: string;
    eyebrowY: number;
    eyebrowRotate: number;
    mouthPath: string;
    mouthFill: string;
    glowColor: string;
    faceColor: string;
  }> = {
    neutral: {
      eyeShape: 'ellipse',
      eyebrowY: 0,
      eyebrowRotate: 0,
      mouthPath: 'M 70 130 Q 100 140 130 130',
      mouthFill: 'none',
      glowColor: 'rgba(99, 102, 241, 0.4)',
      faceColor: 'url(#neutralGradient)',
    },
    listening: {
      eyeShape: 'ellipse',
      eyebrowY: -3,
      eyebrowRotate: 0,
      mouthPath: 'M 75 130 Q 100 135 125 130',
      mouthFill: 'none',
      glowColor: 'rgba(34, 211, 238, 0.5)',
      faceColor: 'url(#listeningGradient)',
    },
    thinking: {
      eyeShape: 'ellipse',
      eyebrowY: -2,
      eyebrowRotate: 5,
      mouthPath: 'M 85 132 Q 100 130 115 132',
      mouthFill: 'none',
      glowColor: 'rgba(251, 191, 36, 0.5)',
      faceColor: 'url(#thinkingGradient)',
    },
    happy: {
      eyeShape: 'happy',
      eyebrowY: -5,
      eyebrowRotate: -5,
      mouthPath: 'M 65 125 Q 100 155 135 125',
      mouthFill: 'none',
      glowColor: 'rgba(52, 211, 153, 0.5)',
      faceColor: 'url(#happyGradient)',
    },
    excited: {
      eyeShape: 'wide',
      eyebrowY: -10,
      eyebrowRotate: -8,
      mouthPath: 'M 60 120 Q 100 165 140 120 Q 100 145 60 120',
      mouthFill: 'rgba(255,255,255,0.9)',
      glowColor: 'rgba(251, 191, 36, 0.6)',
      faceColor: 'url(#excitedGradient)',
    },
    empathetic: {
      eyeShape: 'soft',
      eyebrowY: 3,
      eyebrowRotate: 8,
      mouthPath: 'M 75 132 Q 100 138 125 132',
      mouthFill: 'none',
      glowColor: 'rgba(167, 139, 250, 0.5)',
      faceColor: 'url(#empatheticGradient)',
    },
    concerned: {
      eyeShape: 'ellipse',
      eyebrowY: 5,
      eyebrowRotate: 12,
      mouthPath: 'M 75 135 Q 100 130 125 135',
      mouthFill: 'none',
      glowColor: 'rgba(251, 146, 60, 0.5)',
      faceColor: 'url(#concernedGradient)',
    },
    serious: {
      eyeShape: 'focused',
      eyebrowY: 2,
      eyebrowRotate: 3,
      mouthPath: 'M 75 132 L 125 132',
      mouthFill: 'none',
      glowColor: 'rgba(99, 102, 241, 0.5)',
      faceColor: 'url(#seriousGradient)',
    },
    determined: {
      eyeShape: 'focused',
      eyebrowY: 5,
      eyebrowRotate: -5,
      mouthPath: 'M 70 130 Q 100 138 130 130',
      mouthFill: 'none',
      glowColor: 'rgba(239, 68, 68, 0.4)',
      faceColor: 'url(#determinedGradient)',
    },
    sad: {
      eyeShape: 'soft',
      eyebrowY: 8,
      eyebrowRotate: 15,
      mouthPath: 'M 70 138 Q 100 125 130 138',
      mouthFill: 'none',
      glowColor: 'rgba(147, 197, 253, 0.5)',
      faceColor: 'url(#sadGradient)',
    },
    surprised: {
      eyeShape: 'wide',
      eyebrowY: -12,
      eyebrowRotate: 0,
      mouthPath: 'M 85 130 Q 100 145 115 130 Q 100 140 85 130',
      mouthFill: 'rgba(255,255,255,0.8)',
      glowColor: 'rgba(236, 72, 153, 0.5)',
      faceColor: 'url(#surprisedGradient)',
    },
  };

  const expr = expressions[emotion];
  const scale = size / 200;

  // Eye rendering based on shape
  const renderEyes = () => {
    const eyeY = blinking ? 75 : 70;
    const eyeHeight = blinking ? 2 : 
      expr.eyeShape === 'wide' ? 20 :
      expr.eyeShape === 'focused' ? 12 :
      expr.eyeShape === 'soft' ? 14 :
      expr.eyeShape === 'happy' ? 8 :
      16;
    
    const eyeCurve = expr.eyeShape === 'happy';

    if (eyeCurve) {
      // Happy curved eyes (like ^_^)
      return (
        <>
          <path
            d="M 55 75 Q 65 65 75 75"
            fill="none"
            stroke="white"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="M 125 75 Q 135 65 145 75"
            fill="none"
            stroke="white"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </>
      );
    }

    return (
      <>
        {/* Left eye */}
        <ellipse
          cx="65"
          cy={eyeY}
          rx="12"
          ry={eyeHeight}
          fill="white"
          className="transition-all duration-150"
        />
        {/* Left pupil */}
        {!blinking && (
          <circle
            cx="67"
            cy={eyeY + 2}
            r="6"
            fill="#1e293b"
            className="transition-all duration-200"
          />
        )}
        
        {/* Right eye */}
        <ellipse
          cx="135"
          cy={eyeY}
          rx="12"
          ry={eyeHeight}
          fill="white"
          className="transition-all duration-150"
        />
        {/* Right pupil */}
        {!blinking && (
          <circle
            cx="137"
            cy={eyeY + 2}
            r="6"
            fill="#1e293b"
            className="transition-all duration-200"
          />
        )}
      </>
    );
  };

  // Mouth with speaking animation
  const getMouthPath = () => {
    if (speaking && mouthOpen > 0.3) {
      const openAmount = mouthOpen * 15;
      return `M 70 130 Q 100 ${130 + openAmount} 130 130 Q 100 ${135 + openAmount * 0.5} 70 130`;
    }
    return expr.mouthPath;
  };

  return (
    <div 
      className="relative"
      style={{ width: size, height: size }}
    >
      {/* Outer glow */}
      <div 
        className="absolute inset-0 rounded-full blur-xl transition-all duration-500"
        style={{ 
          background: expr.glowColor,
          transform: `scale(${1.2 + audioLevel * 0.3})`,
        }}
      />
      
      {/* Secondary glow ring */}
      <div 
        className="absolute inset-2 rounded-full blur-md transition-all duration-300"
        style={{ 
          background: expr.glowColor,
          opacity: 0.5 + audioLevel * 0.5,
        }}
      />

      <svg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        className="relative z-10"
      >
        <defs>
          {/* Gradients for different emotions */}
          <radialGradient id="neutralGradient" cx="50%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#6366f1" />
          </radialGradient>
          
          <radialGradient id="listeningGradient" cx="50%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#0891b2" />
          </radialGradient>
          
          <radialGradient id="thinkingGradient" cx="50%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#f59e0b" />
          </radialGradient>
          
          <radialGradient id="happyGradient" cx="50%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#10b981" />
          </radialGradient>
          
          <radialGradient id="excitedGradient" cx="50%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#fcd34d" />
            <stop offset="100%" stopColor="#fbbf24" />
          </radialGradient>
          
          <radialGradient id="empatheticGradient" cx="50%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </radialGradient>
          
          <radialGradient id="concernedGradient" cx="50%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#fb923c" />
            <stop offset="100%" stopColor="#f97316" />
          </radialGradient>
          
          <radialGradient id="seriousGradient" cx="50%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#4f46e5" />
          </radialGradient>
          
          <radialGradient id="determinedGradient" cx="50%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#f87171" />
            <stop offset="100%" stopColor="#ef4444" />
          </radialGradient>
          
          <radialGradient id="sadGradient" cx="50%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#93c5fd" />
            <stop offset="100%" stopColor="#3b82f6" />
          </radialGradient>
          
          <radialGradient id="surprisedGradient" cx="50%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#f472b6" />
            <stop offset="100%" stopColor="#ec4899" />
          </radialGradient>

          {/* Face shadow */}
          <filter id="faceShadow">
            <feDropShadow dx="0" dy="4" stdDeviation="8" floodOpacity="0.3"/>
          </filter>
        </defs>

        {/* Face circle */}
        <circle
          cx="100"
          cy="100"
          r="85"
          fill={expr.faceColor}
          filter="url(#faceShadow)"
          className="transition-all duration-500"
        />

        {/* Highlight */}
        <ellipse
          cx="75"
          cy="60"
          rx="30"
          ry="20"
          fill="rgba(255,255,255,0.2)"
        />

        {/* Eyebrows */}
        <g className="transition-all duration-300">
          {/* Left eyebrow */}
          <path
            d={`M 45 ${55 + expr.eyebrowY} Q 65 ${50 + expr.eyebrowY} 80 ${55 + expr.eyebrowY}`}
            fill="none"
            stroke="rgba(255,255,255,0.8)"
            strokeWidth="3"
            strokeLinecap="round"
            transform={`rotate(${-expr.eyebrowRotate}, 65, ${55 + expr.eyebrowY})`}
            className="transition-all duration-300"
          />
          {/* Right eyebrow */}
          <path
            d={`M 120 ${55 + expr.eyebrowY} Q 135 ${50 + expr.eyebrowY} 155 ${55 + expr.eyebrowY}`}
            fill="none"
            stroke="rgba(255,255,255,0.8)"
            strokeWidth="3"
            strokeLinecap="round"
            transform={`rotate(${expr.eyebrowRotate}, 135, ${55 + expr.eyebrowY})`}
            className="transition-all duration-300"
          />
        </g>

        {/* Eyes */}
        {renderEyes()}

        {/* Mouth */}
        <path
          d={getMouthPath()}
          fill={speaking && mouthOpen > 0.3 ? 'rgba(255,255,255,0.9)' : expr.mouthFill}
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          className="transition-all duration-150"
        />

        {/* Cheek blush for happy/excited */}
        {(emotion === 'happy' || emotion === 'excited') && (
          <>
            <ellipse cx="45" cy="95" rx="12" ry="8" fill="rgba(251, 113, 133, 0.4)" />
            <ellipse cx="155" cy="95" rx="12" ry="8" fill="rgba(251, 113, 133, 0.4)" />
          </>
        )}

        {/* Tear for sad */}
        {emotion === 'sad' && (
          <ellipse cx="75" cy="95" rx="4" ry="6" fill="rgba(147, 197, 253, 0.6)">
            <animate
              attributeName="cy"
              values="95;110;95"
              dur="3s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0.6;0;0.6"
              dur="3s"
              repeatCount="indefinite"
            />
          </ellipse>
        )}

        {/* Sparkles for excited */}
        {emotion === 'excited' && (
          <>
            <circle cx="30" cy="40" r="3" fill="white">
              <animate attributeName="opacity" values="1;0;1" dur="1s" repeatCount="indefinite" />
            </circle>
            <circle cx="170" cy="50" r="2" fill="white">
              <animate attributeName="opacity" values="0;1;0" dur="1.2s" repeatCount="indefinite" />
            </circle>
            <circle cx="160" cy="35" r="2.5" fill="white">
              <animate attributeName="opacity" values="1;0;1" dur="0.8s" repeatCount="indefinite" />
            </circle>
          </>
        )}
      </svg>
    </div>
  );
}
