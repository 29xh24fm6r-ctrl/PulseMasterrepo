"use client";

import { useEffect } from "react";
import { useEncounter } from "@/components/encounter/EncounterContext";

/**
 * CANON GUARDRAIL (Dev Only)
 * Enforces strict UI rules:
 * 1. Single Primary Control Surface (No double toolbars)
 * 2. Silence Discipline (No widgets in CLEAR)
 */
export function CanonGuard() {
    const { state } = useEncounter();

    useEffect(() => {
        if (process.env.NODE_ENV !== "development") return;

        // 1. UI Layering Check (Double Toolbar)
        // Check if multiple fixed bottom elements exist
        const fixedBottoms = document.querySelectorAll('[class*="fixed bottom-"]');
        const visibleFixedBottoms = Array.from(fixedBottoms).filter(el => {
            const style = window.getComputedStyle(el);
            return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
        });

        // We expect QuantumDock at bottom-6. If GlobalVoiceButton (bottom-right) or others exist, warn/fail.
        // Actually, Toast viewport is fixed bottom-0 usually. FrameMotion exit might leave trace.
        // We look for specific components by heuristics or test ids if possible.
        // For now, simple console warn if > 2 (Dock + maybe 1 safe element like Toast).
        // User said "If >1 bottom bar mounts -> fail".

        // 1. UI Layering Check (Double Toolbar)
        // STRICT CANON: Exactly ONE primary control surface allowed at bottom.
        if (visibleFixedBottoms.length > 1) {
            const msg = "🚨 CANON VIOLATION: UI Layering Conflict. More than 1 fixed bottom element detected. Canon requires exactly ONE primary control surface.";
            console.error(msg, visibleFixedBottoms);
            // Visual scream for dev
            const errDiv = document.createElement('div');
            errDiv.style.cssText = 'position:fixed;top:0;left:0;right:0;background:red;color:white;z-index:9999;padding:20px;font-weight:bold;text-align:center;';
            errDiv.innerText = msg;
            document.body.appendChild(errDiv);
        }

        // 2. Silence Discipline Check
        if (state === 'CLEAR') {
            // Check if input fields are visible with placeholder containing "Ask"
            const visibleInputs = Array.from(document.querySelectorAll('input')).filter(input => {
                const style = window.getComputedStyle(input);
                return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0' && input.placeholder.includes("Ask");
            });

            if (visibleInputs.length > 0) {
                console.error("🚨 CANON VIOLATION: CLEAR State is NOT silent. 'Ask Pulse' input is visible.");
            }
        }

    }, [state]);

    return null;
}
