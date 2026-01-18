import { ExecutorResult } from "../types";

export async function checkDelivery(args: {
    tracker_id: string;
}): Promise<ExecutorResult> {
    // V1 Stub
    return {
        ok: true,
        output: {
            status: "out_for_delivery",
            location: "Main St",
            eta: "10m"
        }
    };
}
