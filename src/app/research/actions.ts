"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/server/auth";
import {
  NotFoundError,
  RateLimitedError,
  ResearchError,
  runResearch,
  saveSignalAsIdea,
  safeMessageFor,
} from "@/server/research";

const querySchema = z
  .string()
  .trim()
  .min(3, "Enter at least 3 characters.")
  .max(200, "That search is too long.");

export interface RunResearchState {
  error?: string;
  notConfigured?: boolean;
}

export async function runResearchAction(
  _prev: RunResearchState,
  formData: FormData,
): Promise<RunResearchState> {
  const user = await requireUser();
  const parsed = querySchema.safeParse(formData.get("query"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  let runId: string;
  try {
    runId = (await runResearch(user.id, parsed.data)).runId;
  } catch (err) {
    if (err instanceof ResearchError && err.code === "not_configured") {
      return { notConfigured: true };
    }
    if (err instanceof RateLimitedError) return { error: err.message };
    if (err instanceof ResearchError) return { error: safeMessageFor(err) };
    return { error: "The research run could not be completed." };
  }
  redirect(`/research/${runId}`);
}

export interface SaveIdeaState {
  ok?: boolean;
  ideaId?: string;
  error?: string;
}

const idSchema = z.string().min(1);

export async function saveIdeaAction(
  _prev: SaveIdeaState,
  formData: FormData,
): Promise<SaveIdeaState> {
  const user = await requireUser();
  const signalId = idSchema.safeParse(formData.get("signalId"));
  const runId = idSchema.safeParse(formData.get("runId"));
  if (!signalId.success) return { error: "Missing signal." };

  try {
    const { ideaId } = await saveSignalAsIdea(user.id, signalId.data);
    if (runId.success) revalidatePath(`/research/${runId.data}`);
    revalidatePath("/ideas");
    return { ok: true, ideaId };
  } catch (err) {
    if (err instanceof NotFoundError) return { error: "That signal no longer exists." };
    return { error: "Could not save the idea." };
  }
}
