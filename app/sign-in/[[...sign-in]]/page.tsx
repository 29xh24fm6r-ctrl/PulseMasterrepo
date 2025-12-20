import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-white">
      <div className="mb-6 text-center">
        <div className="text-sm uppercase tracking-wider text-zinc-400">
          Pulse
        </div>
        <div className="mt-2 text-2xl font-semibold">
          Your life, in one place
        </div>
        <div className="mt-1 text-sm text-zinc-400">
          Clarity. Momentum. Intelligence.
        </div>
      </div>

      <SignIn afterSignInUrl="/home" />
    </div>
  );
}