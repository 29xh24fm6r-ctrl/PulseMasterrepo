"use client";

import React from "react";
import { motion } from "framer-motion";
import { colors, scenes, getSceneConfig, SceneKey, typography, shadows } from "@/design-system";
import { Button } from "@/components/ui/button";

interface HeroSceneProps {
  sceneKey: SceneKey | string;
  userName?: string;
  insight?: string;
  stats?: Array<{ label: string; value: string | number; icon?: string }>;
  ctaLabel?: string;
  ctaAction?: () => void;
  emotion?: string | null;
}

export function HeroScene({
  sceneKey,
  userName,
  insight,
  stats = [],
  ctaLabel,
  ctaAction,
  emotion,
}: HeroSceneProps) {
  const scene = getSceneConfig(sceneKey);
  const emotionColors = emotion
    ? colors.emotion[emotion as keyof typeof colors.emotion] || colors.emotion.calm
    : colors.emotion.calm;

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="relative overflow-hidden rounded-3xl mb-8"
      style={{
        background: scene.gradient,
        boxShadow: shadows.z3.glow,
      }}
    >
      {/* Floating particles background */}
      <div className="absolute inset-0 opacity-30">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.3, 0.8, 0.3],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Background pattern */}
      <div className="absolute inset-0 opacity-20">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)`,
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      {/* Moving gradient overlay */}
      <motion.div
        className="absolute inset-0 opacity-10"
        animate={{
          background: [
            "radial-gradient(circle at 20% 50%, rgba(255,255,255,0.2) 0%, transparent 50%)",
            "radial-gradient(circle at 80% 50%, rgba(255,255,255,0.2) 0%, transparent 50%)",
            "radial-gradient(circle at 20% 50%, rgba(255,255,255,0.2) 0%, transparent 50%)",
          ],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative z-10 p-8 md:p-12">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          {/* Left: Greeting & Insight */}
          <div className="flex-1">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-center gap-3 mb-4"
            >
              <span className="text-4xl">{scene.icon}</span>
              <div>
                <h1
                  className="text-white font-bold mb-1"
                  style={{ fontSize: typography.fontSize["3xl"] }}
                >
                  {getGreeting()}, {userName || "there"}
                </h1>
                <p className="text-white/80 text-lg">{scene.name}</p>
                <p className="text-white/60 text-sm mt-1">Your life at a glance</p>
              </div>
            </motion.div>

            {insight && (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-white/90 text-lg md:text-xl max-w-2xl leading-relaxed"
              >
                {insight}
              </motion.p>
            )}

            {/* Stats chips */}
            {stats.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex flex-wrap gap-3 mt-6"
              >
                {stats.map((stat, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    className="px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm border border-white/30"
                  >
                    <div className="flex items-center gap-2">
                      {stat.icon && <span>{stat.icon}</span>}
                      <span className="text-white/90 text-sm font-medium">{stat.label}</span>
                      <span className="text-white font-bold">{stat.value}</span>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>

          {/* Right: CTA Button */}
          {ctaLabel && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
            >
              <Button
                onClick={ctaAction}
                size="lg"
                className="bg-white text-purple-600 hover:bg-white/90 font-semibold px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-all"
                style={{
                  boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
                }}
              >
                {ctaLabel || scene.heroCTA}
              </Button>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

