import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "json";
    const dataType = searchParams.get("type") || "all";

    const exportData = await generateExportData(dataType);

    if (format === "csv") {
      const csv = convertToCSV(exportData, dataType);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="pulse-os-export-${dataType}-${Date.now()}.csv"`,
        },
      });
    }

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="pulse-os-export-${dataType}-${Date.now()}.json"`,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to export" }, { status: 500 });
  }
}

async function generateExportData(dataType: string) {
  const data: Record<string, any> = { exportedAt: new Date().toISOString(), version: "1.0" };
  
  if (dataType === "all" || dataType === "tasks") {
    data.tasks = [
      { id: "t1", name: "Review Q4 pipeline", status: "completed", priority: "high" },
      { id: "t2", name: "Send follow-ups", status: "in_progress", priority: "medium" },
    ];
  }
  if (dataType === "all" || dataType === "deals") {
    data.deals = [
      { id: "d1", name: "TechCorp Enterprise", value: 150000, stage: "Negotiation" },
      { id: "d2", name: "Acme Upgrade", value: 75000, stage: "Proposal" },
    ];
  }
  if (dataType === "all" || dataType === "contacts") {
    data.contacts = [
      { id: "c1", name: "Sarah Chen", company: "TechCorp", score: 85, tier: "platinum" },
    ];
  }
  if (dataType === "all" || dataType === "habits") {
    data.habits = [
      { id: "h1", name: "Morning Routine", streak: 12, completions: 45 },
    ];
  }
  if (dataType === "all" || dataType === "goals") {
    data.goals = [
      { id: "g1", title: "Close $500K in Q4", progress: 73, status: "in_progress" },
    ];
  }
  return data;
}

function convertToCSV(data: any, dataType: string): string {
  const lines: string[] = [];
  if (data.tasks) {
    lines.push("=== TASKS ===", "id,name,status,priority");
    data.tasks.forEach((t: any) => lines.push(`${t.id},"${t.name}",${t.status},${t.priority}`));
  }
  if (data.deals) {
    lines.push("", "=== DEALS ===", "id,name,value,stage");
    data.deals.forEach((d: any) => lines.push(`${d.id},"${d.name}",${d.value},${d.stage}`));
  }
  return lines.join("\n");
}

export async function POST() {
  return NextResponse.json({ error: "Import not yet implemented" }, { status: 501 });
}
