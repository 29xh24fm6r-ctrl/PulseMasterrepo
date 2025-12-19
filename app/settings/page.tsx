import Link from "next/link";
import { Settings, CreditCard, Mic, Users, GraduationCap, ChevronRight } from "lucide-react";

const cards = [
  { title: "Billing", desc: "Plan, usage, and payments.", href: "/settings/billing", icon: CreditCard },
  { title: "Personas", desc: "Assistant personas and styles.", href: "/settings/personas", icon: Users },
  { title: "Teaching", desc: "Teach Pulse your preferences.", href: "/settings/teaching", icon: GraduationCap },
  { title: "Voice Settings", desc: "Voice configuration and tuning.", href: "/voice-settings", icon: Mic },
];

export default function SettingsLanding() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 rounded-xl">
            <Settings className="w-7 h-7 text-violet-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-zinc-400">Everything that tunes your Pulse experience.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <Link
                key={c.href}
                href={c.href}
                className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 hover:bg-zinc-900 transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-zinc-800/60">
                      <Icon className="w-5 h-5 text-zinc-200" />
                    </div>
                    <div>
                      <div className="font-semibold">{c.title}</div>
                      <div className="text-sm text-zinc-400">{c.desc}</div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-zinc-500 mt-1" />
                </div>
              </Link>
            );
          })}
        </div>

        <div className="text-sm text-zinc-500">
          Tip: Use <span className="text-zinc-300 font-mono">/features</span> to see every feature and run health checks.
        </div>
      </div>
    </div>
  );
}
