import { fetch } from "undici";

async function smoke() {
    const baseUrl = process.env.BASE_URL || "http://localhost:3000";
    console.log(`💨 Starting Smoke Test against ${baseUrl}...`);

    try {
        // 1. Health
        console.log("Checking /api/dev/health...");
        const healthRes = await fetch(`${baseUrl}/api/dev/health`);
        if (healthRes.status !== 200) throw new Error(`Health failed: ${healthRes.status}`);
        const healthJson = await healthRes.json() as any;
        if (!healthJson.ok) throw new Error("Health returned ok:false");
        console.log("✅ Health PASS");

        // 2. WhoAmI
        console.log("Checking /api/dev/whoami...");
        const whoamiRes = await fetch(`${baseUrl}/api/dev/whoami`);
        if (whoamiRes.status !== 200) throw new Error(`WhoAmI failed: ${whoamiRes.status}`);
        console.log("✅ WhoAmI PASS");

        // 3. Status/Smoke Internal
        console.log("Checking /api/dev/smoke...");
        const smokeRes = await fetch(`${baseUrl}/api/dev/smoke`);
        if (smokeRes.status !== 200) throw new Error(`Internal Smoke failed: ${smokeRes.status}`);
        const smokeJson = await smokeRes.json() as any;
        if (!smokeJson.ok) throw new Error("Internal Smoke returned ok:false");
        console.log("✅ Internal Smoke PASS");

        console.log("\n✨ ALL SYSTEMS GREEN ✨");
        process.exit(0);
    } catch (e: any) {
        console.error("\n❌ SMOKE TEST FAILED");
        console.error(e.message);
        process.exit(1);
    }
}

smoke();
