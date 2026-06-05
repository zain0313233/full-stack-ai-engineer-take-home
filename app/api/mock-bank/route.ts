import { NextResponse } from "next/server";

// Mock bank endpoint — simulates a real bank's transaction feed.
// In a real product this would be a Plaid/TrueLayer webhook.
export async function GET() {
  const now = new Date();

  const transactions = [
    { date: sub(now, 2),  merchant: "Whole Foods Market",   amount: 93.41, category: "Groceries" },
    { date: sub(now, 3),  merchant: "Netflix",              amount: 15.99, category: "Subscriptions" },
    { date: sub(now, 4),  merchant: "Uber",                 amount: 14.20, category: "Transport" },
    { date: sub(now, 5),  merchant: "Chipotle",             amount: 13.75, category: "Dining" },
    { date: sub(now, 6),  merchant: "Amazon",               amount: 67.99, category: "Shopping" },
    { date: sub(now, 7),  merchant: "Spotify",              amount: 9.99,  category: "Subscriptions" },
    { date: sub(now, 8),  merchant: "Shell Gas Station",    amount: 58.00, category: "Transport" },
    { date: sub(now, 10), merchant: "Salary Deposit",       amount: 3500,  category: "Income" },
    { date: sub(now, 11), merchant: "Planet Fitness",       amount: 24.99, category: "Subscriptions" },
    { date: sub(now, 12), merchant: "CVS Pharmacy",         amount: 22.40, category: "Healthcare" },
    { date: sub(now, 14), merchant: "Starbucks",            amount: 6.75,  category: "Dining" },
    { date: sub(now, 15), merchant: "Con Edison",           amount: 110.0, category: "Utilities" },
    { date: sub(now, 16), merchant: "T-Mobile",             amount: 45.00, category: "Utilities" },
    { date: sub(now, 18), merchant: "Whole Foods Market",   amount: 78.50, category: "Groceries" },
    { date: sub(now, 20), merchant: "Airbnb",               amount: 320.0, category: "Travel" },
  ].map((t) => ({
    ...t,
    date: t.date.toISOString().slice(0, 10),
  }));

  return NextResponse.json({
    account: {
      id: "mock-account-001",
      name: "Mock Checking Account",
      balance: 4821.33,
      currency: "USD",
    },
    transactions,
    generatedAt: now.toISOString(),
  });
}

function sub(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - days);
  return d;
}
