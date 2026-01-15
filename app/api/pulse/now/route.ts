import { NextResponse } from 'next/server';
import { buildSignalBundle } from '@/lib/now-engine/buildSignalBundle';
import { computeNow } from '@/lib/now-engine/computeNow';
import { auth } from '@clerk/nextjs/server'; // Assuming Clerk, based on middleware

export async function GET() {
    try {
        const { userId } = auth();
        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const bundle = await buildSignalBundle(userId);
        const result = computeNow(bundle);

        return NextResponse.json(result);
    } catch (error) {
        console.error("[NOW_ENGINE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
