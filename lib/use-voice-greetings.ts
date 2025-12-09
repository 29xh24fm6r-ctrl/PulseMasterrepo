"use client";

import { useState, useEffect, useCallback } from "react";
import { useAutonomy } from "@/lib/use-autonomy";

interface UseVoiceGreetingOptions {
  onGreetingReady?: (greeting: string) => void;
  skipFetch?: boolean;
}

/**
 * Hook to manage voice greetings based on autonomy settings
 * Returns greeting text and whether greetings are enabled
 */
export function useVoiceGreeting(options: UseVoiceGreetingOptions = {}) {
  const { shouldShowVoiceGreeting, settings } = useAutonomy();
  const [greeting, setGreeting] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const enabled = shouldShowVoiceGreeting();

  const fetchGreeting = useCallback(async () => {
    if (!enabled || options.skipFetch) {
      setGreeting(null);
      return null;
    }

    setLoading(true);
    try {
      // Fetch proactive insights to build greeting
      const res = await fetch("/api/pulse/proactive");
      if (res.ok) {
        const data = await res.json();
        const insights = data.insights || [];
        
        // Build greeting based on insights
        let greetingText = "";
        
        if (insights.length === 0) {
          greetingText = "Hey! Everything's looking good. What can I help you with?";
        } else {
          const highPriority = insights.filter((i: any) => i.priority === "high");
          const streakRisks = insights.filter((i: any) => i.type === "streak_risk");
          const celebrations = insights.filter((i: any) => i.type === "celebration");
          
          if (celebrations.length > 0) {
            greetingText = `Hey! ${celebrations[0].message} `;
          }
          
          if (highPriority.length > 0) {
            greetingText += `I noticed ${highPriority.length} thing${highPriority.length > 1 ? "s" : ""} that might need your attention. `;
          }
          
          if (streakRisks.length > 0) {
            greetingText += `Also, ${streakRisks.length} streak${streakRisks.length > 1 ? "s are" : " is"} at risk today. `;
          }
          
          if (!greetingText) {
            greetingText = `Hey! I've got ${insights.length} thing${insights.length > 1 ? "s" : ""} to share with you. `;
          }
          
          greetingText += "What would you like to focus on?";
        }
        
        setGreeting(greetingText);
        options.onGreetingReady?.(greetingText);
        return greetingText;
      }
    } catch (e) {
      console.error("Failed to fetch greeting:", e);
    } finally {
      setLoading(false);
    }
    
    return null;
  }, [enabled, options.skipFetch, options.onGreetingReady]);

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (enabled && !options.skipFetch) {
      fetchGreeting();
    }
  }, [enabled, options.skipFetch]);

  return {
    greeting,
    loading,
    enabled,
    fetchGreeting,
    autonomyLevel: settings.globalLevel,
    voiceGreetingsEnabled: settings.voiceGreetings,
  };
}

/**
 * Simple function to check if voice greeting should play
 * For use outside React components
 */
export function shouldPlayVoiceGreeting(): boolean {
  if (typeof window === "undefined") return true;
  
  try {
    const stored = localStorage.getItem("pulse-autonomy-settings");
    if (!stored) return true; // Default to enabled
    
    const settings = JSON.parse(stored);
    
    // Check zen mode
    if (settings.globalLevel === "zen") return false;
    
    // Check voice greetings setting
    if (!settings.voiceGreetings) return false;
    
    // Check quiet hours
    if (settings.quietHours?.enabled) {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      
      const [startH, startM] = settings.quietHours.start.split(":").map(Number);
      const [endH, endM] = settings.quietHours.end.split(":").map(Number);
      
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;
      
      if (startMinutes > endMinutes) {
        if (currentMinutes >= startMinutes || currentMinutes < endMinutes) return false;
      } else {
        if (currentMinutes >= startMinutes && currentMinutes < endMinutes) return false;
      }
    }
    
    return true;
  } catch {
    return true; // Default to enabled on error
  }
}