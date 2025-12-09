// Gmail token storage utilities
// Stores tokens in localStorage for client-side access

export function isGmailConnected(): boolean {
  if (typeof window === "undefined") return false;
  const token = localStorage.getItem("gmail_access_token");
  return !!token && token !== "null" && token !== "undefined";
}

export function getGmailTokens(): { accessToken: string | null; refreshToken: string | null } {
  if (typeof window === "undefined") {
    return { accessToken: null, refreshToken: null };
  }
  return {
    accessToken: localStorage.getItem("gmail_access_token"),
    refreshToken: localStorage.getItem("gmail_refresh_token"),
  };
}

export function saveGmailTokens(accessToken: string, refreshToken: string): void {
  if (typeof window === "undefined") return;
  if (accessToken) {
    localStorage.setItem("gmail_access_token", accessToken);
  }
  if (refreshToken) {
    localStorage.setItem("gmail_refresh_token", refreshToken);
  }
}

export function clearGmailTokens(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("gmail_access_token");
  localStorage.removeItem("gmail_refresh_token");
}