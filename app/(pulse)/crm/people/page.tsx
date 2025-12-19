import { auth } from "@clerk/nextjs/server";
import { getPeopleOverview } from "@/lib/people/overview";
import PeopleOverview from "@/components/people/people-overview";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CrmPeoplePage() {
  const { userId } = await auth();
  if (!userId) {
    return <div className="p-8 text-red-400">Unauthorized</div>;
  }

  const data = await getPeopleOverview(userId);
  return <PeopleOverview data={data} />;
}

