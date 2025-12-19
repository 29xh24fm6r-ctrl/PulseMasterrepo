// Pulse City Visualization Page
// app/experiences/city/page.tsx

"use client";

import { useState, useEffect } from "react";
import { getWorkCortexContextForUser } from "@/lib/cortex/context";
import { generateCity, CityState } from "@/lib/city/city-generator";
import { LoadingState } from "@/components/ui/LoadingState";
import { motion } from "framer-motion";

export default function PulseCityPage() {
  const [cityState, setCityState] = useState<CityState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCity();
    // Update city every 30 seconds
    const interval = setInterval(loadCity, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadCity() {
    setLoading(true);
    try {
      // Get userId from auth
      const userId = "user_123"; // Would get from auth
      const ctx = await getWorkCortexContextForUser(userId);
      const city = generateCity(ctx);
      setCityState(city);
    } catch (err) {
      console.error("Failed to load city:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <LoadingState message="Generating your Pulse City..." />;
  }

  if (!cityState) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-lg font-semibold text-text-primary mb-2">
            Failed to generate city
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen bg-gradient-to-b from-surface1 via-surface2 to-surface1 overflow-hidden">
      {/* City Visualization - Using CSS 3D as placeholder for Three.js */}
      <div className="absolute inset-0 perspective-1000">
        {/* Central Tower */}
        <motion.div
          className="absolute bottom-0 left-1/2 transform -translate-x-1/2"
          style={{
            width: "20px",
            height: `${cityState.centralTower.height * 2}px`,
            background: `linear-gradient(to top, rgb(139, 92, 246), rgb(59, 130, 246))`,
            boxShadow: cityState.centralTower.glow > 0.5
              ? `0 0 40px rgba(139, 92, 246, ${cityState.centralTower.glow})`
              : "none",
          }}
          animate={{
            boxShadow: [
              `0 0 40px rgba(139, 92, 246, ${cityState.centralTower.glow})`,
              `0 0 60px rgba(139, 92, 246, ${cityState.centralTower.glow * 1.2})`,
              `0 0 40px rgba(139, 92, 246, ${cityState.centralTower.glow})`,
            ],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Buildings */}
        {cityState.buildings.map((building) => (
          <motion.div
            key={building.id}
            className="absolute bottom-0"
            style={{
              left: `calc(50% + ${building.x * 2}px)`,
              transform: `translateZ(${building.z * 2}px)`,
              width: "10px",
              height: `${building.height * 2}px`,
              background: building.color,
              boxShadow: building.glow ? `0 0 20px ${building.color}80` : "none",
            }}
            animate={{
              height: building.type === "relationship" && building.windows.some((w) => w.lit)
                ? [`${building.height * 2}px`, `${building.height * 2.1}px`, `${building.height * 2}px`]
                : `${building.height * 2}px`,
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            title={building.name}
          />
        ))}

        {/* XP Rivers */}
        {cityState.rivers.map((river) => (
          <motion.div
            key={river.id}
            className="absolute bottom-0"
            style={{
              left: `calc(50% + ${river.x * 2}px)`,
              width: `${river.width}px`,
              height: "4px",
              background: `linear-gradient(90deg, transparent, rgb(6, 182, 212), transparent)`,
              boxShadow: river.glow > 0.3 ? `0 0 10px rgba(6, 182, 212, ${river.glow})` : "none",
            }}
            animate={{
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}

        {/* Opportunity Trees */}
        {cityState.trees.map((tree) => (
          <motion.div
            key={tree.id}
            className="absolute bottom-0 w-4 h-4 rounded-full"
            style={{
              left: `calc(50% + ${tree.x * 2}px)`,
              transform: `translateZ(${tree.z * 2}px)`,
              background: tree.bloom > 0.7 ? "rgb(34, 197, 94)" : "rgb(113, 113, 122)",
            }}
            animate={{
              scale: tree.bloom > 0.7 ? [1, 1.2, 1] : 1,
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}

        {/* Smog/Clouds */}
        {cityState.weather.clouds.map((cloud, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-zinc-600"
            style={{
              left: `calc(50% + ${cloud.x * 2}px)`,
              top: "20%",
              transform: `translateZ(${cloud.z * 2}px)`,
              width: `${cloud.size}px`,
              height: `${cloud.size}px`,
              opacity: cloud.opacity,
            }}
            animate={{
              x: [0, 20, 0],
              opacity: [cloud.opacity, cloud.opacity * 0.5, cloud.opacity],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "linear",
              delay: i * 0.5,
            }}
          />
        ))}

        {/* Aurora (breakthrough) */}
        {cityState.skyline.aurora && (
          <motion.div
            className="absolute top-0 left-0 right-0 h-32"
            style={{
              background: "linear-gradient(180deg, rgba(6, 182, 212, 0.3), transparent)",
            }}
            animate={{
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        )}
      </div>

      {/* Info Overlay */}
      <div className="absolute top-4 left-4 p-4 bg-surface2/90 backdrop-blur-md rounded-lg border border-border-default">
        <div className="text-sm font-semibold text-text-primary mb-2">Pulse City</div>
        <div className="text-xs text-text-secondary space-y-1">
          <div>Buildings: {cityState.buildings.length}</div>
          <div>Central Tower: {Math.round(cityState.centralTower.height)}%</div>
          <div>Smog Level: {Math.round(cityState.weather.smog * 100)}%</div>
          {cityState.skyline.aurora && <div className="text-accent-cyan">✨ Breakthrough Active</div>}
        </div>
      </div>
    </div>
  );
}



