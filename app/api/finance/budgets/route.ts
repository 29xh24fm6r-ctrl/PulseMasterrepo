// Finance Budgets API
// app/api/finance/budgets/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getBudgetsForMonth, upsertBudget, getBudgetVsActualForMonth } from "@/lib/finance/budgets";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const month = searchParams.get("month");
    const vsActual = searchParams.get("vsActual") === "true";

    if (!month) {
      return NextResponse.json({ error: "month parameter required" }, { status: 400 });
    }

    if (vsActual) {
      const budgetVsActual = await getBudgetVsActualForMonth(userId, month);
      return NextResponse.json({ budgets: budgetVsActual });
    } else {
      const budgets = await getBudgetsForMonth(userId, month);
      return NextResponse.json({ budgets });
    }
  } catch (err: any) {
    console.error("[FinanceBudgets] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to get budgets" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const budget = await upsertBudget(userId, body);
    return NextResponse.json({ budget });
  } catch (err: any) {
    console.error("[FinanceBudgets] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create/update budget" },
      { status: 500 }
    );
  }
}




