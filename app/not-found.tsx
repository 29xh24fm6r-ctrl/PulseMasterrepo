export const dynamic = "force-dynamic";

// IMPORTANT:
// Next.js may prerender /_not-found outside the normal layout/provider tree.
// Force runtime rendering so auth/AI hooks never execute during build.

import Link from 'next/link';

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center bg-black text-white">
            <h2 className="text-3xl font-bold mb-4">404 Not Found</h2>
            <p className="mb-8 text-zinc-400">Could not find the requested resource.</p>
            <Link
                href="/"
                className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors border border-zinc-700"
            >
                Return Home
            </Link>
        </div>
    );
}
