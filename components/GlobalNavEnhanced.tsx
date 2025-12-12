"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { UserButton } from "@clerk/nextjs";
import { ChevronDown, Home, Menu, X, Crown, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const NAV_GROUPS = [
  {
    id: 'home',
    label: 'Home',
    href: '/home',
    icon: '⚡',
    links: [],
  },
  {
    id: 'productivity',
    label: 'Productivity',
    href: '/productivity',
    icon: '⚡',
    links: [
      { href: "/productivity", label: "Flow Engine", icon: "⚡" },
      { href: "/tasks", label: "Tasks", icon: "✅" },
      { href: "/planner", label: "Day Planner", icon: "📅" },
      { href: "/pomodoro", label: "Focus Timer", icon: "🍅" },
      { href: "/goals", label: "Goals", icon: "🎯" },
    ],
  },
  {
    id: 'work',
    label: 'Work',
    href: '/work',
    icon: '💼',
    links: [
      { href: "/work", label: "Command Center", icon: "💼" },
      { href: "/deals", label: "Deals", icon: "💰" },
      { href: "/contacts", label: "Contacts", icon: "👥" },
      { href: "/follow-ups", label: "Follow-ups", icon: "📧" },
    ],
  },
  {
    id: 'wellness',
    label: 'Wellness',
    href: '/wellness',
    icon: '🧘',
    links: [
      { href: "/wellness", label: "Emotional Climate", icon: "🧘" },
      { href: "/emotions", label: "Emotions", icon: "😊" },
      { href: "/morning", label: "Morning Routine", icon: "🌅" },
      { href: "/journal", label: "Journal", icon: "📓" },
    ],
  },
  {
    id: 'growth',
    label: 'Growth',
    href: '/growth',
    icon: '✨',
    links: [
      { href: "/growth", label: "The Dojo", icon: "✨" },
      { href: "/identity", label: "Identity", icon: "🔮" },
      { href: "/habits", label: "Habits", icon: "🔥" },
      { href: "/achievements", label: "Achievements", icon: "🏆" },
    ],
  },
  {
    id: 'strategy',
    label: 'Strategy',
    href: '/strategy',
    icon: '🧭',
    links: [
      { href: "/strategy", label: "War Room", icon: "🧭" },
      { href: "/life-intelligence/simulation", label: "Simulations", icon: "🔮" },
      { href: "/goals", label: "Goals", icon: "🎯" },
      { href: "/intelligence", label: "Insights", icon: "💡" },
    ],
  },
  {
    id: 'coaches',
    label: 'Coaches',
    href: '/coaches',
    icon: '🧠',
    links: [
      { href: "/coaches", label: "Coaches Corner", icon: "🧠" },
      { href: "/deal-coach", label: "Deal Coach", icon: "💰" },
      { href: "/career-coach", label: "Career Coach", icon: "💼" },
      { href: "/roleplay-coach", label: "Roleplay Coach", icon: "🎭" },
      { href: "/motivation", label: "Motivational Coach", icon: "✨" },
      { href: "/confidant", label: "Confidant", icon: "💬" },
      { href: "/wellness", label: "Wellness Coach", icon: "🧘" },
      { href: "/productivity", label: "Executive Function Coach", icon: "🧠" },
      { href: "/philosophy-dojo", label: "Philosophy Dojo", icon: "⚔️" },
    ],
  },
];

export function GlobalNavEnhanced() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [isPlusUser, setIsPlusUser] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.profile?.plan === "plus") {
          setIsPlusUser(true);
        }
      })
      .catch(() => {});
  }, []);

  if (pathname?.startsWith("/sign-in") || pathname?.startsWith("/sign-up") || pathname === "/jarvis") {
    return null;
  }

  const isActive = (href: string) => pathname === href || pathname?.startsWith(href + "/");

  return (
    <>
      {/* Desktop Nav */}
      <nav className="hidden md:block sticky top-0 z-50 glass border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/home" className="flex items-center gap-2 group">
              <motion.div
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.6 }}
                className="relative"
              >
                <Sparkles className="w-6 h-6 text-violet-400" />
                <motion.div
                  className="absolute inset-0 bg-violet-400 rounded-full blur-lg opacity-0 group-hover:opacity-50"
                  animate={{ scale: [1, 1.5, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </motion.div>
              <span className="text-xl font-bold gradient-text">
                Pulse
              </span>
            </Link>

            {/* Nav Groups */}
            <div className="flex items-center gap-1">
              {NAV_GROUPS.map((group, index) => (
                group.links.length === 0 ? (
                  <Link
                    key={group.id}
                    href={group.href || '/'}
                    className={cn(
                      "relative flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all rounded-xl",
                      isActive(group.href || '')
                        ? "text-white bg-white/10"
                        : "text-zinc-400 hover:text-white hover:bg-white/5"
                    )}
                  >
                    {isActive(group.href || '') && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 bg-gradient-to-r from-violet-500/20 to-pink-500/20 rounded-xl border border-violet-500/30"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    <span className="relative z-10">{group.icon}</span>
                    <span className="relative z-10">{group.label}</span>
                  </Link>
                ) : (
                  <div
                    key={group.id}
                    className="relative"
                    onMouseEnter={() => setOpenDropdown(group.id)}
                    onMouseLeave={() => setOpenDropdown(null)}
                  >
                    <div className={cn(
                      "relative flex items-center rounded-xl transition-all",
                      (isActive(group.href || '') || group.links.some((l) => isActive(l.href)))
                        ? "bg-white/10"
                        : "hover:bg-white/5"
                    )}>
                      <Link
                        href={group.href || group.links[0]?.href || '/'}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors relative z-10",
                          (isActive(group.href || '') || group.links.some((l) => isActive(l.href)))
                            ? "text-white"
                            : "text-zinc-400 hover:text-white"
                        )}
                      >
                        <span>{group.icon}</span>
                        <span>{group.label}</span>
                      </Link>
                      <button className={cn(
                        "pr-3 py-2 relative z-10 transition-transform",
                        openDropdown === group.id && "rotate-180"
                      )}>
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>

                    <AnimatePresence>
                      {openDropdown === group.id && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2 }}
                          className="absolute top-full left-0 mt-2 py-2 glass-strong rounded-2xl shadow-2xl min-w-[220px] border border-white/10"
                        >
                          {group.links.map((link, linkIndex) => (
                            <motion.div
                              key={link.href}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: linkIndex * 0.03 }}
                            >
                              <Link
                                href={link.href}
                                className={cn(
                                  "flex items-center gap-3 px-4 py-2.5 text-sm transition-colors relative",
                                  isActive(link.href)
                                    ? "text-white bg-white/10"
                                    : "text-zinc-300 hover:text-white hover:bg-white/5"
                                )}
                              >
                                <span className="text-lg">{link.icon}</span>
                                <span>{link.label}</span>
                                {isActive(link.href) && (
                                  <motion.div
                                    layoutId="activeLink"
                                    className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-violet-400 to-pink-400 rounded-r-full"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                  />
                                )}
                              </Link>
                            </motion.div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              ))}
            </div>

            {/* Right side */}
            <div className="flex items-center gap-3">
              <Link
                href="/realtime-voice"
                className="relative px-4 py-2 bg-gradient-to-r from-violet-600 to-pink-600 rounded-xl text-sm font-medium hover:opacity-90 transition-all hover:scale-105 hover:shadow-lg hover:shadow-violet-500/50 flex items-center gap-2 overflow-hidden group"
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-violet-400 to-pink-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  animate={{ x: ["-100%", "100%"] }}
                  transition={{ duration: 2, repeat: Infinity, repeatType: "loop" }}
                />
                <span className="relative z-10">🎙️ Voice</span>
              </Link>
              <div className="relative">
                <UserButton afterSignOutUrl="/sign-in" />
                {isPlusUser && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full p-1"
                  >
                    <Crown className="w-3 h-3 text-white" />
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Nav */}
      <nav className="md:hidden sticky top-0 z-50 glass border-b border-white/10">
        <div className="flex items-center justify-between px-4 h-14">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <Sparkles className="w-5 h-5 text-violet-400" />
            <span className="gradient-text">Pulse</span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/jarvis"
              className="p-2 bg-gradient-to-r from-violet-600 to-pink-600 rounded-lg"
            >
              🎙️
            </Link>
            <div className="relative">
              <UserButton afterSignOutUrl="/sign-in" />
              {isPlusUser && (
                <div className="absolute -top-1 -right-1 bg-amber-500 rounded-full p-0.5">
                  <Crown className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2 hover:bg-white/10 rounded-lg"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden glass-strong border-t border-white/10"
            >
              <div className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
                <Link
                  href="/"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 glass rounded-xl"
                >
                  <Home className="w-5 h-5 text-violet-400" />
                  <span className="font-medium">Dashboard</span>
                </Link>

                {NAV_GROUPS.map((group) => (
                  <div key={group.id}>
                    <div className="text-xs text-zinc-500 uppercase tracking-wider px-4 mb-2">
                      {group.label}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {group.links.map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={() => setMobileOpen(false)}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-colors",
                            isActive(link.href)
                              ? "glass text-violet-300 border border-violet-500/30"
                              : "glass text-zinc-400 hover:text-white"
                          )}
                        >
                          <span>{link.icon}</span>
                          <span className="truncate">{link.label}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}

                <Link
                  href="/voice"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-violet-600 to-pink-600 rounded-xl font-medium"
                >
                  🎙️ Voice Assistant
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </>
  );
}

