export async function withTimeout<T>(
    label: string,
    ms: number,
    fn: () => Promise<T>
): Promise<T> {
    let t: any;

    const timeout = new Promise<never>((_, reject) => {
        t = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    });

    try {
        return await Promise.race([fn(), timeout]);
    } finally {
        clearTimeout(t);
    }
}
