import { runWorker } from "@/lib/jobs/worker";

runWorker().catch((e) => {
    // eslint-disable-next-line no-console
    console.error("Worker crashed:", e);
    process.exit(1);
});
