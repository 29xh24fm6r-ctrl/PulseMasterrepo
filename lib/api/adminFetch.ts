/**
 * Admin API fetch helpers
 * Includes credentials: "include" for authentication
 */

export async function adminPost<T>(
  url: string,
  body?: unknown
): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    credentials: "include", // 🔑 THIS IS THE FIX
    headers: {
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text}`);
  }

  return res.json();
}

export async function adminGet<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text}`);
  }

  return res.json();
}

