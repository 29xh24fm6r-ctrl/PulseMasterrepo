// Sidebar Navigation
// app/components/layout/SidebarNav.tsx

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home, 
  Compass, 
  Zap, 
  Network, 
  DollarSign, 
  MessageSquare, 
  Settings,
  Target,
  Sparkles,
  Plus,
  Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/today", label: "Today", icon: Calendar },
  { href: "/create", label: "Create", icon: Plus },
  { href: "/life", label: "Life", icon: Home },
  { href: "/strategy", label: "Strategy", icon: Compass },
  { href: "/simulation/paths", label: "Simulation", icon: Zap },
  { href: "/graph", label: "Graph", icon: Network },
  { href: "/finance", label: "Finance", icon: DollarSign },
  { href: "/coaches", label: "Coaches", icon: MessageSquare },
  { href: "/features", label: "Feature Hub", icon: Sparkles },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col">
      <div className="p-4 border-b border-zinc-800">
        <Link href="/life" className="flex items-center gap-2">
          <Target className="w-6 h-6 text-violet-400" />
          <span className="text-lg font-bold text-white">Pulse</span>
        </Link>
      </div>
      
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                isActive
                  ? "bg-violet-600/20 text-violet-400 border border-violet-600/30"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
              )}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}




