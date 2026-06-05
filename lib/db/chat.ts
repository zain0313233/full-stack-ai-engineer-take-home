import { prisma } from "./prisma";

export async function getChatSessions(userId: string) {
  return prisma.chatSession.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: 30,
    include: { _count: { select: { messages: true } } },
  });
}

export async function createChatSession(userId: string, title?: string) {
  return prisma.chatSession.create({ data: { userId, title } });
}

export async function updateSessionTitle(sessionId: string, userId: string, title: string) {
  return prisma.chatSession.update({
    where: { id: sessionId, userId },
    data: { title },
  });
}

export async function deleteChatSession(sessionId: string, userId: string) {
  return prisma.chatSession.delete({ where: { id: sessionId, userId } });
}

export async function getSessionMessages(sessionId: string, userId: string) {
  const session = await prisma.chatSession.findFirst({
    where: { id: sessionId, userId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  return session?.messages ?? [];
}

export async function appendMessage(
  sessionId: string,
  role: "user" | "assistant",
  content: string,
  metadata?: object
) {
  return prisma.chatMessage.create({
    data: { sessionId, role, content, metadata },
  });
}
