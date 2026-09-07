"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/server/auth";
import { createDraftFromIdea, NotFoundError } from "@/server/content/service";

export interface ConvertIdeaState {
  error?: string;
}

const ideaId = z.string().min(1);

export async function convertIdeaToDraftAction(
  _prev: ConvertIdeaState,
  formData: FormData,
): Promise<ConvertIdeaState> {
  const user = await requireUser();
  const parsed = ideaId.safeParse(formData.get("ideaId"));
  if (!parsed.success) return { error: "Missing idea." };

  let draftId: string;
  try {
    ({ draftId } = await createDraftFromIdea(user.id, parsed.data));
  } catch (err) {
    if (err instanceof NotFoundError) return { error: "That idea no longer exists." };
    return { error: "The draft could not be created." };
  }

  revalidatePath(`/ideas/${parsed.data}`);
  revalidatePath("/ideas");
  revalidatePath("/drafts");
  redirect(`/drafts/${draftId}`);
}
