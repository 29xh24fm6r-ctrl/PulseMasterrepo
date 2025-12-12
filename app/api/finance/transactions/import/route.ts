// Finance Transactions Import API
// app/api/finance/transactions/import/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { importTransactionsFromCsv } from "@/lib/finance/transactions";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { accountId, csv } = body;

    if (!accountId || !csv) {
      return NextResponse.json(
        { error: "accountId and csv are required" },
        { status: 400 }
      );
    }

    const result = await importTransactionsFromCsv(userId, accountId, csv);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[FinanceTransactionsImport] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to import transactions" },
      { status: 500 }
    );
  }
}




