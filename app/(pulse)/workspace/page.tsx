import { auth } from "@clerk/nextjs/server";
import { getWorkspaceOverview } from "@/lib/workspace/overview";
import WorkspaceOverview from "@/components/workspace/workspace-overview";

export default async function WorkspacePage() {
  const { userId } = await auth();
  if (!userId) {
    return <div className="p-8 text-red-400">Unauthorized</div>;
  }

  const data = await getWorkspaceOverview(userId);
  return <WorkspaceOverview data={data} />;
}

