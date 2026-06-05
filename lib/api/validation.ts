import { z } from "zod";
import { CATEGORIES } from "@/lib/utils/formatters";

const expenseCategories = CATEGORIES.filter((c) => c !== "Income");

export const budgetSchema = z.object({
  category: z.enum(expenseCategories as [string, ...string[]]),
  amount: z.coerce.number().positive().max(10_000_000),
  period: z.enum(["monthly", "weekly"]).optional(),
});

export const memoryKeySchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-zA-Z0-9_-]+$/);

export const MAX_CSV_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGE_BASE64_CHARS = 7 * 1024 * 1024;
