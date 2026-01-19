import fs from "node:fs";
import path from "node:path";

function mustExist(file: string) {
    const p = path.join(process.cwd(), file);
    if (!fs.existsSync(p)) throw new Error(`Missing file: ${file}`);
}

function mustContain(file: string, needle: string) {
    const p = path.join(process.cwd(), file);
    const s = fs.readFileSync(p, "utf8");
    if (!s.includes(needle)) throw new Error(`${file} missing: ${needle}`);
}

console.log("Starting verification...");

try {
    mustExist("lib/observer/keys.ts");
    mustExist("lib/observer/enabled.ts");
    mustExist("components/observer/ObserverMount.tsx");

    mustContain("lib/observer/keys.ts", "pulse.observer.enabled");
    mustContain("components/observer/ObserverMount.tsx", "searchParams.get(\"observer\")");
    mustContain("app/layout.tsx", "<ObserverMount");
    // Updated check: we changed z-index to number, so checking exact string might be tricky if formatted differently
    // But let's check for the number.
    mustContain("components/observer/PulseObserverPanel.tsx", "2147483647");
    mustContain("components/observer/PulseObserverPanel.tsx", "setObserverDock");
    mustContain("components/observer/PulseObserverPanel.tsx", "disableObserver");

    console.log("✅ verify-phase17-observer-hardened passed");
} catch (e: any) {
    console.error("❌ Verification failed:", e.message);
    process.exit(1);
}
