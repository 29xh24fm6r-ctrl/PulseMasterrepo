import { auth } from "@clerk/nextjs/server";
import { getBrainOverview } from "@/lib/brain/overview";
import BrainOverview from "@/components/brain/brain-overview";

export default async function BrainPage() {
  const { userId } = await auth();
  if (!userId) {
    return <div className="p-8 text-red-400">Unauthorized</div>;
  }

  const data = await getBrainOverview(userId);
  return <BrainOverview data={data} />;
}

