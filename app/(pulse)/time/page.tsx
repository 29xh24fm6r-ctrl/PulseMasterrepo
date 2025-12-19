import { auth } from "@clerk/nextjs/server";
import { getTimeOverview } from "@/lib/time/overview";
import TimeOverview from "@/components/time/time-overview";

export default async function TimePage() {
  const { userId } = await auth();
  if (!userId) {
    return <div className="p-8 text-red-400">Unauthorized</div>;
  }

  const data = await getTimeOverview(userId);
  return <TimeOverview data={data} />;
}

