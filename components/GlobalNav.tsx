"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { ChevronDown, Home, Menu, X, Crown } from "lucide-react";
import { buildNavSections } from "@/lib/features/nav";
import { iconForFeatureId } from "@/lib/features/nav-icons";

// Dynamically import UserButton to prevent hydration mismatch
// Using a more stable import pattern to avoid HMR issues
const UserButton = dynamic(
  async () => {
    const mod = await import("@clerk/nextjs");
    return { default: mod.UserButton };
  },
  { 
    ssr: false,
    loading: () => <div className="w-8 h-8 rounded-full bg-zinc-800 animate-pulse" />
  }
);

// Registry-driven navigation - no hardcoded routes

export function GlobalNav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [isPlusUser, setIsPlusUser] = useState(false);

  // Registry-driven navigation sections
  const [accessCtx, setAccessCtx] = useState<any>(null);
  const sections = useMemo(() => {
    if (!accessCtx) return buildNavSections({ visibility: "core+beta" });
    // Client-side gate evaluation (simplified - full eval would need server)
    // For now, just use basic sections; we'll enhance with lock states next
    return buildNavSections({ visibility: "core+beta" });
  }, [accessCtx]);

  useEffect(() => {
    // Fetch access context for client-side gating
    fetch("/api/access/me")
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.ctx) setAccessCtx(data.ctx);
      })
      .catch(() => {});
  }, []);

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

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname?.startsWith(href + "/");
  };

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

            {/* Registry-Driven Nav */}
            <div className="flex items-center gap-1">
              {sections.map((section) => {
                // For desktop, show first item as main link, rest in dropdown
                const firstItem = section.items[0];
                const restItems = section.items.slice(1);
                
                if (!firstItem) return null;

                const Icon = iconForFeatureId(firstItem.id);
                const sectionActive = section.items.some((it) => isActive(it.href));

                if (restItems.length === 0) {
                  // Single item - no dropdown
                  return (
                    <Link
                      key={firstItem.id}
                      href={firstItem.href}
                      className={`flex items-center gap-1 px-3 py-2 text-sm transition-colors rounded-lg ${
                        isActive(firstItem.href)
                          ? "bg-violet-600/20 text-violet-300"
                          : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {firstItem.label}
                      {firstItem.status === "beta" && (
                        <span className="ml-1 rounded-full bg-violet-500/20 px-1.5 py-0.5 text-[10px] text-violet-300">
                          BETA
                        </span>
                      )}
                    </Link>
                  );
                }

                // Multiple items - dropdown
                return (
                  <div
                    key={section.title}
                    className="relative"
                    onMouseEnter={() => setOpenDropdown(section.title)}
                    onMouseLeave={() => setOpenDropdown(null)}
                  >
                    <div className={`flex items-center rounded-lg ${
                      sectionActive
                        ? "bg-violet-600/20"
                        : "hover:bg-zinc-800"
                    }`}>
                      <Link
                        href={firstItem.href}
                        className={`flex items-center gap-1 px-3 py-2 text-sm transition-colors ${
                          sectionActive
                            ? "text-violet-300"
                            : "text-zinc-400 hover:text-white"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {firstItem.label}
                        {firstItem.status === "beta" && (
                          <span className="ml-1 rounded-full bg-violet-500/20 px-1.5 py-0.5 text-[10px] text-violet-300">
                            BETA
                          </span>
                        )}
                      </Link>
                      <button className={`pr-2 py-2 ${
                        sectionActive
                          ? "text-violet-300"
                          : "text-zinc-400 hover:text-white"
                      }`}>
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </div>

                    {openDropdown === section.title && (
                      <div className="absolute top-full left-0 mt-1 py-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl min-w-[180px]">
                        {restItems.map((item) => {
                          const ItemIcon = iconForFeatureId(item.id);
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              className={`flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                                isActive(item.href)
                                  ? "bg-violet-600/20 text-violet-300"
                                  : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                              }`}
                            >
                              <ItemIcon className="w-4 h-4" />
                              <span>{item.label}</span>
                              {item.status === "beta" && (
                                <span className="ml-auto rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] text-violet-300">
                                  BETA
                                </span>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Right side */}
            <div className="flex items-center gap-3">
              <Link
                href="/voice"
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
              {sections.map((section) => (
                <div key={section.title}>
                  <div className="text-xs text-zinc-500 uppercase tracking-wider px-4 mb-2">
                    {section.title}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {section.items.map((item) => {
                      const Icon = iconForFeatureId(item.id);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileOpen(false)}
                          className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                            isActive(item.href)
                              ? "bg-violet-600/20 text-violet-300 border border-violet-500/30"
                              : "bg-zinc-900 text-zinc-400 hover:text-white"
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span className="truncate">{item.label}</span>
                          {item.status === "beta" && (
                            <span className="ml-auto rounded-full bg-violet-500/20 px-1.5 py-0.5 text-[10px] text-violet-300">
                              BETA
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </nav>
    </>
  );
}