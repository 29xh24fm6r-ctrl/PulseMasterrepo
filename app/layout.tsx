import type { Metadata, Viewport } from "next";
import { isBuildPhase, assertServerEnv } from "@/lib/env/guard";

// ❌ REMOVE this if it exists at module scope:
// assertServerEnv();

// ClerkProvider handled by ClerkProviderSafe
import { ClerkProviderSafe } from "@/components/auth/ClerkProviderSafe";
import PulseContextTracker from "@/components/companion/PulseContextTracker"; // Global Context Tracker
import { AppShell } from "@/components/shell/AppShell"; // ✅ Strict AppShell

import { OverlayProvider } from "@/components/shell/overlays/OverlayContext";
import PulseRuntimeRoot from "@/components/runtime/PulseRuntimeRoot";

import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { UserProviderSafe } from "@/components/auth/UserProviderSafe";
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
  // ✅ Optional: runtime-only assertion (safe)
  // We wrap this in try-catch so the LAYOUT never crashes.
  // This ensures /sign-in can always render even if envs are missing.
  try {
    if (!isBuildPhase()) {
      assertServerEnv();
    }
  } catch (e) {
    console.warn("⚠️ [Pulse] Environment assertion failed in RootLayout (safe-fail for sign-in):", e);
    // We swallow the error here so the UI can render.
    // Deep runtime features will fail naturally later if they need the keys.
  }

  return (
    <ClerkProviderSafe>
      <html lang="en">
        <head>
          <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        </head>
        <body className={`${inter.className} bg-zinc-950 text-slate-100 overflow-hidden`}>
          <Providers>
            <UserProviderSafe>
              <ToastProvider>
                <OverlayProvider>
                  <PulseRuntimeRoot>
                    <AppShell>
                      {children}
                      <PulseContextTracker />
                      <ServiceWorkerRegistration />
                    </AppShell>
                  </PulseRuntimeRoot>
                </OverlayProvider>
                {/* Visual Observer logic moved to /observer, persistent logic via providers */}
                <ObserverMount />
              </ToastProvider>
            </UserProviderSafe>
          </Providers>
        </body>
      </html>
    </ClerkProviderSafe>
  );
}