import { auth } from "@clerk/nextjs/server";
import { getWorkspaceOverview } from "@/lib/workspace/overview";
import WorkspaceOverview from "@/components/workspace/workspace-overview";
import { EmailCommandCenterRail } from "./_components/EmailCommandCenterRail";
import CanonPanel from "@/components/admin/CanonPanel";

export default async function WorkspacePage() {
  const { userId } = await auth();
  if (!userId) {
    return <div className="p-8 text-red-400">Unauthorized</div>;
  }

  const data = await getWorkspaceOverview(userId);
  const isDev = process.env.NEXT_PUBLIC_VERCEL_ENV !== "production";
  
  return (
    <main className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
      <div className="max-w-[1600px] mx-auto px-6 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-6">
          <EmailCommandCenterRail />
          <div>
            <WorkspaceOverview data={data} />
            
            {/* Admin/Dev Tools */}
            {isDev && (
              <div className="mt-6">
                <CanonPanel />
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
