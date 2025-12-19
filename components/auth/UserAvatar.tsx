"use client";

import dynamic from "next/dynamic";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";

// Avoid hydration issues in App Router
const UserButton = dynamic(
  async () => {
    const mod = await import("@clerk/nextjs");
    return { default: mod.UserButton };
  },
  { ssr: false }
);

export function UserAvatar() {
  return (
    <div className="flex items-center justify-end min-w-[40px]">
      <SignedIn>
        <UserButton
          afterSignOutUrl="/"
          appearance={{
            elements: {
              avatarBox: "w-8 h-8",
            },
          }}
        />
      </SignedIn>

      <SignedOut>
        <SignInButton mode="modal">
          <button className="text-sm px-3 py-1 rounded-md border border-white/10 hover:border-white/20">
            Sign in
          </button>
        </SignInButton>
      </SignedOut>
    </div>
  );
}
