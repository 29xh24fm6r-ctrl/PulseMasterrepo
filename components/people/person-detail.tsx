"use client";

import ContactCockpit from "@/components/crm/person/ContactCockpit";

export default function PersonDetail({ personId }: { personId: string }) {
  // Use new ContactCockpit component for enhanced experience
  return <ContactCockpit personId={personId} />;
}
