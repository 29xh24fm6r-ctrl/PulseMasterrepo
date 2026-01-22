"use client";

import { SignIn } from "@clerk/nextjs";

export default function SignInClient() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-950">
            <SignIn
                routing="path"
                path="/sign-in"
                fallbackRedirectUrl="/"
                forceRedirectUrl="/"
            />
        </div>
    );
}
