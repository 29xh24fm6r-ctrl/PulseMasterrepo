"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { UserButton } from "@clerk/nextjs";
import { ChevronDown, Home, Menu, X, Crown } from "lucide-react";

const NAV_GROUPS = [
  {
    id: 'home',
    label: 'Home',
    href: '/home',
    links: [],
  },
  {
    id: 'productivity',
    label: 'Productivity',
    href: '/productivity',
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
  {
    id: 'dojo',
    label: 'Dojo',
    href: '/philosophy-dojo',
    links: [],
  },
  {
    id: 'more',
    label: 'More',
    href: '/settings',
    links: [
      { href: "/xp", label: "XP", icon: "⚡" },
      { href: "/frontier", label: "Frontier", icon: "🚀" },
      { href: "/vault", label: "Vault", icon: "🔒" },
      { href: "/settings", label: "Settings", icon: "⚙️" },
    ],
  },
];

export function GlobalNav() {
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

  const isActive = (href: string) => pathname === href;

  return (
    <>
      {/* Desktop Nav */}
      <nav className="hidden md:block sticky top-0 z-50 bg-zinc-950/90 backdrop-blur-sm border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <Link href="/home" className="flex items-center gap-2 font-bold text-lg">
              <span className="text-2xl">⚡</span>
              <span className="bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">
                Pulse
              </span>
            </Link>

            {/* Nav Groups */}
            <div className="flex items-center gap-1">
              {NAV_GROUPS.map((group) => (
                group.links.length === 0 ? (
                  <Link
                    key={group.id}
                    href={group.href || '/'}
                    className={`flex items-center gap-1 px-3 py-2 text-sm transition-colors rounded-lg ${
                      isActive(group.href || '')
                        ? "bg-violet-600/20 text-violet-300"
                        : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                    }`}
                  >
                    {group.label}
                  </Link>
                ) : (
                  <div
                    key={group.id}
                    className="relative"
                    onMouseEnter={() => setOpenDropdown(group.id)}
                    onMouseLeave={() => setOpenDropdown(null)}
                  >
                    <div className={`flex items-center rounded-lg ${
                      isActive(group.href || '') || group.links.some((l) => isActive(l.href))
                        ? "bg-violet-600/20"
                        : "hover:bg-zinc-800"
                    }`}>
                      <Link
                        href={group.href || group.links[0]?.href || '/'}
                        className={`px-3 py-2 text-sm transition-colors ${
                          isActive(group.href || '') || group.links.some((l) => isActive(l.href))
                            ? "text-violet-300"
                            : "text-zinc-400 hover:text-white"
                        }`}
                      >
                        {group.label}
                      </Link>
                      <button className={`pr-2 py-2 ${
                        isActive(group.href || '') || group.links.some((l) => isActive(l.href))
                          ? "text-violet-300"
                          : "text-zinc-400 hover:text-white"
                      }`}>
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </div>

                    {openDropdown === group.id && (
                      <div className="absolute top-full left-0 mt-1 py-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl min-w-[180px]">
                        {group.links.map((link) => (
                          <Link
                            key={link.href}
                            href={link.href}
                            className={`flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                              isActive(link.href)
                                ? "bg-violet-600/20 text-violet-300"
                                : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                            }`}
                          >
                            <span>{link.icon}</span>
                            <span>{link.label}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )
              ))}
            </div>

            {/* Right side */}
            <div className="flex items-center gap-3">
              <Link
                href="/realtime-voice"
                className="px-3 py-1.5 bg-gradient-to-r from-violet-600 to-pink-600 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-1"
              >
                🎙️ Voice
              </Link>
              <div className="relative">
                <UserButton afterSignOutUrl="/sign-in" />
                {isPlusUser && (
                  <div className="absolute -top-1 -right-1 bg-amber-500 rounded-full p-0.5">
                    <Crown className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Nav */}
      <nav className="md:hidden sticky top-0 z-50 bg-zinc-950/90 backdrop-blur-sm border-b border-zinc-800">
        <div className="flex items-center justify-between px-4 h-14">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <span className="text-xl">⚡</span>
            <span className="bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">
              Pulse
            </span>
          </Link>

          <div className="flex items-center gap-3">
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
              className="p-2 hover:bg-zinc-800 rounded-lg"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="absolute top-14 left-0 right-0 bg-zinc-950 border-b border-zinc-800 max-h-[80vh] overflow-y-auto">
            <div className="p-4 space-y-4">
              <Link
                href="/"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-4 py-3 bg-zinc-900 rounded-xl"
              >
                <Home className="w-5 h-5" />
                <span>Dashboard</span>
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
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                          isActive(link.href)
                            ? "bg-violet-600/20 text-violet-300 border border-violet-500/30"
                            : "bg-zinc-900 text-zinc-400 hover:text-white"
                        }`}
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
                className="flex items-center justify-center gap-2 px-4 py-3 bg-zinc-800 rounded-xl font-medium"
              >
                🎙️ Voice Assistant
              </Link>
            </div>
          </div>
        )}
      </nav>
    </>
  );
}