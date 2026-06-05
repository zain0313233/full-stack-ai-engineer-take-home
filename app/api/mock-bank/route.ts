import { NextResponse } from "next/server";
import { getMockBankFeed } from "@/lib/mock-bank/feed";

// Mock bank endpoint — simulates a real bank's transaction feed.
// In a real product this would be a Plaid/TrueLayer webhook.
export async function GET() {
  return NextResponse.json(getMockBankFeed());
}
