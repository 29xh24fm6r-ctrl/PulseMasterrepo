export function selectExecutionLane(vendor: { url?: string; phone?: string }) {
    if (vendor.url) return "web";
    if (vendor.phone) return "phone";
    return "hybrid";
}
