import type { IVRPacket } from "./types.js";
import { ConversationLoop } from "./conversationLoop.js";

const loop = new ConversationLoop();

/**
 * Gateway-only orchestration entrypoint.
 * You call this from your HTTP route handler after parsing the body.
 */
export async function handleIvrPacket(packet: IVRPacket): Promise<{ speakText: string | null }> {
    const speakText = await loop.handle(packet);
    return { speakText };
}
