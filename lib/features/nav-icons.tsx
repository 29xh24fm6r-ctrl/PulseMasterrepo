"use client";

import {
  Home,
  Briefcase,
  Handshake,
  CheckSquare,
  Users,
  Sparkles,
  Settings,
  Mic,
  Shield,
  FlaskConical,
  Circle,
  Mail,
} from "lucide-react";

export function iconForFeatureId(id: string) {
  switch (id) {
    case "home":
      return Home;
    case "work":
      return Briefcase;
    case "deals":
      return Handshake;
    case "tasks":
      return CheckSquare;
    case "contacts":
      return Users;
    case "followups":
      return Mail;
    case "voice":
      return Mic;
    case "settings":
      return Settings;
    case "ops-reliability":
      return Shield;
    case "ops-dead-sweeper":
      return Shield;
    case "features":
      return Sparkles;
    default:
      return Circle;
  }
}

