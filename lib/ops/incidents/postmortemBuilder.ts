// src/lib/ops/incidents/postmortemBuilder.ts
import "server-only";

export type OpsEvent = {
  id: string;
  created_at: string;
  source: string;
  event_type: string;
  level: "info" | "warn" | "error" | "success";
  summary: string;
  link: string | null;
  payload: any;
};

export type DiffLens = {
  ok: boolean;
  suspectSha: string | null;
  parentSha: string | null;
  compareUrl: string | null;
  prUrl: string | null;
  prNumber: number | null;
  prTitle: string | null;
  files: {
    filename: string;
    status: string;
    additions?: number;
    deletions?: number;
    changes?: number;
  }[];
  note?: string | null;
};

function isoDate(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function fmt(ts: string) {
  const d = new Date(ts);
  return d.toISOString().replace("T", " ").slice(0, 19) + "Z";
}

function mdEscape(s: string) {
  return (s || "").replace(/\r/g, "").trim();
}

function shortSha(sha: string | null) {
  if (!sha) return "—";
  return sha.slice(0, 8);
}

/**
 * Picks an "incident window":
 * - Start: latest smoke_failed event (if any)
 * - Otherwise: last 2 hours of events
 * - End: latest event
 */
function selectIncidentWindow(eventsDesc: OpsEvent[]) {
  const now = new Date();

  const latestSmokeFailIdx = eventsDesc.findIndex((e) => e.event_type === "smoke_failed");
  let windowEvents: OpsEvent[] = [];

  if (latestSmokeFailIdx >= 0) {
    // events are DESC, take 0..failIdx then reverse -> ASC timeline
    windowEvents = eventsDesc.slice(0, latestSmokeFailIdx + 1).reverse();
  } else {
    const cutoff = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
    windowEvents = eventsDesc.filter((e) => e.created_at >= cutoff).reverse();
  }

  const start = windowEvents[0]?.created_at ?? null;
  const end = windowEvents[windowEvents.length - 1]?.created_at ?? null;
  return { windowEvents, start, end };
}

/**
 * Prefer a "real" suspect SHA:
 * - revert target from rollback_pr_created.payload.reverted_merge_sha
 * - else smoke_failed.payload.triggering_head_sha
 */
function pickSuspectSha(eventsDesc: OpsEvent[]) {
  const rollbackPr = eventsDesc.find((e) => e.event_type === "rollback_pr_created") ?? null;
  const smokeFail = eventsDesc.find((e) => e.event_type === "smoke_failed") ?? null;

  const fromRollback = rollbackPr?.payload?.reverted_merge_sha ? String(rollbackPr.payload.reverted_merge_sha) : null;
  const fromSmoke = smokeFail?.payload?.triggering_head_sha ? String(smokeFail.payload.triggering_head_sha) : null;

  return fromRollback || fromSmoke || null;
}

function buildDiffLensSection(diff: DiffLens | null) {
  if (!diff) {
    return `## Diff Lens (Evidence)\n\n- (Diff lens not available)\n`;
  }

  const prLine =
    diff.prUrl
      ? `- Suspect PR: ${diff.prUrl}${diff.prTitle ? ` — **${mdEscape(diff.prTitle)}**` : ""}`
      : `- Suspect PR: (unresolved)`;

  const compareLine = diff.compareUrl
    ? `- Compare: ${diff.compareUrl}`
    : diff.parentSha && diff.suspectSha
      ? `- Compare: (unavailable) \`${shortSha(diff.parentSha)}...${shortSha(diff.suspectSha)}\``
      : `- Compare: (unavailable)`;

  const files = (diff.files || []).slice(0, 25); // keep doc readable
  const moreCount = Math.max(0, (diff.files?.length || 0) - files.length);

  const fileLines = files.length
    ? files
        .map((f) => {
          const stats =
            typeof f.additions === "number" || typeof f.deletions === "number"
              ? ` (+${f.additions ?? 0}/-${f.deletions ?? 0})`
              : "";
          return `- \`${f.filename}\` — ${f.status}${stats}`;
        })
        .join("\n")
    : `- (No files returned)`;

  const moreLine = moreCount > 0 ? `\n- …and ${moreCount} more file(s)` : "";

  const noteLine = diff.note ? `\n- Note: ${mdEscape(diff.note)}` : "";

  return `## Diff Lens (Evidence)

- Suspect SHA: \`${diff.suspectSha ?? "—"}\`

- Parent SHA: \`${diff.parentSha ?? "—"}\`

${prLine}

${compareLine}${noteLine}

### Changed files (top ${files.length})

${fileLines}${moreLine}

`;
}

/**
 * Build postmortem markdown from events + optional diff lens evidence + optional radar markdown.
 */
export function buildPostmortemFromEvents(eventsDesc: OpsEvent[], diff: DiffLens | null, radarMd: string | null) {
  const { windowEvents, start, end } = selectIncidentWindow(eventsDesc);

  const smokeFail = windowEvents.find((e) => e.event_type === "smoke_failed") ?? null;
  const rollbackPr = windowEvents.find((e) => e.event_type === "rollback_pr_created") ?? null;
  const canaryGreen = windowEvents.find((e) => e.event_type === "canary_green_applied") ?? null;
  const rollbackMerged = windowEvents.find((e) => e.event_type === "rollback_merged") ?? null;

  const suspectSha = pickSuspectSha(eventsDesc);

  const incidentId = `inc-${isoDate()}-${Math.random().toString(36).slice(2, 8)}`;

  const title = `Postmortem: ${smokeFail ? "Prod Smoke Failure" : "Ops Event"} (${isoDate()})`;

  const timelineLines = windowEvents.map((e) => {
    const link = e.link ? ` ([link](${e.link}))` : "";
    return `- **${fmt(e.created_at)}** — \`${e.event_type}\` (${e.level}/${e.source}): ${mdEscape(e.summary)}${link}`;
  });

  const rollbackSection = [
    rollbackPr?.link ? `- Rollback PR: ${rollbackPr.link}` : `- Rollback PR: (none detected)`,
    rollbackPr?.payload?.branch ? `- Rollback branch: \`${rollbackPr.payload.branch}\`` : `- Rollback branch: —`,
    rollbackPr?.payload?.reverted_merge_sha
      ? `- Reverted merge SHA: \`${rollbackPr.payload.reverted_merge_sha}\``
      : `- Reverted merge SHA: —`,
    canaryGreen ? `- Canary-green applied: **YES** (${fmt(canaryGreen.created_at)})` : `- Canary-green applied: **NO / unknown**`,
    rollbackMerged ? `- Rollback merged: **YES** (${fmt(rollbackMerged.created_at)})` : `- Rollback merged: **NO / unknown**`,
  ].join("\n");

  const diffLensSection = buildDiffLensSection(diff);
  const radarSection = radarMd ? radarMd : `## Root Cause Radar (Deterministic)\n- (Radar not available)\n\n`;

  const md = `# ${title}

**Incident ID:** \`${incidentId}\`  
**Date:** ${isoDate()}  
**Window:** ${start ? fmt(start) : "—"} → ${end ? fmt(end) : "—"}  
**Suspected change:** ${suspectSha ? `\`${suspectSha}\`` : "—"}

## Summary

(Write a 3–5 sentence summary of what happened, impact, and resolution.)

## Impact

- **Customer impact:** (who/what was affected)
- **Duration:** ${start && end ? `${fmt(start)} → ${fmt(end)}` : "—"}
- **Severity:** (sev1/sev2/sev3)

## Detection

- **Signal:** ${smokeFail ? "Prod Smoke failed" : "War Room event window"}
${smokeFail?.link ? `- **Failing run:** ${smokeFail.link}` : ""}

${diffLensSection}

${radarSection}

## Root Cause

(Use Diff Lens + Radar evidence above. Link to suspect PR/commit and explain precisely what broke.)

## Resolution

${rollbackSection}

## Timeline

${timelineLines.length ? timelineLines.join("\n") : "- (no events captured)"}

## What went well

- 

## What went poorly

- 

## Action items

| Action | Owner | Due | Status |
|---|---|---|---|
| Add regression test covering the failing path |  |  |  |
| Improve smoke coverage for the impacted endpoint |  |  |  |
| Add alerting threshold / faster detection |  |  |  |

## Links

- War Room: /ops/incidents
${rollbackPr?.link ? `- Rollback PR: ${rollbackPr.link}` : ""}
${smokeFail?.link ? `- Failing smoke run: ${smokeFail.link}` : ""}
${diff?.compareUrl ? `- Compare: ${diff.compareUrl}` : ""}
${diff?.prUrl ? `- Suspect PR: ${diff.prUrl}` : ""}
`;

  return {
    incidentId,
    title,
    markdown: md,
    window: { start, end },
    keyLinks: {
      smokeFailUrl: smokeFail?.link ?? null,
      rollbackPrUrl: rollbackPr?.link ?? null,
      compareUrl: diff?.compareUrl ?? null,
      suspectPrUrl: diff?.prUrl ?? null,
    },
    suspectSha,
  };
}
