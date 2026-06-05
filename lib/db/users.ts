import { prisma } from "./prisma";

export async function upsertUser(supabaseId: string, email: string, name?: string) {
  return prisma.user.upsert({
    where: { supabaseId },
    create: { supabaseId, email, name: name ?? email.split("@")[0] },
    update: { email, ...(name ? { name } : {}) },
  });
}

export async function getUserBySupabaseId(supabaseId: string) {
  return prisma.user.findUnique({ where: { supabaseId } });
}
