"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/server/auth";
import {
  addManualCandidate,
  clearSelection,
  deleteCandidate,
  generateCandidates,
  HookLabError,
  selectCandidate,
} from "@/server/hooks";

const id = z.string().min(1);

function message(err: unknown): string {
  if (err instanceof HookLabError) return err.message;
  return "Something went wrong.";
}

function revalidateIdea(ideaId: string): void {
  revalidatePath(`/hooks/${ideaId}`);
  revalidatePath(`/hooks`);
  revalidatePath(`/ideas/${ideaId}`);
}

export interface GenerateState {
  error?: string;
  added?: number;
}

export async function generateHooksAction(
  _prev: GenerateState,
  formData: FormData,
): Promise<GenerateState> {
  const user = await requireUser();
  const ideaId = id.safeParse(formData.get("ideaId"));
  if (!ideaId.success) return { error: "Missing idea." };
  try {
    const { added } = await generateCandidates(user.id, ideaId.data);
    revalidateIdea(ideaId.data);
    return { added };
  } catch (err) {
    return { error: message(err) };
  }
}

export interface AddHookState {
  error?: string;
  ok?: boolean;
}

export async function addHookAction(
  _prev: AddHookState,
  formData: FormData,
): Promise<AddHookState> {
  const user = await requireUser();
  const ideaId = id.safeParse(formData.get("ideaId"));
  const text = z.string().min(1, "Write a hook first.").max(400).safeParse(formData.get("text"));
  if (!ideaId.success) return { error: "Missing idea." };
  if (!text.success) return { error: text.error.issues[0].message };
  try {
    await addManualCandidate(user.id, ideaId.data, text.data);
    revalidateIdea(ideaId.data);
    return { ok: true };
  } catch (err) {
    return { error: message(err) };
  }
}

export interface CandidateActionState {
  error?: string;
  draftUpdated?: boolean;
}

export async function selectHookAction(
  _prev: CandidateActionState,
  formData: FormData,
): Promise<CandidateActionState> {
  const user = await requireUser();
  const candidateId = id.safeParse(formData.get("candidateId"));
  if (!candidateId.success) return { error: "Missing candidate." };
  try {
    const { ideaId, draftUpdated } = await selectCandidate(user.id, candidateId.data);
    revalidateIdea(ideaId);
    revalidatePath("/drafts");
    return { draftUpdated };
  } catch (err) {
    return { error: message(err) };
  }
}

export async function removeHookAction(
  _prev: CandidateActionState,
  formData: FormData,
): Promise<CandidateActionState> {
  const user = await requireUser();
  const candidateId = id.safeParse(formData.get("candidateId"));
  const ideaId = id.safeParse(formData.get("ideaId"));
  if (!candidateId.success) return { error: "Missing candidate." };
  try {
    await deleteCandidate(user.id, candidateId.data);
    if (ideaId.success) revalidateIdea(ideaId.data);
    return {};
  } catch (err) {
    return { error: message(err) };
  }
}

export async function clearSelectionAction(
  _prev: CandidateActionState,
  formData: FormData,
): Promise<CandidateActionState> {
  const user = await requireUser();
  const ideaId = id.safeParse(formData.get("ideaId"));
  if (!ideaId.success) return { error: "Missing idea." };
  try {
    await clearSelection(user.id, ideaId.data);
    revalidateIdea(ideaId.data);
    return {};
  } catch (err) {
    return { error: message(err) };
  }
}
