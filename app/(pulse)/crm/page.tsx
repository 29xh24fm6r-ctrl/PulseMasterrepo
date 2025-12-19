import { auth } from "@clerk/nextjs/server";
import { getCrmOverview } from "@/lib/crm/overview";
import CrmDashboard from "@/components/crm/crm-dashboard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CrmPage() {
  const { userId } = await auth();
  if (!userId) {
    return <div className="p-8 text-red-400">Unauthorized</div>;
  }

  const data = await getCrmOverview(userId);
  return <CrmDashboard data={data} />;
}

