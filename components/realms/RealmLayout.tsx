// Realm Layout - AGI-era cockpit wrapper for realm pages
// components/realms/RealmLayout.tsx

"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Sparkles } from "lucide-react";
import { REALMS, RealmConfig } from "@/lib/realms/config";
import { Button } from "@/components/ui/button";
import { FloatingParticles } from "./FloatingParticles";

interface RealmLayoutProps {
  realmId: string;
  children: React.ReactNode;
}

export default function RealmLayout({ realmId, children }: RealmLayoutProps) {
  const router = useRouter();
  const realm: RealmConfig | undefined = REALMS[realmId];

  if (!realm) {
    return <div>Realm not found</div>;
  }

  return (
    <div
      className="relative min-h-screen w-full overflow-hidden text-white"
      style={{
        background: `radial-gradient(circle at top, ${realm.bgGradient[0]}, ${realm.bgGradient[1]}, ${realm.bgGradient[2]})`,
      }}
    >
      {/* Floating particles layer - client-only to avoid hydration mismatch */}
      <FloatingParticles />

      {/* Top HUD - Subtle nav */}
      <div className="absolute top-6 left-6 z-20">
        <Button
          variant="ghost"
          onClick={() => router.push("/")}
          className="text-white/70 hover:text-white hover:bg-white/10 backdrop-blur-md border border-white/10 bg-black/40"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Pulse Universe
        </Button>
      </div>

      {/* Realm Header */}
      <div className="absolute top-6 right-6 z-10 text-right">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-1"
        >
          <div className="flex items-center justify-end gap-2">
            <Sparkles className="w-5 h-5" style={{ color: realm.accentColor }} />
            <h1 className="text-2xl font-bold">{realm.label}</h1>
          </div>
          <p className="text-sm text-white/70">{realm.tagline}</p>
        </motion.div>
      </div>

      {/* Main realm canvas - only render wrapper if not life realm */}
      {realmId !== "life" ? (
        <div className="relative mx-auto mt-32 w-full max-w-7xl px-6 pb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl shadow-2xl p-10"
            style={{
              boxShadow: `0 20px 60px rgba(0,0,0,0.3), 0 0 0 1px ${realm.primaryColor}20 inset`,
            }}
          >
            {children}
          </motion.div>
        </div>
      ) : (
        // Life realm uses full-screen cockpit, no wrapper
        <>{children}</>
      )}
    </div>
  );
}

