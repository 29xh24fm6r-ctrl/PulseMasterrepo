"use client";

import { useRef, useEffect } from "react";
import { Composer } from "./Composer";
import { ConversationStream } from "./ConversationStream";
import { usePulseRuntime } from "@/components/runtime/PulseRuntimeProvider";
import { useOverlays } from "@/components/shell/overlays/OverlayContext";

// Helper removed

export function BridgeSurface() {
    const { messages, sendBridgeMessage, isLoading } = usePulseRuntime();
    const { setConfirmationActive } = useOverlays();

    // Scroll ref logic might be inside ConversationStream? Let's check. 
    // ConversationStream usually handles rendering list.
    // If we look at previous file content, it passed messages prop.

    const handleSend = async (text: string) => {
        // We still support local confirmation triggers for the demo/verification if we want,
        // but strict requirement says "consumes provider".
        // The mock logic in Provider is simple.
        // User asked to "Replace stub state... w/ provider".

        // If we want to keep confirmation verification (Task 10/11 stuff), we might want to move that logic to proper Runtime/Engine 
        // later. For now, basic send is fine.
        sendBridgeMessage(text);

        // Verify mock triggers (Optional local override or handle in provider mock?)
        // The provider mock just returns text. 
        // Let's rely on provider for now as requested.
    };

    return (
        <div className="flex flex-col h-full bg-zinc-900/20 backdrop-blur-[2px]">
            {/* Stream Region */}
            <ConversationStream messages={messages} />

            {/* Composer Region */}
            <Composer onSend={handleSend} isProcessing={isLoading} />
        </div>
    );
}
