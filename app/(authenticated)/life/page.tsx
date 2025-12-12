// Life Realm - AGI-era Life Command Center
// app/(authenticated)/life/page.tsx

import RealmLayout from "@/components/realms/RealmLayout";
import LifeCockpit from "@/components/realms/LifeCockpit";

export const metadata = {
  title: "Life Core | Pulse OS",
  description: "Your life at a glance.",
};

export default function LifePage() {
  return (
    <RealmLayout realmId="life">
      <LifeCockpit />
    </RealmLayout>
  );
}
