import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserBySupabaseId } from "@/lib/db/users";
import { uploadUserFile } from "@/lib/storage/bucket";
import { parseCSV } from "@/lib/utils/csv-parser";
import { importTransactionsForUser } from "@/lib/utils/import-pipeline";

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
    const storageUrl = await uploadUserFile(dbUser.id, file.name, fileBuffer, "text/csv");

    const { transactions, skipped, errors } = parseCSV(text);

    if (transactions.length === 0) {
      return NextResponse.json({ error: "No valid transactions found", details: errors }, { status: 422 });
    }

    const result = await importTransactionsForUser(dbUser.id, transactions);

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
