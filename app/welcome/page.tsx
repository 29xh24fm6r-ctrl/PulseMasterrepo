import { WelcomeClientPage } from "./WelcomeClientPage";

// ✅ Force dynamic rendering - don't pre-render during build
// This page uses Clerk hooks which require ClerkProvider at runtime
export const dynamic = 'force-dynamic';

export default function WelcomePage() {
    return <WelcomeClientPage />;
}
