import { prisma } from "./prisma";

export async function getUserMemory(userId: string): Promise<Record<string, string>> {
  const entries = await prisma.userMemory.findMany({ where: { userId } });
  return Object.fromEntries(entries.map((e) => [e.key, e.value]));
}

export async function setUserMemory(userId: string, key: string, value: string) {
  return prisma.userMemory.upsert({
    where: { userId_key: { userId, key } },
    create: { userId, key, value },
    update: { value },
  });
}

export async function setUserMemoryBatch(userId: string, entries: Record<string, string>) {
  await Promise.all(
    Object.entries(entries).map(([key, value]) => setUserMemory(userId, key, value))
  );
}
