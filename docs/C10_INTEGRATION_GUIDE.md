# C10 Provider Health Integration Guide

This guide shows how to integrate the C10 provider health panels into your UI surfaces.

## Step 1: Deal Workspace Integration

### Example: Deal Cockpit Page

Add the panels to `app/deals/[dealId]/cockpit/page.tsx`:

```tsx
import { useLatestJobId } from "@/hooks/useLatestJobId";
import ProviderHealthPanel from "@/components/jobs/ProviderHealthPanel";
import JobTimeline from "@/components/jobs/JobTimeline";

export default function DealCockpitPage() {
  const params = useParams();
  const dealId = params.dealId as string;
  
  // Get latest job for this deal
  const { jobId: latestJobId } = useLatestJobId("deal", dealId);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Existing deal header/content */}
        
        {/* Right rail - System Health */}
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2">
            {/* Main deal content */}
          </div>
          
          <div className="col-span-1 space-y-6">
            {/* System Health Card Stack */}
            <ProviderHealthPanel />
          </div>
        </div>

        {/* Job Timeline below upload/processing UI */}
        {latestJobId && (
          <JobTimeline jobId={latestJobId} />
        )}
      </div>
    </div>
  );
}
```

## Step 2: Upload Box / Document Processing

### Pattern: Store job_id when job is launched

```tsx
"use client";

import { useState } from "react";
import JobTimeline from "@/components/jobs/JobTimeline";

export default function UploadBox() {
  const [jobId, setJobId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });
      
      const data = await res.json();
      
      // Store job_id from response
      if (data.job_id) {
        setJobId(data.job_id);
      }
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      {/* Upload UI */}
      <input type="file" onChange={(e) => handleUpload(e.target.files?.[0]!)} />
      
      {/* Show timeline immediately when job starts */}
      {jobId && (
        <div className="mt-4">
          <JobTimeline jobId={jobId} />
        </div>
      )}
    </div>
  );
}
```

## Step 3: Global Admin/Ops Page

The `/ops/jobs` page is already created at `app/ops/jobs/page.tsx` and includes `<ProviderHealthPanel />`.

Access it at: `/ops/jobs`

## Step 4: Using the Latest Job Helper

### Hook Usage

```tsx
import { useLatestJobId } from "@/hooks/useLatestJobId";

// In your component
const { jobId, loading } = useLatestJobId("deal", dealId);
const { jobId } = useLatestJobId("contact", contactId);
const { jobId } = useLatestJobId("upload", uploadId);
```

### Direct API Usage

```tsx
// Get latest job for a deal
const res = await fetch(`/api/jobs/by-entity?deal_id=${dealId}`);
const { job_id } = await res.json();

// Get latest job for a contact
const res = await fetch(`/api/jobs/by-entity?contact_id=${contactId}`);
const { job_id } = await res.json();

// Get latest job for an upload
const res = await fetch(`/api/jobs/by-entity?upload_id=${uploadId}`);
const { job_id } = await res.json();
```

## Component Props

### JobTimeline

```tsx
<JobTimeline jobId={string | null} />
```

- `jobId`: The job ID to display events for, or `null` to show "No processing jobs yet"
- Auto-refreshes every 5 seconds
- Groups repeated heartbeat/lease events
- Shows provider status and retry explanations

### ProviderHealthPanel

```tsx
<ProviderHealthPanel />
```

- No props required
- Shows all providers with health status
- Auto-refreshes every 15 seconds
- Displays failure rates, totals, and window information

## Integration Checklist

- [ ] Add `<ProviderHealthPanel />` to deal workspace right rail
- [ ] Add `<JobTimeline jobId={latestJobId} />` below upload/processing UI
- [ ] Store `job_id` in component state when job is launched
- [ ] Use `useLatestJobId` hook to get latest job for entities
- [ ] Verify `/ops/jobs` page is accessible
- [ ] Test with real jobs to see timeline updates
- [ ] Verify provider health panel shows providers

