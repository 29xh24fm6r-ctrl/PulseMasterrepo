import type { Metadata, Viewport } from "next";
import { isBuildPhase, assertServerEnv } from "@/lib/env/guard";

// ❌ REMOVE this if it exists at module scope:
// assertServerEnv();

import { ClerkProvider } from "@clerk/nextjs";

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
    <ClerkProvider>
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
                  <main className="flex-1 h-full overflow-y-auto relative scrollbar-hide">
                    {children}
                    <WhisperFeed />
                    <ServiceWorkerRegistration />
                  </main>
                </div>
              </ToastProvider>
            </UserProvider>
          </Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}