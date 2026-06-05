import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { getMockBankFeed } from "@/lib/mock-bank/feed";

// Mock bank endpoint — simulates a real bank's transaction feed.
// Requires auth; rate-limited via middleware.
export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  return NextResponse.json(getMockBankFeed());
}
