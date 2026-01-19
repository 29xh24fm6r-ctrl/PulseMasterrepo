import type { Metadata, Viewport } from "next";
import { isBuildPhase, assertServerEnv } from "@/lib/env/guard";

// ❌ REMOVE this if it exists at module scope:
// assertServerEnv();

// ClerkProvider handled by ClerkProviderSafe
import { ClerkProviderSafe } from "@/components/auth/ClerkProviderSafe";
import { PulseCompanionShell } from "@/components/companion/PulseCompanionShell";
import PulseContextTracker from "@/components/companion/PulseContextTracker"; // Global Context Tracker


import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { UserProvider } from "./providers/user-provider";
import ServiceWorkerRegistration from "./components/ServiceWorkerRegistration";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { PrimaryNav } from "@/components/nav/PrimaryNav";
import { WhisperFeed } from "@/components/WhisperFeed";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Pulse Life OS",
  description: "Your AI-powered Life Operating System",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Pulse",
  },
};

export const viewport: Viewport = {
  themeColor: "#7c3aed",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // ✅ Optional: runtime-only assertion (safe)
  if (!isBuildPhase()) {
    assertServerEnv();
  }

  return (
    <ClerkProviderSafe>
      <html lang="en">
        <head>
          <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        </head>
        <body className={`${inter.className} bg-zinc-950 text-slate-100 overflow-hidden`}>
          <Providers>
            <UserProvider>
              <ToastProvider>
                <div className="flex h-screen w-full bg-zinc-50 dark:bg-black">
                  <PrimaryNav />
                  <div className="flex-1 flex h-full overflow-hidden">
                    <main id="pulse-main" data-testid="pulse-app-shell" className="flex-1 h-full overflow-y-auto relative scrollbar-hide min-w-0">
                      {children}
                      <WhisperFeed />
                      <PulseContextTracker />
                      <ServiceWorkerRegistration />
                    </main>
                    <aside className="hidden xl:block w-[400px] border-l border-zinc-200 dark:border-white/10 p-4 shrink-0 bg-zinc-900/50">
                      <PulseCompanionShell ownerUserId={process.env.PULSE_DEV_USER_ID || "00000000-0000-0000-0000-000000000000"} />
                    </aside>
                  </div>
                </div>
              </ToastProvider>
            </UserProvider>
          </Providers>
        </body>
      </html>
    </ClerkProviderSafe>
  );
}