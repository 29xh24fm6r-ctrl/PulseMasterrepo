import "../src/lib/env.js";

console.log("Env Keys:", Object.keys(process.env).filter(k => k.includes("KEY") || k.includes("URL") || k.includes("GEMINI")));
