
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const twiml = `
    <Response>
      <Start>
        <Stream url="wss://${req.headers.get('host')}/api/comm/ws" />
      </Start>
      <Say>Connecting you to the Pulse Real-Time Brain. Please wait.</Say>
      <Pause length="30" />
    </Response>
    `;

        return new NextResponse(twiml, {
            headers: {
                "Content-Type": "application/xml",
            },
        });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to generate TwiML' }, { status: 500 });
    }
}
