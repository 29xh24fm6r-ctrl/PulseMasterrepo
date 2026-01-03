export function computeBackoff(attempt: number) {
    // exponential backoff with cap
    const minutes = Math.min(2 ** attempt, 60);
    return new Date(Date.now() + minutes * 60 * 1000);
}
