function levenshtein(a: string, b: string) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

export function suggestEmailFix(to: string): { original: string; suggested: string; reason: string } | null {
  const raw = (to || "").trim();
  const parts = raw.split("@");
  if (parts.length !== 2) return null;

  const local = parts[0].trim();
  const domain = parts[1].trim().toLowerCase();
  if (!local || !domain) return null;

  const common = [
    "gmail.com",
    "outlook.com",
    "hotmail.com",
    "yahoo.com",
    "icloud.com",
    "live.com",
    "aol.com",
    "proton.me",
    "protonmail.com",
  ];

  let best: { d: string; dist: number } | null = null;
  for (const d of common) {
    const dist = levenshtein(domain, d);
    if (!best || dist < best.dist) best = { d, dist };
  }

  if (!best) return null;
  if (best.dist === 0) return null;
  if (best.dist > 2) return null;

  return {
    original: raw,
    suggested: `${local}@${best.d}`,
    reason: `domain typo (${domain} → ${best.d})`,
  };
}
