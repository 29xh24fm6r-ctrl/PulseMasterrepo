"use client";
import { useState, useEffect } from "react";

type Industry = { id: string; name: string; icon: string };
type Category = { id: string; name: string; icon: string };
type JobTitle = { id: string; name: string; aliases?: string[]; description?: string };

interface JobSelectorProps {
  onSelect: (jobId: string, jobName: string) => void;
  currentJobId?: string;
}

export function JobSelector({ onSelect, currentJobId }: JobSelectorProps) {
  const [step, setStep] = useState<"industry" | "category" | "job" | "search">("industry");
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [jobs, setJobs] = useState<JobTitle[]>([]);
  const [selectedIndustry, setSelectedIndustry] = useState<Industry | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestForm, setRequestForm] = useState({ industry: "", category: "", title: "", description: "" });

  useEffect(() => {
    loadIndustries();
  }, []);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchJobs(searchQuery);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  async function loadIndustries() {
    setLoading(true);
    const res = await fetch("/api/jobs");
    const data = await res.json();
    setIndustries(data.industries || []);
    setLoading(false);
  }

  async function loadCategories(industryId: string) {
    setLoading(true);
    const res = await fetch(`/api/jobs?industry=${industryId}`);
    const data = await res.json();
    setCategories(data.categories || []);
    setLoading(false);
  }

  async function loadJobs(categoryId: string) {
    setLoading(true);
    const res = await fetch(`/api/jobs?category=${categoryId}`);
    const data = await res.json();
    setJobs(data.jobs || []);
    setLoading(false);
  }

  async function searchJobs(query: string) {
    const res = await fetch(`/api/jobs?search=${encodeURIComponent(query)}`);
    const data = await res.json();
    setSearchResults(data.jobs || []);
  }

  function handleIndustrySelect(industry: Industry) {
    setSelectedIndustry(industry);
    loadCategories(industry.id);
    setStep("category");
  }

  function handleCategorySelect(category: Category) {
    setSelectedCategory(category);
    loadJobs(category.id);
    setStep("job");
  }

  function handleJobSelect(job: JobTitle) {
    onSelect(job.id, job.name);
  }

  function handleSearchSelect(result: any) {
    onSelect(result.id, result.name);
  }

  async function handleRequestSubmit() {
    await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "request_job",
        suggestedIndustry: requestForm.industry,
        suggestedCategory: requestForm.category,
        suggestedTitle: requestForm.title,
        description: requestForm.description,
      }),
    });
    setShowRequestForm(false);
    alert("Job request submitted! We'll review it shortly.");
  }

  if (showRequestForm) {
    return (
      <div className="space-y-4">
        <button onClick={() => setShowRequestForm(false)} className="text-zinc-400 hover:text-white text-sm">
          ← Back
        </button>
        <h3 className="text-lg font-semibold text-white">Request a New Job Title</h3>
        <p className="text-sm text-zinc-400">Can't find your job? Let us know and we'll add it.</p>
        <input
          type="text"
          placeholder="Industry (e.g., Banking & Finance)"
          value={requestForm.industry}
          onChange={(e) => setRequestForm({ ...requestForm, industry: e.target.value })}
          className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white"
        />
        <input
          type="text"
          placeholder="Category (e.g., Commercial Lending)"
          value={requestForm.category}
          onChange={(e) => setRequestForm({ ...requestForm, category: e.target.value })}
          className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white"
        />
        <input
          type="text"
          placeholder="Your Job Title *"
          value={requestForm.title}
          onChange={(e) => setRequestForm({ ...requestForm, title: e.target.value })}
          className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white"
        />
        <textarea
          placeholder="Brief description of what you do..."
          value={requestForm.description}
          onChange={(e) => setRequestForm({ ...requestForm, description: e.target.value })}
          className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white h-24 resize-none"
        />
        <button
          onClick={handleRequestSubmit}
          disabled={!requestForm.title}
          className="w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-700 text-white rounded-xl font-medium"
        >
          Submit Request
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search for your job title..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500"
        />
        {searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden z-10 max-h-60 overflow-y-auto">
            {searchResults.map((result) => (
              <button
                key={result.id}
                onClick={() => handleSearchSelect(result)}
                className="w-full px-4 py-3 text-left hover:bg-zinc-700 transition-colors"
              >
                <div className="font-medium text-white">{result.name}</div>
                <div className="text-xs text-zinc-400">
                  {result.category?.industry?.name} → {result.category?.name}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="text-center text-zinc-500 text-sm">or browse by industry</div>

      {/* Breadcrumb */}
      {step !== "industry" && (
        <div className="flex items-center gap-2 text-sm">
          <button onClick={() => { setStep("industry"); setSelectedIndustry(null); setSelectedCategory(null); }} className="text-violet-400 hover:text-violet-300">
            Industries
          </button>
          {selectedIndustry && (
            <>
              <span className="text-zinc-600">→</span>
              <button onClick={() => { setStep("category"); setSelectedCategory(null); }} className="text-violet-400 hover:text-violet-300">
                {selectedIndustry.icon} {selectedIndustry.name}
              </button>
            </>
          )}
          {selectedCategory && (
            <>
              <span className="text-zinc-600">→</span>
              <span className="text-zinc-300">{selectedCategory.name}</span>
            </>
          )}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="text-center py-8 text-zinc-400">Loading...</div>
      ) : step === "industry" ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {industries.map((industry) => (
            <button
              key={industry.id}
              onClick={() => handleIndustrySelect(industry)}
              className="p-4 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-violet-500 rounded-xl text-left transition-all"
            >
              <div className="text-2xl mb-2">{industry.icon}</div>
              <div className="font-medium text-white text-sm">{industry.name}</div>
            </button>
          ))}
        </div>
      ) : step === "category" ? (
        <div className="space-y-2">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => handleCategorySelect(category)}
              className="w-full p-4 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-violet-500 rounded-xl text-left transition-all flex items-center gap-3"
            >
              <span className="text-xl">{category.icon}</span>
              <span className="font-medium text-white">{category.name}</span>
            </button>
          ))}
        </div>
      ) : step === "job" ? (
        <div className="space-y-2">
          {jobs.map((job) => (
            <button
              key={job.id}
              onClick={() => handleJobSelect(job)}
              className="w-full p-4 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-violet-500 rounded-xl text-left transition-all"
            >
              <div className="font-medium text-white">{job.name}</div>
              {job.aliases && job.aliases.length > 0 && (
                <div className="text-xs text-zinc-500 mt-1">Also known as: {job.aliases.join(", ")}</div>
              )}
            </button>
          ))}
        </div>
      ) : null}

      {/* Can't find job */}
      <button
        onClick={() => setShowRequestForm(true)}
        className="w-full py-3 text-sm text-zinc-400 hover:text-white transition-colors"
      >
        Can't find your job? Request it →
      </button>
    </div>
  );
}