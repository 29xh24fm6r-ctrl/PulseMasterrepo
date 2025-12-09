"use client";
import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { JobSelector } from "@/components/JobSelector";
import { ArrowLeft, Briefcase, Check, User, Palette, Pencil } from "lucide-react";
import Link from "next/link";

export default function SettingsPage() {
  const { user } = useUser();
  const [currentJob, setCurrentJob] = useState<{ id: string; name: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<"job" | "profile" | "preferences">("job");
  const [showJobSelector, setShowJobSelector] = useState(false);

  useEffect(() => {
    loadCurrentJob();
  }, []);

  async function loadCurrentJob() {
    try {
      const res = await fetch("/api/user/profile");
      const data = await res.json();
      if (data.profile?.job_title) {
        setCurrentJob({
          id: data.profile.job_title_id,
          name: data.profile.job_title.name,
        });
      } else {
        setShowJobSelector(true);
      }
    } catch (err) {
      console.error("Failed to load profile:", err);
      setShowJobSelector(true);
    }
  }

  async function handleJobSelect(jobId: string, jobName: string) {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_job", jobTitleId: jobId }),
      });
      if (res.ok) {
        setCurrentJob({ id: jobId, name: jobName });
        setSaved(true);
        setShowJobSelector(false);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      console.error("Failed to save job:", err);
    }
    setSaving(false);
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="border-b border-zinc-800">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/" className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-semibold">Settings</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex gap-8">
          <div className="w-48 space-y-1">
            <button
              onClick={() => setActiveTab("job")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
                activeTab === "job" ? "bg-violet-600 text-white" : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>Job Title</span>
            </button>
            <button
              onClick={() => setActiveTab("profile")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
                activeTab === "profile" ? "bg-violet-600 text-white" : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
              }`}
            >
              <User className="w-4 h-4" />
              <span>Profile</span>
            </button>
            <button
              onClick={() => setActiveTab("preferences")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
                activeTab === "preferences" ? "bg-violet-600 text-white" : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
              }`}
            >
              <Palette className="w-4 h-4" />
              <span>Preferences</span>
            </button>
          </div>

          <div className="flex-1">
            {activeTab === "job" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Your Job Title</h2>
                  <p className="text-zinc-400">
                    Select your job to get a personalized dashboard and compare with others in your field.
                  </p>
                </div>

                {currentJob && !showJobSelector && (
                  <div className="p-6 bg-zinc-900 border border-zinc-700 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-zinc-500 mb-1">Current Job</div>
                        <div className="text-xl font-semibold text-white">{currentJob.name}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        {saved && (
                          <div className="flex items-center gap-2 text-green-400">
                            <Check className="w-4 h-4" />
                            <span className="text-sm">Saved</span>
                          </div>
                        )}
                        <button
                          onClick={() => setShowJobSelector(true)}
                          className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                          <span>Change</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {showJobSelector && (
                  <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">
                        {currentJob ? "Change Your Job" : "Select Your Job"}
                      </h3>
                      {currentJob && (
                        <button
                          onClick={() => setShowJobSelector(false)}
                          className="text-sm text-zinc-400 hover:text-white"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                    <JobSelector
                      onSelect={handleJobSelect}
                      currentJobId={currentJob?.id}
                    />
                    {saving && (
                      <div className="mt-4 text-center text-zinc-400">Saving...</div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === "profile" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Profile</h2>
                  <p className="text-zinc-400">Manage your account information.</p>
                </div>
                <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-4">
                  <div>
                    <div className="text-sm text-zinc-500">Name</div>
                    <div className="text-lg text-white">{user?.fullName || "—"}</div>
                  </div>
                  <div>
                    <div className="text-sm text-zinc-500">Email</div>
                    <div className="text-lg text-white">{user?.primaryEmailAddress?.emailAddress || "—"}</div>
                  </div>
                </div>
                <Link
                  href="/onboarding"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm transition-colors"
                >
                  Retake Personality Assessment →
                </Link>
              </div>
            )}

            {activeTab === "preferences" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Preferences</h2>
                  <p className="text-zinc-400">Customize your Pulse experience.</p>
                </div>
                <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-400">
                  Coming soon: Dashboard density, gamification settings, notification preferences.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
