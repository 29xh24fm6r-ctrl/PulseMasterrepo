import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function PeoplePersonRedirectPage({
  params,
}: {
  params: { personId: string };
}) {
  redirect(`/crm/people/${params.personId}`);
}
