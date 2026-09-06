"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/server/auth";
import { getAi } from "@/server/ai";
import { getKnowledge } from "@/server/knowledge/service";
import * as content from "@/server/content/service";
import type { AiReviewNote } from "@/server/ai";

async function currentUserId(): Promise<string> {
  return (await requireUser()).id;
}

function fail(err: unknown): { error: string } {
  const message = err instanceof Error ? err.message : "Something went wrong.";
  return { error: message };
}

// ── Create / edit ────────────────────────────────────────────────────────────

export interface CreateState {
  error?: string;
}

export async function createDraftAction(
  _prev: CreateState,
  formData: FormData,
): Promise<CreateState> {
  const userId = await currentUserId();
  const title = z.string().min(1, "A title is required.").max(200).safeParse(formData.get("title"));
  if (!title.success) return { error: title.error.issues[0].message };
  let id: string;
  try {
    id = (await content.createDraft(userId, title.data)).id;
  } catch (err) {
    return fail(err);
  }
  redirect(`/drafts/${id}`);
}

const editSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1, "A title is required.").max(200),
  hook: z.string().max(2000).default(""),
  body: z.string().max(50000).default(""),
  sourceNotes: z.string().max(50000).default(""),
});

export interface EditState {
  ok?: boolean;
  error?: string;
}

export async function saveDraftAction(_prev: EditState, formData: FormData): Promise<EditState> {
  const userId = await currentUserId();
  const parsed = editSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { id, ...data } = parsed.data;
  try {
    await content.updateDraft(userId, id, data);
  } catch (err) {
    return fail(err);
  }
  revalidatePath(`/drafts/${id}`);
  return { ok: true };
}

// ── Lifecycle (simple form posts) ────────────────────────────────────────────

async function lifecycle(
  formData: FormData,
  run: (userId: string, id: string) => Promise<unknown>,
): Promise<void> {
  const userId = await currentUserId();
  const id = String(formData.get("id") ?? "");
  await run(userId, id);
  revalidatePath(`/drafts/${id}`);
  revalidatePath("/drafts");
  revalidatePath("/approvals");
}

export async function deleteDraftAction(formData: FormData): Promise<void> {
  const userId = await currentUserId();
  await content.deleteDraft(userId, String(formData.get("id") ?? ""));
  revalidatePath("/drafts");
  redirect("/drafts");
}

export async function submitDraftAction(formData: FormData) {
  await lifecycle(formData, content.submitForReview);
}
export async function rerunQualityAction(formData: FormData) {
  await lifecycle(formData, content.rerunQuality);
}
export async function sendToApprovalAction(formData: FormData) {
  await lifecycle(formData, content.sendToApproval);
}
export async function returnToDraftAction(formData: FormData) {
  await lifecycle(formData, content.returnToDraft);
}
export async function approveAction(formData: FormData) {
  await lifecycle(formData, content.approveAndPublish);
}

const rejectSchema = z.object({
  id: z.string().min(1),
  reason: z.string().min(1, "A reason is required."),
});

export interface RejectState {
  error?: string;
}

export async function rejectAction(_prev: RejectState, formData: FormData): Promise<RejectState> {
  const userId = await currentUserId();
  const parsed = rejectSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try {
    await content.reject(userId, parsed.data.id, parsed.data.reason);
  } catch (err) {
    return fail(err);
  }
  revalidatePath(`/drafts/${parsed.data.id}`);
  revalidatePath("/approvals");
  return {};
}

// ── AI assist (returns data to the client) ───────────────────────────────────

export interface AiState {
  ideas?: string[];
  hooks?: string[];
  body?: string;
  notes?: AiReviewNote[];
  error?: string;
  disabled?: boolean;
}

export async function aiAssistAction(_prev: AiState, formData: FormData): Promise<AiState> {
  const userId = await currentUserId();
  const kind = String(formData.get("kind") ?? "");
  const ai = getAi();
  if (!ai.enabled) {
    return { disabled: true, error: "AI assistance is off (AI_PROVIDER=manual)." };
  }

  const k = await getKnowledge(userId);
  const knowledge = {
    headline: k?.headline ?? "",
    expertise: k?.expertise ?? "",
    audience: k?.audience ?? "",
    tone: k?.tone ?? "",
    topics: k?.topics ?? [],
  };
  const draft = {
    title: String(formData.get("title") ?? ""),
    hook: String(formData.get("hook") ?? ""),
    body: String(formData.get("body") ?? ""),
    sourceNotes: String(formData.get("sourceNotes") ?? ""),
  };

  if (kind === "ideas") {
    const r = await ai.suggestIdeas(knowledge);
    return r.ok ? { ideas: r.data } : { error: r.error };
  }
  if (kind === "hook") {
    const r = await ai.suggestHook({ ...draft, knowledge });
    return r.ok ? { hooks: r.data } : { error: r.error };
  }
  if (kind === "expand") {
    const r = await ai.expandDraft({ ...draft, knowledge });
    return r.ok ? { body: r.data } : { error: r.error };
  }
  if (kind === "review") {
    const r = await ai.review(draft);
    return r.ok ? { notes: r.data } : { error: r.error };
  }
  return { error: "Unknown AI action." };
}
