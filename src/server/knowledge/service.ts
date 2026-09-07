import "server-only";
import { prisma } from "@/lib/db";
import type { KnowledgeProfile } from "@/generated/prisma";

export interface KnowledgeInput {
  headline: string;
  expertise: string;
  audience: string;
  tone: string;
  topics: string[];
  sources: string;
}

export function getKnowledge(userId: string): Promise<KnowledgeProfile | null> {
  return prisma.knowledgeProfile.findUnique({ where: { userId } });
}

export function parseTopics(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(/[,\n]/)
        .map((t) => t.trim())
        .filter(Boolean),
    ),
  ).slice(0, 20);
}

export async function saveKnowledge(
  userId: string,
  input: KnowledgeInput,
): Promise<KnowledgeProfile> {
  const data = {
    headline: input.headline.trim(),
    expertise: input.expertise.trim(),
    audience: input.audience.trim(),
    tone: input.tone.trim(),
    topics: input.topics,
    sources: input.sources.trim(),
  };
  const saved = await prisma.knowledgeProfile.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });
  await prisma.activityLog.create({ data: { userId, action: "knowledge.saved" } });
  return saved;
}
