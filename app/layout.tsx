import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { CommandPalette } from "./components/command-palette";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { UserProvider } from "./providers/user-provider";
import { GlobalNavEnhanced } from "@/components/GlobalNavEnhanced";
import ServiceWorkerRegistration from "./components/ServiceWorkerRegistration";
import { GlobalVoiceButton } from "@/components/GlobalVoiceButton";
import { CoachPanel } from "@/app/components/coaching/CoachPanel";
import { WelcomeFlow } from "@/app/components/onboarding/WelcomeFlow";
import { QuickActions } from "@/app/components/ui/QuickActions";

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
  return (
    <ClerkProvider>
      <html lang="en">
        <head>
          <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        </head>
        <body className={`${inter.className} bg-slate-950 text-slate-100`}>
          <Providers>
            <UserProvider>
              <GlobalNavEnhanced />
              <CommandPalette />
              {children}
              <ServiceWorkerRegistration />
              <GlobalVoiceButton />
              <CoachPanel />
              <WelcomeFlow />
              <QuickActions />
            </UserProvider>
          </Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}