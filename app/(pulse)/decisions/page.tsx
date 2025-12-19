import { auth } from "@clerk/nextjs/server";
import { getDecisionsOverview } from "@/lib/decisions/overview";
import DecisionsOverview from "@/components/decisions/decisions-overview";

export default async function DecisionsPage() {
  const { userId } = await auth();
  if (!userId) {
    return <div className="p-8 text-red-400">Unauthorized</div>;
  }

  const data = await getDecisionsOverview(userId);
  return <DecisionsOverview data={data} />;
}

