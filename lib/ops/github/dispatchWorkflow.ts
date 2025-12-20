// src/lib/ops/github/dispatchWorkflow.ts
import "server-only";

export type DispatchInput = Record<string, string>;

type DispatchArgs = {
  owner: string;
  repo: string;
  workflowFile: string; // e.g. "prod-smoke.yml"
  ref: string; // usually "main"
  inputs?: DispatchInput;
};

export async function dispatchWorkflow(args: DispatchArgs) {
  const token = process.env.GITHUB_ACTIONS_PAT || "";
  if (!token) throw new Error("missing_env:GITHUB_ACTIONS_PAT");

  const url = `https://api.github.com/repos/${args.owner}/${args.repo}/actions/workflows/${args.workflowFile}/dispatches`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/vnd.github+json",
      "content-type": "application/json",
      "user-agent": "buddy-war-room",
    },
    body: JSON.stringify({
      ref: args.ref,
      inputs: args.inputs ?? {},
    }),
  });

  // GitHub returns 204 No Content on success
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`github_dispatch_failed:${res.status}:${text.slice(0, 400)}`);
  }
}

