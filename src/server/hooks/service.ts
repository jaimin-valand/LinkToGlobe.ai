import "server-only";
import { prisma } from "@/lib/db";
import type { Prisma, HookCandidate } from "@/generated/prisma";
import { getAi } from "@/server/ai";
import { getKnowledge } from "@/server/knowledge/service";
import { HookLabError } from "./types";
import type { ClarityNote, HookContext, HookWarning } from "./types";
import { evaluateHook, MIN_HOOK_CHARS, MAX_HOOK_CHARS } from "./evaluate";
import { scoreDistinctness } from "./originality";
import { strategyDef } from "./strategies";

export { HookLabError } from "./types";

const GENERATE_COOLDOWN_MS = 6_000;
const MAX_CANDIDATES_PER_LAB = 24;
const MAX_PER_GENERATION = 6;

// ── Context ────────────────────────────────────────────────────────────────

interface IdeaForHooks {
  id: string;
  title: string;
  angle: string;
  notes: string;
  sourceUrls: string[];
}

async function hookContext(userId: string, idea: IdeaForHooks): Promise<HookContext> {
  const knowledge = await getKnowledge(userId);
  return {
    ideaText: `${idea.title} ${idea.angle}`.trim(),
    topics: knowledge?.topics ?? [],
    factText: [idea.notes, idea.sourceUrls.join(" ")].filter(Boolean).join("\n"),
  };
}

