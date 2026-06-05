import { cache } from "react";
import { prisma } from "./prisma";

export const ensureDbUser = cache(
  async (supabaseId: string, email: string, name?: string) => {
    return prisma.user.upsert({
      where: { supabaseId },
      create: { supabaseId, email, name: name ?? email.split("@")[0] },
      update: { email, ...(name ? { name } : {}) },
    });
  }
);

export const getUserBySupabaseId = cache(async (supabaseId: string) => {
  return prisma.user.findUnique({ where: { supabaseId } });
});

/** @deprecated Use ensureDbUser in server components for request-level deduping */
export async function upsertUser(supabaseId: string, email: string, name?: string) {
  return ensureDbUser(supabaseId, email, name);
}
