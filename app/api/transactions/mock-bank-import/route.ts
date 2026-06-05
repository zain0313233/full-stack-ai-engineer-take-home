import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { getMockBankFeed } from "@/lib/mock-bank/feed";
import type { ParsedTransaction } from "@/lib/utils/csv-parser";
import { importTransactionsForUser } from "@/lib/utils/import-pipeline";

export async function POST() {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return auth.response;

    const feed = getMockBankFeed();
    const transactions: ParsedTransaction[] = feed.transactions.map((tx) => ({
      date: new Date(tx.date),
      merchant: tx.merchant,
      amount: tx.amount,
      category: tx.category,
      description: tx.merchant,
      source: "mock_bank",
      rawData: { accountId: feed.account.id, importedFrom: "mock_bank" },
    }));

    const result = await importTransactionsForUser(auth.ctx.dbUser.id, transactions);

    if (result.imported === 0 && result.skipped > 0) {
      return NextResponse.json({
        ...result,
        account: feed.account,
        message: "Mock bank already connected — no new transactions to import.",
      });
    }

    return NextResponse.json({
      ...result,
      account: feed.account,
      source: "mock_bank",
      errors: [],
    });
  } catch (err) {
    console.error("[mock-bank-import]", err);
    return NextResponse.json({ error: "Mock bank import failed" }, { status: 500 });
  }
}
