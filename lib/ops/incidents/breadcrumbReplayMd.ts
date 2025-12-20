// src/lib/ops/incidents/breadcrumbReplayMd.ts
import "server-only";

export function breadcrumbsToMarkdown(breadcrumbs: any[] | null | undefined) {
  const b = Array.isArray(breadcrumbs) ? breadcrumbs : [];
  if (!b.length) return `## Breadcrumb Replay (Sentry-lite)\n- (No breadcrumbs captured)\n\n`;

  const lines = b.slice(-30).map((x) => {
    const ts = x.ts ? String(x.ts).replace("T", " ").slice(0, 19) + "Z" : "";
    const type = x.type ? String(x.type) : "info";
    const name = x.name ? String(x.name) : "event";
    const data = x.data ? JSON.stringify(x.data).slice(0, 300) : "";
    return `- **${ts}** \`${type}\` — ${name}${data ? ` — \`${data.replace(/`/g, "")}\`` : ""}`;
  });

  return `## Breadcrumb Replay (Sentry-lite)

${lines.join("\n")}



`;
}