function normaliseLine(raw: string): string {
  return raw
    .trim()
    .replace(/^["'“”‘’]+/, "")
    .replace(/["'“”‘’]+$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ── Lab lookup ─────────────────────────────────────────────────────────────

async function ownedIdea(userId: string, ideaId: string): Promise<IdeaForHooks> {
  const idea = await prisma.idea.findFirst({
    where: { id: ideaId, userId },
    select: { id: true, title: true, angle: true, notes: true, sourceUrls: true },
  });
  if (!idea) throw new HookLabError("not_found", "Idea not found.");
  return idea;
}

async function getOrCreateLab(userId: string, ideaId: string): Promise<string> {
  await ownedIdea(userId, ideaId);
  const existing = await prisma.hookLab.findUnique({ where: { ideaId }, select: { id: true } });
  if (existing) return existing.id;
  const created = await prisma.hookLab.create({ data: { userId, ideaId }, select: { id: true } });
  return created.id;
}

function persistData(
  userId: string,
  labId: string,
  text: string,
  source: "AI" | "MANUAL",
  ctx: HookContext,
): Prisma.HookCandidateCreateManyInput {
  const evaln = evaluateHook(text, ctx);
  return {
    userId,
    labId,
    text,
    source,
    strategy: evaln.strategy,
    relevanceScore: evaln.relevanceScore,
    relevanceOverlap: evaln.relevanceOverlap,
    clarityScore: evaln.clarityScore,
    clarityGrade: evaln.clarityGrade,
    clarityNotes: evaln.clarityNotes as unknown as Prisma.InputJsonValue,
    wordCount: evaln.wordCount,
    warnings: evaln.warnings.map((w) => w.code),
  };
}

// ── Generate ───────────────────────────────────────────────────────────────

export async function generateCandidates(
  userId: string,
  ideaId: string,
  opts: { now?: Date } = {},
): Promise<{ added: number }> {
  const now = opts.now ?? new Date();
  const idea = await ownedIdea(userId, ideaId);

  const ai = getAi();
  if (!ai.enabled) {
    throw new HookLabError(
      "ai_disabled",
      "AI is not configured. Set an AI provider, or add candidates yourself.",
    );
  }

  const labId = await getOrCreateLab(userId, ideaId);
  const lab = await prisma.hookLab.findUniqueOrThrow({
    where: { id: labId },
    include: { candidates: { select: { text: true } } },
  });

  if (lab.lastGeneratedAt && now.getTime() - lab.lastGeneratedAt.getTime() < GENERATE_COOLDOWN_MS) {
    throw new HookLabError("rate_limited", "Just a moment — try again in a few seconds.");
  }
  if (lab.candidates.length >= MAX_CANDIDATES_PER_LAB) {
    throw new HookLabError(
      "invalid",
      "This lab is full. Remove a few candidates before generating more.",
    );
  }

  const knowledge = await getKnowledge(userId);
  const result = await ai.draftHooks({
    idea: idea.title,
    angle: idea.angle,
    notes: [idea.notes, idea.sourceUrls.join("\n")].filter(Boolean).join("\n"),
    knowledge: {
      headline: knowledge?.headline ?? "",
      expertise: knowledge?.expertise ?? "",
      audience: knowledge?.audience ?? "",
      tone: knowledge?.tone ?? "",
      topics: knowledge?.topics ?? [],
    },
  });
  if (!result.ok || !result.data) {
    throw new HookLabError("ai_failed", result.error ?? "The AI provider returned nothing usable.");
  }

  const seen = new Set(lab.candidates.map((c) => c.text.toLowerCase()));
  const fresh: string[] = [];
  for (const line of result.data) {
    const text = normaliseLine(line);
    const key = text.toLowerCase();
    if (text.length < MIN_HOOK_CHARS || text.length > MAX_HOOK_CHARS) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    fresh.push(text);
    if (fresh.length >= MAX_PER_GENERATION) break;
  }

  if (fresh.length === 0) {
    throw new HookLabError(
      "ai_failed",
      "The AI response had no new usable hooks. Try again or add your own.",
    );
  }

  const ctx = await hookContext(userId, idea);
  const rows = fresh.map((t) => persistData(userId, labId, t, "AI", ctx));

  await prisma.$transaction(async (tx) => {
    await tx.hookCandidate.createMany({ data: rows });
    await tx.hookLab.update({ where: { id: labId }, data: { lastGeneratedAt: now } });
    await tx.activityLog.create({
      data: { userId, action: "hooklab.generated", detail: { ideaId, count: rows.length } },
    });
  });

  return { added: rows.length };
}

// ── Manual add ─────────────────────────────────────────────────────────────

export async function addManualCandidate(
  userId: string,
  ideaId: string,
  rawText: string,
): Promise<{ candidateId: string }> {
  const idea = await ownedIdea(userId, ideaId);
  const text = normaliseLine(rawText);
  if (text.length < MIN_HOOK_CHARS) {
    throw new HookLabError("invalid", `A hook needs at least ${MIN_HOOK_CHARS} characters.`);
  }
  if (text.length > MAX_HOOK_CHARS) {
    throw new HookLabError("invalid", `Keep a hook under ${MAX_HOOK_CHARS} characters.`);
  }

  const labId = await getOrCreateLab(userId, ideaId);
  const lab = await prisma.hookLab.findUniqueOrThrow({
    where: { id: labId },
    include: { candidates: { select: { text: true } } },
  });
  if (lab.candidates.length >= MAX_CANDIDATES_PER_LAB) {
    throw new HookLabError("invalid", "This lab is full. Remove a few candidates first.");
  }
  if (lab.candidates.some((c) => c.text.toLowerCase() === text.toLowerCase())) {
    throw new HookLabError("invalid", "That candidate is already in the lab.");
  }

  const ctx = await hookContext(userId, idea);
  const data = persistData(userId, labId, text, "MANUAL", ctx);

  const created = await prisma.$transaction(async (tx) => {
    const row = await tx.hookCandidate.create({ data });
    await tx.hookLab.update({ where: { id: labId }, data: { updatedAt: new Date() } });
    await tx.activityLog.create({
      data: { userId, action: "hooklab.candidate_added", detail: { ideaId, candidateId: row.id } },
    });
    return row;
  });

  return { candidateId: created.id };
}

// ── Delete ─────────────────────────────────────────────────────────────────

export async function deleteCandidate(userId: string, candidateId: string): Promise<void> {
  const row = await prisma.hookCandidate.findFirst({
    where: { id: candidateId, userId },
    select: { id: true, labId: true, lab: { select: { ideaId: true } } },
  });
  if (!row) throw new HookLabError("not_found", "Candidate not found.");
  await prisma.$transaction(async (tx) => {
    await tx.hookCandidate.delete({ where: { id: candidateId } });
    await tx.hookLab.update({ where: { id: row.labId }, data: { updatedAt: new Date() } });
    await tx.activityLog.create({
      data: {
        userId,
        action: "hooklab.candidate_removed",
        detail: { ideaId: row.lab.ideaId, candidateId },
      },
    });
  });
}

// ── Select ─────────────────────────────────────────────────────────────────

export async function selectCandidate(
  userId: string,
  candidateId: string,
): Promise<{ ideaId: string; draftUpdated: boolean }> {
  const candidate = await prisma.hookCandidate.findFirst({
    where: { id: candidateId, userId },
    include: {
      lab: { include: { idea: { include: { draft: { select: { id: true, state: true } } } } } },
    },
  });
  if (!candidate) throw new HookLabError("not_found", "Candidate not found.");

  const draft = candidate.lab.idea.draft;
  const canUpdateDraft = draft?.state === "DRAFT";

  await prisma.$transaction(async (tx) => {
    await tx.hookLab.update({
      where: { id: candidate.labId },
      data: { selectedCandidateId: candidate.id },
    });
    if (draft && canUpdateDraft) {
      await tx.contentDraft.update({
        where: { id: draft.id },
        data: { hook: candidate.text.slice(0, 2000) },
      });
      await tx.activityLog.create({
        data: { userId, action: "draft.updated", detail: { draftId: draft.id, from: "hooklab" } },
      });
    }
    await tx.activityLog.create({
      data: {
        userId,
        action: "hooklab.selected",
        detail: {
          ideaId: candidate.lab.ideaId,
          candidateId: candidate.id,
          strategy: candidate.strategy,
        },
      },
    });
  });

  return { ideaId: candidate.lab.ideaId, draftUpdated: Boolean(draft && canUpdateDraft) };
}

export async function clearSelection(userId: string, ideaId: string): Promise<void> {
  const lab = await prisma.hookLab.findFirst({
    where: { ideaId, userId },
    select: { id: true },
  });
  if (!lab) throw new HookLabError("not_found", "No hook lab for this idea.");
  await prisma.hookLab.update({ where: { id: lab.id }, data: { selectedCandidateId: null } });
}

// ── Reads ──────────────────────────────────────────────────────────────────

export interface HookCandidateView {
  id: string;
  text: string;
  strategy: HookCandidate["strategy"];
  strategyLabel: string;
  source: HookCandidate["source"];
  relevanceScore: number;
  relevanceOverlap: string[];
  clarityScore: number;
  clarityGrade: string;
  clarityNotes: ClarityNote[];
  wordCount: number;
  warnings: HookWarning[];
  distinctScore: number;
  nearDuplicate: boolean;
  isSelected: boolean;
  createdAt: Date;
}

const WARNING_MESSAGES: Record<string, string> = {
  "unverified-figure": "Uses a figure that is not in your notes. Check it before you publish.",
  "too-long": "Long for an opening line. Tighten it.",
  "too-short": "Very short. It may not carry enough on its own.",
  "multi-sentence": "More than two sentences. A hook usually lands harder as one.",
  placeholder: "Looks like placeholder text.",
};

export interface HookLabView {
  idea: { id: string; title: string; angle: string; status: string };
  exists: boolean;
  aiEnabled: boolean;
  selectedId: string | null;
  draft: { id: string; state: string } | null;
  candidates: HookCandidateView[];
}

export async function getLabView(userId: string, ideaId: string): Promise<HookLabView> {
  const idea = await prisma.idea.findFirst({
    where: { id: ideaId, userId },
    select: {
      id: true,
      title: true,
      angle: true,
      status: true,
      draft: { select: { id: true, state: true } },
      hookLab: {
        select: {
          selectedCandidateId: true,
          candidates: { orderBy: { createdAt: "asc" } },
        },
      },
    },
  });
  if (!idea) throw new HookLabError("not_found", "Idea not found.");

  const aiEnabled = getAi().enabled;
  const lab = idea.hookLab;
  const base = {
    idea: { id: idea.id, title: idea.title, angle: idea.angle, status: idea.status },
    aiEnabled,
    draft: idea.draft,
  };

  if (!lab) {
    return { ...base, exists: false, selectedId: null, candidates: [] };
  }

  const distinct = scoreDistinctness(lab.candidates.map((c) => c.text));
  const candidates: HookCandidateView[] = lab.candidates.map((c, i) => ({
    id: c.id,
    text: c.text,
    strategy: c.strategy,
    strategyLabel: strategyDef(c.strategy).label,
    source: c.source,
    relevanceScore: c.relevanceScore,
    relevanceOverlap: c.relevanceOverlap,
    clarityScore: c.clarityScore,
    clarityGrade: c.clarityGrade,
    clarityNotes: (c.clarityNotes as unknown as ClarityNote[]) ?? [],
    wordCount: c.wordCount,
    warnings: c.warnings.map((code) => ({
      code: code as HookWarning["code"],
      message: WARNING_MESSAGES[code] ?? code,
    })),
    distinctScore: distinct[i].distinctScore,
    nearDuplicate: distinct[i].nearDuplicate,
    isSelected: c.id === lab.selectedCandidateId,
    createdAt: c.createdAt,
  }));

  return {
    ...base,
    exists: true,
    selectedId: lab.selectedCandidateId,
    candidates,
  };
}

export interface HookLabSummary {
  ideaId: string;
  ideaTitle: string;
  candidateCount: number;
  selectedStrategyLabel: string | null;
  updatedAt: Date;
}

export async function listLabs(userId: string, take = 50): Promise<HookLabSummary[]> {
  const labs = await prisma.hookLab.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take,
    select: {
      ideaId: true,
      updatedAt: true,
      idea: { select: { title: true } },
      selectedCandidate: { select: { strategy: true } },
      _count: { select: { candidates: true } },
    },
  });
  return labs.map((l) => ({
    ideaId: l.ideaId,
    ideaTitle: l.idea.title,
    candidateCount: l._count.candidates,
    selectedStrategyLabel: l.selectedCandidate
      ? strategyDef(l.selectedCandidate.strategy).label
      : null,
    updatedAt: l.updatedAt,
  }));
}
