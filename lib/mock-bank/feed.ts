export interface MockBankTransaction {
  date: string;
  merchant: string;
  amount: number;
  category: string;
}

export interface MockBankFeed {
  account: {
    id: string;
    name: string;
    balance: number;
    currency: string;
  };
  transactions: MockBankTransaction[];
  generatedAt: string;
}

function sub(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - days);
  return d;
}

export function getMockBankFeed(): MockBankFeed {
  const now = new Date();

  const transactions: MockBankTransaction[] = [
    { date: sub(now, 2).toISOString().slice(0, 10), merchant: "Whole Foods Market", amount: 93.41, category: "Groceries" },
    { date: sub(now, 3).toISOString().slice(0, 10), merchant: "Netflix", amount: 15.99, category: "Subscriptions" },
    { date: sub(now, 4).toISOString().slice(0, 10), merchant: "Uber", amount: 14.2, category: "Transport" },
    { date: sub(now, 5).toISOString().slice(0, 10), merchant: "Chipotle", amount: 13.75, category: "Dining" },
    { date: sub(now, 6).toISOString().slice(0, 10), merchant: "Amazon", amount: 67.99, category: "Shopping" },
    { date: sub(now, 7).toISOString().slice(0, 10), merchant: "Spotify", amount: 9.99, category: "Subscriptions" },
    { date: sub(now, 8).toISOString().slice(0, 10), merchant: "Shell Gas Station", amount: 58, category: "Transport" },
    { date: sub(now, 10).toISOString().slice(0, 10), merchant: "Salary Deposit", amount: 3500, category: "Income" },
    { date: sub(now, 11).toISOString().slice(0, 10), merchant: "Planet Fitness", amount: 24.99, category: "Subscriptions" },
    { date: sub(now, 12).toISOString().slice(0, 10), merchant: "CVS Pharmacy", amount: 22.4, category: "Healthcare" },
    { date: sub(now, 14).toISOString().slice(0, 10), merchant: "Starbucks", amount: 6.75, category: "Dining" },
    { date: sub(now, 15).toISOString().slice(0, 10), merchant: "Con Edison", amount: 110, category: "Utilities" },
    { date: sub(now, 16).toISOString().slice(0, 10), merchant: "T-Mobile", amount: 45, category: "Utilities" },
    { date: sub(now, 18).toISOString().slice(0, 10), merchant: "Whole Foods Market", amount: 78.5, category: "Groceries" },
    { date: sub(now, 20).toISOString().slice(0, 10), merchant: "Airbnb", amount: 320, category: "Travel" },
  ];

  return {
    account: {
      id: "mock-account-001",
      name: "Mock Checking Account",
      balance: 4821.33,
      currency: "USD",
    },
    transactions,
    generatedAt: now.toISOString(),
  };
}
