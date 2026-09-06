import "server-only";
import { prisma } from "@/lib/db";
import type { ContentDraft, ContentState, Prisma } from "@/generated/prisma";
import { runQualityChecks, type QualityResult } from "@/server/quality/engine";
import { assertTransition, type ContentTransition } from "./state";

class NotFoundError extends Error {}
export { NotFoundError };
export { TransitionError } from "./state";

async function log(
  tx: Prisma.TransactionClient,
  userId: string,
  draftId: string | null,
  action: string,
  detail?: Prisma.InputJsonValue,
) {
  await tx.activityLog.create({ data: { userId, draftId, action, detail } });
}

async function owned(userId: string, id: string): Promise<ContentDraft> {
  const draft = await prisma.contentDraft.findFirst({ where: { id, userId } });
  if (!draft) throw new NotFoundError("Draft not found.");
  return draft;
}

export function listDrafts(userId: string, state?: ContentState) {
  return prisma.contentDraft.findMany({
    where: { userId, ...(state ? { state } : {}) },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getDraftWithReports(userId: string, id: string) {
  const draft = await prisma.contentDraft.findFirst({
    where: { id, userId },
    include: { qualityReports: { orderBy: { createdAt: "desc" }, take: 5 } },
  });
  if (!draft) throw new NotFoundError("Draft not found.");
  return draft;
}

export async function createDraft(userId: string, title: string): Promise<ContentDraft> {
  const clean = title.trim();
  if (!clean) throw new Error("A title is required.");
  return prisma.$transaction(async (tx) => {
    const draft = await tx.contentDraft.create({ data: { userId, title: clean } });
    await log(tx, userId, draft.id, "draft.created", { title: clean });
    return draft;
  });
}

export async function updateDraft(
  userId: string,
  id: string,
  data: Pick<ContentDraft, "title" | "hook" | "body" | "sourceNotes">,
): Promise<ContentDraft> {
  const draft = await owned(userId, id);
  if (draft.state !== "DRAFT") {
    throw new Error("Only drafts in the Draft state can be edited.");
  }
  if (!data.title.trim()) throw new Error("A title is required.");
  return prisma.$transaction(async (tx) => {
    const updated = await tx.contentDraft.update({
      where: { id },
      data: {
        title: data.title.trim(),
        hook: data.hook,
        body: data.body,
        sourceNotes: data.sourceNotes,
      },
    });
    await log(tx, userId, id, "draft.updated");
    return updated;
  });
}

export async function deleteDraft(userId: string, id: string): Promise<void> {
  const draft = await owned(userId, id);
  if (draft.state === "PUBLISHED") {
    throw new Error("Published content cannot be deleted (it is part of the record).");
  }
  await prisma.$transaction(async (tx) => {
    await tx.contentDraft.delete({ where: { id } });
    await log(tx, userId, null, "draft.deleted", { draftId: id, title: draft.title });
  });
}

function persistQuality(tx: Prisma.TransactionClient, draftId: string, result: QualityResult) {
  return tx.qualityReport.create({
    data: {
      draftId,
      passed: result.passed,
      score: result.score,
      checks: result.checks as unknown as Prisma.InputJsonValue,
    },
  });
}

/** DRAFT -> QUALITY_CHECK, running the quality engine as part of the move. */
export async function submitForReview(userId: string, id: string) {
  const draft = await owned(userId, id);
  const to = assertTransition(draft.state, "submit");
  const result = runQualityChecks(draft);
  return prisma.$transaction(async (tx) => {
    await persistQuality(tx, id, result);
    const updated = await tx.contentDraft.update({
      where: { id },
      data: { state: to, submittedAt: new Date() },
    });
    await log(tx, userId, id, "draft.submitted", { score: result.score, passed: result.passed });
    return { draft: updated, result };
  });
}

/** Re-run the quality engine on a draft already in QUALITY_CHECK. */
export async function rerunQuality(userId: string, id: string) {
  const draft = await owned(userId, id);
  if (draft.state !== "QUALITY_CHECK") throw new Error("Draft is not in quality check.");
  const result = runQualityChecks(draft);
  await prisma.$transaction(async (tx) => {
    await persistQuality(tx, id, result);
    await log(tx, userId, id, "quality.rerun", { score: result.score, passed: result.passed });
  });
  return result;
}

/** QUALITY_CHECK -> USER_APPROVAL. Requires the latest report to pass. */
export async function sendToApproval(userId: string, id: string) {
  const draft = await owned(userId, id);
  const to = assertTransition(draft.state, "pass-quality");
  const latest = await prisma.qualityReport.findFirst({
    where: { draftId: id },
    orderBy: { createdAt: "desc" },
  });
  if (!latest) throw new Error("Run a quality check first.");
  if (!latest.passed) throw new Error("The quality check has failing items. Fix them and re-run.");
  return prisma.$transaction(async (tx) => {
    const updated = await tx.contentDraft.update({ where: { id }, data: { state: to } });
    await log(tx, userId, id, "quality.passed");
    return updated;
  });
}

/** USER_APPROVAL -> PUBLISHED. The mandatory human gate. */
export async function approveAndPublish(userId: string, id: string) {
  const draft = await owned(userId, id);
  const to = assertTransition(draft.state, "approve");
  const now = new Date();
  return prisma.$transaction(async (tx) => {
    const updated = await tx.contentDraft.update({
      where: { id },
      data: { state: to, approvedAt: now, publishedAt: now },
    });
    // No external destination exists. "Publishing" records the approval and
    // makes the item part of the published record inside LinkToGlobe.
    await log(tx, userId, id, "draft.approved");
    await log(tx, userId, id, "draft.published", { destination: "internal" });
    return updated;
  });
}

/** USER_APPROVAL -> REJECTED, reason required. */
export async function reject(userId: string, id: string, reason: string) {
  const draft = await owned(userId, id);
  const to = assertTransition(draft.state, "reject");
  if (!reason.trim()) throw new Error("A rejection reason is required.");
  return prisma.$transaction(async (tx) => {
    const updated = await tx.contentDraft.update({
      where: { id },
      data: { state: to, rejectionReason: reason.trim() },
    });
    await log(tx, userId, id, "draft.rejected", { reason: reason.trim() });
    return updated;
  });
}

/** Back to DRAFT from QUALITY_CHECK / USER_APPROVAL / REJECTED. */
export async function returnToDraft(
  userId: string,
  id: string,
  transition: ContentTransition = "return-to-draft",
) {
  const draft = await owned(userId, id);
  const to = assertTransition(draft.state, transition);
  return prisma.$transaction(async (tx) => {
    const updated = await tx.contentDraft.update({
      where: { id },
      data: { state: to, rejectionReason: null },
    });
    await log(tx, userId, id, "draft.returned");
    return updated;
  });
}
