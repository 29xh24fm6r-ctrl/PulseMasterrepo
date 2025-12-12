// World Gateway Hero - Full Screen Immersive Entry
// app/components/master-dashboard/WorldGatewayHero.tsx

"use client";

import React from "react";
import { motion } from "framer-motion";
import { PulseOrb } from "./PulseOrb";
import { SystemArcs } from "./SystemArcs";
import { colors } from "@/design-system";
import { Button } from "@/components/ui/button";

interface WorldGatewayHeroProps {
  userName?: string;
  emotion?: string | null;
  emotionIntensity?: number;
  xpTotal?: number;
  focusScore?: number;
}

export function WorldGatewayHero({
  userName,
  emotion,
  emotionIntensity = 0.5,
  xpTotal = 0,
  focusScore = 75,
}: WorldGatewayHeroProps) {
  const scrollToPanels = () => {
    document.getElementById("master-panels")?.scrollIntoView({ behavior: "smooth" });
  };

  // Get emotion-based accent color
  const getEmotionColor = () => {
    if (!emotion) return colors.accent.purple;
    const emotionKey = emotion.toLowerCase();
    if (emotionKey.includes("energized")) return colors.accent.orange;
    if (emotionKey.includes("calm")) return colors.accent.blue;
    if (emotionKey.includes("stressed")) return colors.accent.purple;
    return colors.accent.purple;
  };

  const accentColor = getEmotionColor();

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Atmospheric Background Layers */}
      <div className="absolute inset-0">
        {/* Gradient Bloom */}
        <div
          className="absolute inset-0 opacity-40"
          style={{
            background: `radial-gradient(ellipse at center, ${accentColor}20 0%, transparent 70%)`,
          }}
        />

        {/* Starfield Particles */}
        {[...Array(100)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0.2, 0.8, 0.2],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 3,
            }}
          />
        ))}

        {/* Animated Fog/Noise */}
        <motion.div
          className="absolute inset-0 opacity-10"
          animate={{
            backgroundPosition: ["0% 0%", "100% 100%"],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "linear",
          }}
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            backgroundSize: "200% 200%",
          }}
        />
      </div>

      {/* Pulsing Soft Light Behind Center */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        animate={{
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <div
          className="w-96 h-96 rounded-full blur-3xl"
          style={{
            background: `radial-gradient(circle, ${accentColor}40, transparent 70%)`,
          }}
        />
      </motion.div>

      {/* Central Content */}
      <div className="relative z-10 text-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
        >
          {/* Giant Title */}
          <h1 className="text-6xl md:text-8xl font-extrabold tracking-tight text-gray-900 mb-4">
            Welcome to Pulse OS{userName ? `, ${userName}` : ""}.
          </h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="text-2xl md:text-3xl text-gray-700 mb-12 max-w-3xl mx-auto leading-relaxed"
          >
            Your world. Your systems. Your growth. All in one place.
          </motion.p>

          {/* Central Orb + Arcs Container */}
          <div className="relative w-full max-w-4xl mx-auto mb-12">
            {/* System Arcs (behind orb) */}
            <SystemArcs
              emotion={emotion}
              xpTotal={xpTotal}
              focusScore={focusScore}
            />

            {/* Pulse Orb (center) */}
            <div className="relative z-10 flex justify-center">
              <PulseOrb emotion={emotion} emotionIntensity={emotionIntensity} />
            </div>
          </div>

          {/* Main CTA Button */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            <Button
              onClick={scrollToPanels}
              size="lg"
              className="px-12 py-6 text-xl font-bold rounded-full"
              style={{
                background: `linear-gradient(135deg, ${accentColor}, ${colors.accent.pink})`,
                color: "white",
                boxShadow: `0 10px 40px ${accentColor}40`,
              }}
            >
              Enter Your World
            </Button>
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div className="w-6 h-10 rounded-full border-2 border-gray-400 flex items-start justify-center p-2">
          <motion.div
            className="w-1 h-3 rounded-full bg-gray-400"
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </div>
      </motion.div>
    </div>
  );
}



