import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { UserProvider } from "./providers/user-provider";
import { RootNavGate } from "./components/RootNavGate";
import { LayoutTrace } from "./components/dev/LayoutTrace";
import ServiceWorkerRegistration from "./components/ServiceWorkerRegistration";
import { CoachPanel } from "@/app/components/coaching/CoachPanel";
import { WelcomeFlow } from "@/app/components/onboarding/WelcomeFlow";
import { Toaster } from "sonner";
import PageViewTracker from "@/components/analytics/PageViewTracker";

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
        <body className={`${inter.className} bg-slate-950 text-slate-100`} suppressHydrationWarning>
          <Providers>
            <UserProvider>
              <LayoutTrace name="ROOT_LAYOUT" />
              <RootNavGate />
              <LayoutTrace name="ROOT_NAV_GATE_RENDERED" />
              <PageViewTracker />
              {children}
              <ServiceWorkerRegistration />
              <CoachPanel />
              <WelcomeFlow />
              <Toaster />
            </UserProvider>
          </Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}