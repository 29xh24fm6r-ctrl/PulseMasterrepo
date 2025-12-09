"use client";
import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, FileJson, FileText, Check, Loader2 } from "lucide-react";

export default function ExportPage() {
  const [format, setFormat] = useState<"json" | "csv">("json");
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch(`/api/export?format=${format}&type=all`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pulse-os-export.${format}`;
      a.click();
      setExported(true);
      setTimeout(() => setExported(false), 3000);
    } finally {
      setExporting(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/settings" className="p-2 hover:bg-zinc-800 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Download className="w-7 h-7 text-violet-400" />
              Export Data
            </h1>
            <p className="text-zinc-400 text-sm">Download your Pulse OS data</p>
          </div>
        </div>

        <div className="bg-zinc-900/80 rounded-xl border border-zinc-800 p-6">
          <h2 className="font-semibold mb-4">Export Format</h2>
          <div className="flex gap-4">
            {(["json", "csv"] as const).map((f) => (
              <button key={f} onClick={() => setFormat(f)}
                className={`flex-1 p-4 rounded-xl border-2 ${format === f ? "border-violet-500 bg-violet-500/10" : "border-zinc-700"}`}>
                {f === "json" ? <FileJson className="w-8 h-8 mx-auto mb-2" /> : <FileText className="w-8 h-8 mx-auto mb-2" />}
                <div className="font-medium">{f.toUpperCase()}</div>
              </button>
            ))}
          </div>
        </div>

        <button onClick={handleExport} disabled={exporting}
          className={`w-full py-4 rounded-xl font-medium flex items-center justify-center gap-3 ${exported ? "bg-emerald-600" : "bg-violet-600 hover:bg-violet-500"}`}>
          {exporting ? <><Loader2 className="w-5 h-5 animate-spin" />Exporting...</> : 
           exported ? <><Check className="w-5 h-5" />Downloaded!</> : 
           <><Download className="w-5 h-5" />Export {format.toUpperCase()}</>}
        </button>
      </div>
    </main>
  );
}
