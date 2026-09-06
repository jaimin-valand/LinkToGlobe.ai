"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/server/auth";
import { parseTopics, saveKnowledge } from "@/server/knowledge/service";

const schema = z.object({
  headline: z.string().max(160).default(""),
  expertise: z.string().max(4000).default(""),
  audience: z.string().max(400).default(""),
  tone: z.string().max(200).default(""),
  topics: z.string().max(1000).default(""),
  sources: z.string().max(8000).default(""),
});

export interface KnowledgeFormState {
  ok?: boolean;
  error?: string;
}

export async function saveKnowledgeAction(
  _prev: KnowledgeFormState,
  formData: FormData,
): Promise<KnowledgeFormState> {
  const user = await requireUser();
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { topics, ...rest } = parsed.data;
  try {
    await saveKnowledge(user.id, { ...rest, topics: parseTopics(topics) });
  } catch (err) {
    return { error: (err as Error).message };
  }
  revalidatePath("/knowledge");
  return { ok: true };
}
