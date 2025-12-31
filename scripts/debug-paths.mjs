import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const APP_DIR = path.join(ROOT, "app");

console.log("ROOT:", ROOT);
console.log("APP_DIR:", APP_DIR);

function walk(dir) {
    const out = [];
    try {
        for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
            const p = path.join(dir, ent.name);
            if (ent.isDirectory()) out.push(...walk(p));
            else out.push(p);
        }
    } catch (e) {
        console.log("Error walking:", dir, e.message);
    }
    return out;
}

const files = walk(APP_DIR);
console.log("Total files:", files.length);
const routes = files.filter(f => f.endsWith("route.ts"));
console.log("Route files:", routes.length);
if (routes.length > 0) console.log("First route:", routes[0]);
