// Finance Accounts API
// app/api/finance/accounts/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getUserAccounts, upsertAccount } from "@/lib/finance/accounts";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const accounts = await getUserAccounts(userId);
    return NextResponse.json({ accounts });
  } catch (err: any) {
    console.error("[FinanceAccounts] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to get accounts" },
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
    const account = await upsertAccount(userId, body);
    return NextResponse.json({ account });
  } catch (err: any) {
    console.error("[FinanceAccounts] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create/update account" },
      { status: 500 }
    );
  }
}




