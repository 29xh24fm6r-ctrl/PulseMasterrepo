"use client";

import React from "react";
import { PulseRuntimeProvider } from "./PulseRuntimeProvider";

export default function PulseRuntimeRoot({ children }: { children: React.ReactNode }) {
    // This wrapper ensures the provider is instantiated in the client context
    // and can be safely imported into the server-side root layout.
    return <PulseRuntimeProvider>{children}</PulseRuntimeProvider>;
}
