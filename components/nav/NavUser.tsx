"use client";

import dynamic from "next/dynamic";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";

const UserButton = dynamic(
  async () => {
    const mod = await import("@clerk/nextjs");
    return { default: mod.UserButton };
  },
  { ssr: false }
);

export function NavUser() {
  return (
    <div className="flex items-center gap-2">
      <SignedIn>
        <UserButton afterSignOutUrl="/" />
      </SignedIn>

      <SignedOut>
        <SignInButton mode="modal">
          <button className="rounded-xl px-3 py-1.5 text-sm bg-zinc-800/60 border border-white/10">
            Sign in
          </button>
        </SignInButton>
      </SignedOut>
    </div>
  );
}

