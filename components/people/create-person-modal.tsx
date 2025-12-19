"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { routes } from "@/lib/routes";
import TagMultiselect from "./tag-multiselect";
import DuplicateWarningDialog from "./duplicate-warning-dialog";

interface CreatePersonModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreatePersonModal({ onClose, onSuccess }: CreatePersonModalProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [type, setType] = useState<"business" | "personal" | "prospect" | "client">("business");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [duplicateMatches, setDuplicateMatches] = useState<any[]>([]);
  const [pendingPayload, setPendingPayload] = useState<any>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!firstName.trim() && !lastName.trim()) {
      setError("First name or last name is required");
      return;
    }

    setLoading(true);
    setError(null);

    // Build payload for duplicate check
    const payload = {
      first_name: firstName.trim() || undefined,
      last_name: lastName.trim() || undefined,
      company_name: companyName.trim() || undefined,
      job_title: jobTitle.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      type,
      tag_ids: selectedTagIds.length > 0 ? selectedTagIds : undefined,
    };

    const checkPayload = {
      full_name: `${firstName.trim() || ""} ${lastName.trim() || ""}`.trim(),
      primary_email: email.trim() || undefined,
      primary_phone: phone.trim() || undefined,
      company_name: companyName.trim() || undefined,
      job_title: jobTitle.trim() || undefined,
    };

    try {
      // Step 1: Check for duplicates
      const checkResponse = await fetch("/api/people/duplicates/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(checkPayload),
      });

      if (checkResponse.ok) {
        const checkData = await checkResponse.json();
        if (checkData.ok && checkData.matches && checkData.matches.length > 0) {
          // Show duplicate warning dialog
          setDuplicateMatches(checkData.matches);
          setPendingPayload(payload);
          setShowDuplicateDialog(true);
          setLoading(false);
          return;
        }
      }

      // Step 2: No duplicates or check failed - proceed with creation
      await createContact(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create person");
      setLoading(false);
    }
  };

  const createContact = async (payload: any) => {
    try {
      // Fetch tag names from IDs (API expects both IDs and names)
      const tagNamesFromIds: string[] = [];
      if (selectedTagIds.length > 0) {
        try {
          const tagsRes = await fetch("/api/people/tags", { cache: "no-store" });
          if (tagsRes.ok) {
            const tagsData = await tagsRes.json();
            if (tagsData.ok && tagsData.tags) {
              selectedTagIds.forEach((id) => {
                const tag = tagsData.tags.find((t: any) => t.id === id);
                if (tag) tagNamesFromIds.push(tag.name);
              });
            }
          }
        } catch (err) {
          console.error("Failed to fetch tag names:", err);
        }
      }

      const createPayload = {
        ...payload,
        tags: tagNamesFromIds.length > 0 ? tagNamesFromIds : undefined,
      };

      const response = await fetch(`/api/people/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createPayload),
      });

      const data = await response.json().catch(() => ({ ok: false, error: "Unknown error" }));

      // Always check ok field (API always returns 200 with { ok: boolean })
      if (!data.ok) {
        // "Pulse Brain" duplicate intelligence handling
        if (data.code === "DUPLICATE_CONTACT" && data.existing_contact_id) {
          // Close modal immediately
          onClose?.();

          // Navigate to existing record
          router.push(routes.crm.people.detail(data.existing_contact_id));

          // Show smart toast/notification
          if (data.auto_applied) {
            // Auto-applied improvements
            alert(`✅ Already existed — updated\n\nWe found the existing contact and added your new info.`);
          } else {
            // Show improvement suggestions
            const improvementCount = data.improvement_count ?? 0;
            if (improvementCount > 0) {
              const applyImprovements = confirm(
                `Contact already exists — opened it\n\nPulse found the existing contact. ${improvementCount} improvement${improvementCount === 1 ? "" : "s"} ready to apply.\n\nApply improvements now?`
              );

              if (applyImprovements) {
                // Apply improvements via API
                try {
                  const applyRes = await fetch("/api/people/apply-improvements", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      contact_id: data.existing_contact_id,
                      patch: data.improvement_patch,
                    }),
                  });

                  const applyData = await applyRes.json();
                  if (applyData.ok) {
                    alert("✅ Updated\n\nApplied improvements to the existing contact.");
                    router.refresh();
                  } else {
                    alert(`Could not apply improvements: ${applyData.error ?? "Update failed"}`);
                  }
                } catch (err) {
                  console.error("Failed to apply improvements:", err);
                  alert("Could not apply improvements. Please try again.");
                }
              }
            } else {
              alert("Contact already exists — opened it\n\nPulse found the existing contact instantly.");
            }
          }

          setLoading(false);
          return;
        }

        // Legacy duplicate handling (pre-trigger) if still used
        if (data.matches && Array.isArray(data.matches) && data.matches.length > 0) {
          setDuplicateMatches(data.matches);
          setPendingPayload(payload);
          setShowDuplicateDialog(true);
          setLoading(false);
          return;
        }

        throw new Error(data.error || "Failed to create person");
      }

      // Clear form
      setFirstName("");
      setLastName("");
      setCompanyName("");
      setJobTitle("");
      setEmail("");
      setPhone("");
      setSelectedTagIds([]);

      // Navigate to contact and refresh
      if (data.contact?.id) {
        router.push(routes.crm.people.detail(data.contact.id));
      }
      router.refresh();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create person");
      setLoading(false);
    }
  };

  const handleMergeInto = async (winnerContactId: string) => {
    if (!pendingPayload) return;

    setLoading(true);
    try {
      const response = await fetch("/api/people/merge-from-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          winner_contact_id: winnerContactId,
          draft: pendingPayload,
          strategy: "fill_blanks",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || "Failed to merge");
      }

      const data = await response.json();

      // Clear form
      setFirstName("");
      setLastName("");
      setCompanyName("");
      setJobTitle("");
      setEmail("");
      setPhone("");
      setSelectedTagIds([]);

      // Close dialogs
      setShowDuplicateDialog(false);
      setDuplicateMatches([]);
      setPendingPayload(null);

      // Navigate to contact and refresh
      if (data.contact?.id) {
        router.push(routes.crm.people.detail(data.contact.id));
      }
      router.refresh();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to merge contact");
      setLoading(false);
      setShowDuplicateDialog(false);
    }
  };

  const handleCreateAnyway = () => {
    if (pendingPayload) {
      setShowDuplicateDialog(false);
      setLoading(true);
      createContact(pendingPayload);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-800 rounded-lg border border-zinc-700 w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-zinc-700">
          <h2 className="text-lg font-semibold">Add Person</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-zinc-700 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

          <form 
            onSubmit={(e) => {
              console.log("🔥 FORM onSubmit event fired");
              handleSubmit(e);
            }} 
            className="p-4 space-y-4"
            noValidate
          >
          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/30 rounded text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">First Name *</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Smith"
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Company Name</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Acme Corp"
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Job Title</label>
            <input
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="VP of Sales"
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 123-4567"
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-white focus:outline-none focus:border-purple-500"
            >
              <option value="business">Business</option>
              <option value="personal">Personal</option>
              <option value="prospect">Prospect</option>
              <option value="client">Client</option>
            </select>
          </div>

          <TagMultiselect
            selectedTagIds={selectedTagIds}
            onChange={setSelectedTagIds}
          />

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              onClick={(e) => {
                console.log("🔥 BUTTON CLICKED - submit button");
                // Let the form handle submission
              }}
              className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
            >
              {loading ? "Creating..." : "Create Person"}
            </button>
          </div>
        </form>
      </div>

      {/* Duplicate Warning Dialog */}
      <DuplicateWarningDialog
        open={showDuplicateDialog}
        onOpenChange={setShowDuplicateDialog}
        inputPayload={{
          full_name: `${firstName.trim() || ""} ${lastName.trim() || ""}`.trim(),
          primary_email: email.trim() || undefined,
          primary_phone: phone.trim() || undefined,
          company_name: companyName.trim() || undefined,
        }}
        matches={duplicateMatches}
        onCreateAnyway={handleCreateAnyway}
        onMerge={handleMergeInto}
        onCancel={() => {
          setShowDuplicateDialog(false);
          setDuplicateMatches([]);
          setPendingPayload(null);
          setLoading(false);
        }}
      />
    </div>
  );
}

