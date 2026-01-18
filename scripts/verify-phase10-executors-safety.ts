import fs from "fs";

async function main() {
    console.log("Verifying Phase 10 Safety...");

    // check worker route for secret check
    const workerRoute = fs.readFileSync("app/api/executors/worker/route.ts", "utf8");
    if (!workerRoute.includes("process.env.EXEC_WORKER_SECRET")) {
        throw new Error("Worker route does not seem to check EXEC_WORKER_SECRET");
    }

    // check playwright stub for allowed domains
    const pwRoute = fs.readFileSync("services/executors/playwright/index.ts", "utf8");
    if (!pwRoute.includes("EXEC_WEB_ALLOWED_DOMAINS")) {
        throw new Error("Playwright executor does not check EXEC_WEB_ALLOWED_DOMAINS");
    }

    console.log("Safety Checks OK.");
}

main().catch(console.error);
