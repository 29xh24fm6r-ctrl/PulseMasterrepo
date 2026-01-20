import type { Metadata, Viewport } from "next";
import { isBuildPhase, assertServerEnv } from "@/lib/env/guard";

// ❌ REMOVE this if it exists at module scope:
// assertServerEnv();

// ClerkProvider handled by ClerkProviderSafe
import { ClerkProviderSafe } from "@/components/auth/ClerkProviderSafe";
import PulseContextTracker from "@/components/companion/PulseContextTracker"; // Global Context Tracker
import { AppShell } from "@/components/shell/AppShell"; // ✅ Strict AppShell

import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { UserProvider } from "./providers/user-provider";
import ServiceWorkerRegistration from "./components/ServiceWorkerRegistration";
import { ToastProvider } from "@/components/ui/ToastProvider";
import ObserverMount from "@/components/observer/ObserverMount";

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
                <AppShell>
                  {children}
                  <PulseContextTracker />
                  <ServiceWorkerRegistration />
                </AppShell>
                {/* Visual Observer logic moved to /observer, persistent logic via providers */}
                <ObserverMount />
              </ToastProvider>
            </UserProvider>
          </Providers>
        </body>
      </html>
    </ClerkProviderSafe>
  );
}