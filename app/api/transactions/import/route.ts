import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { MAX_CSV_BYTES } from "@/lib/api/validation";
import { uploadUserFile } from "@/lib/storage/bucket";
import { parseCSV } from "@/lib/utils/csv-parser";
import { importTransactionsForUser } from "@/lib/utils/import-pipeline";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return auth.response;

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    if (file.size > MAX_CSV_BYTES) {
      return NextResponse.json({ error: "File too large (max 5 MB)" }, { status: 413 });
    }

    if (!file.name.toLowerCase().endsWith(".csv") && file.type !== "text/csv") {
      return NextResponse.json({ error: "Only CSV files are allowed" }, { status: 400 });
    }

    // Read file once — reuse buffer for both storage + parsing
    const fileBuffer = await file.arrayBuffer();
    const text = new TextDecoder().decode(fileBuffer);

    // Upload original CSV to Supabase Storage (non-blocking — don't fail if storage errors)
    const storageUrl = await uploadUserFile(
      auth.ctx.dbUser.id,
      file.name,
      fileBuffer,
      "text/csv"
    );

    const { transactions, skipped, errors } = parseCSV(text);

    if (transactions.length === 0) {
      return NextResponse.json({ error: "No valid transactions found", details: errors }, { status: 422 });
    }

    const result = await importTransactionsForUser(auth.ctx.dbUser.id, transactions);

    return NextResponse.json({
      ...result,
      skipped: skipped + result.skipped,
      storageUrl,
      errors: errors.slice(0, 3),
    });
  } catch (err) {
    console.error("[import]", err);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}
