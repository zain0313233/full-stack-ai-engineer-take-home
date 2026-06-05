import { prisma } from "./prisma";

export async function getBudgets(userId: string) {
  return prisma.budget.findMany({ where: { userId }, orderBy: { category: "asc" } });
}

export async function upsertBudget(userId: string, category: string, amount: number, period = "monthly") {
  return prisma.budget.upsert({
    where: { userId_category: { userId, category } },
    create: { userId, category, amount, period },
    update: { amount, period },
  });
}

export async function deleteBudget(userId: string, category: string) {
  return prisma.budget.deleteMany({ where: { userId, category } });
}
