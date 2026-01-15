import "dotenv/config";
import { IntentRouter } from "../src/agency/router.js";

async function main() {
    console.log("Initializing Router...");
    try {
        const router = new IntentRouter();
        console.log("Router Initialized.");
        const res = await router.classify("Hello");
        console.log("Classified:", res);
    } catch (e) {
        console.error("Router Error:", e);
    }
}

main();
