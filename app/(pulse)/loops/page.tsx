import { auth } from "@clerk/nextjs/server";
import { getLoopsOverview } from "@/lib/loops/overview";
import LoopsOverview from "@/components/loops/loops-overview";

export default async function LoopsPage() {
  const { userId } = await auth();
  if (!userId) {
    return <div className="p-8 text-red-400">Unauthorized</div>;
  }

  const data = await getLoopsOverview(userId);
  return <LoopsOverview data={data} />;
}

