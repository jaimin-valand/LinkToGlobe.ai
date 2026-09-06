import "server-only";
import { prisma } from "@/lib/db";
import type { ContentState } from "@/generated/prisma";
import { PIPELINE_STAGES } from "@/lib/pipeline";

export interface AnalyticsSummary {
  totalDrafts: number;
  byState: Record<ContentState, number>;
  published: number;
  rejected: number;
  approvalRate: number | null; // published / (published + rejected)
  avgHoursToApprove: number | null;
  /** Real pipeline-stage coverage: which stages are implemented today. */
  stagesImplemented: number;
  stagesTotal: number;
}

const EMPTY_BY_STATE: Record<ContentState, number> = {
  DRAFT: 0,
  QUALITY_CHECK: 0,
  USER_APPROVAL: 0,
  PUBLISHED: 0,
  REJECTED: 0,
};

export async function getAnalytics(userId: string): Promise<AnalyticsSummary> {
  const grouped = await prisma.contentDraft.groupBy({
    by: ["state"],
    where: { userId },
    _count: { _all: true },
  });

  const byState = { ...EMPTY_BY_STATE };
  for (const row of grouped) byState[row.state] = row._count._all;

  const totalDrafts = Object.values(byState).reduce((a, b) => a + b, 0);
  const published = byState.PUBLISHED;
  const rejected = byState.REJECTED;
  const decided = published + rejected;

  const approved = await prisma.contentDraft.findMany({
    where: { userId, state: "PUBLISHED", submittedAt: { not: null }, approvedAt: { not: null } },
    select: { submittedAt: true, approvedAt: true },
  });
  const avgHoursToApprove =
    approved.length === 0
      ? null
      : approved.reduce(
          (sum, d) => sum + (d.approvedAt!.getTime() - d.submittedAt!.getTime()) / 3_600_000,
          0,
        ) / approved.length;

  return {
    totalDrafts,
    byState,
    published,
    rejected,
    approvalRate: decided === 0 ? null : published / decided,
    avgHoursToApprove,
    stagesImplemented: 4, // USER_KNOWLEDGE, CONTENT, QUALITY_REVIEW, USER_APPROVAL
    stagesTotal: PIPELINE_STAGES.length,
  };
}

export function recentActivity(userId: string, take = 20) {
  return prisma.activityLog.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
    include: { draft: { select: { title: true } } },
  });
}
