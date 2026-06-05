import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { getUserBySupabaseId } from "@/lib/db/users";
import { createTransactionsBatch, upsertSpendingSummary } from "@/lib/db/transactions";
import { parseCSV } from "@/lib/utils/csv-parser";
import { detectRecurring, detectAnomalies } from "@/lib/utils/transaction-analysis";

const BUCKET = "Personal Finance Assistant-buck";

async function uploadCSVToStorage(
  userId: string,
  fileName: string,
  fileBuffer: ArrayBuffer
): Promise<string | null> {
  try {
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const path = `${userId}/${Date.now()}-${fileName}`;
    const { error } = await admin.storage
      .from(BUCKET)
      .upload(path, fileBuffer, { contentType: "text/csv", upsert: false });

    if (error) {
      console.warn("[import] Storage upload skipped:", error.message);
      return null;
    }

    const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  } catch (err) {
    console.warn("[import] Storage upload error:", err);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await getUserBySupabaseId(authUser.id);
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    // Read file once — reuse buffer for both storage + parsing
    const fileBuffer = await file.arrayBuffer();
    const text = new TextDecoder().decode(fileBuffer);

    // Upload original CSV to Supabase Storage (non-blocking — don't fail if storage errors)
    const storageUrl = await uploadCSVToStorage(dbUser.id, file.name, fileBuffer);

    const { transactions, skipped, errors } = parseCSV(text);

    if (transactions.length === 0) {
      return NextResponse.json({ error: "No valid transactions found", details: errors }, { status: 422 });
    }

    // Detect recurring and anomalous transactions
    const withFlags = detectRecurring(transactions);
    const withAnomalies = detectAnomalies(withFlags);

    // Batch insert
    await createTransactionsBatch(dbUser.id, withAnomalies);

    // Rebuild spending summaries per (year, month, category)
    const summaryMap = new Map<string, { total: number; count: number }>();
    for (const tx of withAnomalies) {
      const key = `${tx.date.getFullYear()}|${tx.date.getMonth() + 1}|${tx.category}`;
      const existing = summaryMap.get(key) ?? { total: 0, count: 0 };
      summaryMap.set(key, { total: existing.total + tx.amount, count: existing.count + 1 });
    }

    await Promise.all(
      Array.from(summaryMap.entries()).map(([key, { total, count }]) => {
        const [year, month, category] = key.split("|");
        return upsertSpendingSummary(
          dbUser.id,
          parseInt(year),
          parseInt(month),
          category,
          total,
          count
        );
      })
    );

    return NextResponse.json({
      imported: withAnomalies.length,
      skipped,
      recurring: withAnomalies.filter((t) => t.isRecurring).length,
      anomalies: withAnomalies.filter((t) => t.isAnomaly).length,
      storageUrl,
      errors: errors.slice(0, 3),
    });
  } catch (err) {
    console.error("[import]", err);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}
