import "../src/lib/env.js";

console.log("1. Starting imports...");

async function main() {
    try {
        console.log("2. Importing Zod...");
        const zod = await import("zod");
        console.log("Zod loaded.");

        console.log("3. Importing Schema...");
        const schema = await import("../src/agency/schema.js");
        console.log("Schema loaded.");

        console.log("4. Importing LLM Service...");
        const llm = await import("../src/llm/llmService.js");
        console.log("LLM Service loaded.");

        console.log("5. Instantiating LLM Service...");
        new llm.LLMService();
        console.log("LLM Service instantiated.");

        console.log("6. Importing Router...");
        const router = await import("../src/agency/router.js");
        console.log("Router loaded.");

        console.log("7. Instantiating Router...");
        new router.IntentRouter();
        console.log("Router instantiated.");

    } catch (e) {
        console.error("Import/Runtime Error:", e);
    }
}

main();
