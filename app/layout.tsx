import type { Metadata, Viewport } from "next";
import { assertServerEnv } from "@/lib/env/guard";

assertServerEnv();

import { ClerkProvider } from "@clerk/nextjs";

import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { UserProvider } from "./providers/user-provider";
// import { GlobalNav } from "@/components/GlobalNav"; // Deprecated
import { QuantumDock } from "@/components/navigation/QuantumDock";
import { OrbitalMind } from "@/components/navigation/OrbitalMind";
import ServiceWorkerRegistration from "./components/ServiceWorkerRegistration";
import { GlobalVoiceButton } from "@/components/GlobalVoiceButton";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { EncounterLayout } from "@/components/encounter/EncounterLayout";

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

import { WhisperFeed } from "@/components/WhisperFeed";
import { TheOrb } from "@/components/TheOrb";
import { OrbitalStream } from "@/components/ui/premium/OrbitalStream";



export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <head>
          <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        </head>
        <body className={`${inter.className} bg-zinc-950 text-slate-100 overflow-x-hidden`}>
          <Providers>
            <UserProvider>
              <ToastProvider>
                <EncounterLayout>
                  <TheOrb />
                  <QuantumDock />
                  <OrbitalMind />
                  <OrbitalStream />

                  {children}
                  <ServiceWorkerRegistration />
                  <GlobalVoiceButton />
                  <WhisperFeed />
                </EncounterLayout>
              </ToastProvider>
            </UserProvider>
          </Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}