import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoisted mocks ──────────────────────────────────────────────────────────

let idCounter = 0;
const nextId = (p: string) => `${p}_${++idCounter}`;

const { db, ai } = vi.hoisted(() => {
  const db = {
    idea: { findFirst: vi.fn() },
    hookLab: {
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    hookCandidate: {
      create: vi.fn(),
      createMany: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn(),
    },
    contentDraft: { update: vi.fn() },
    activityLog: { create: vi.fn() },
    $transaction: vi.fn(),
  };
  db.$transaction.mockImplementation(async (cb: (tx: unknown) => unknown) => cb(db));
  const ai = { enabled: true, draftHooks: vi.fn() };
  return { db, ai };
});

vi.mock("@/lib/db", () => ({ prisma: db }));
vi.mock("@/server/ai", () => ({ getAi: () => ai }));
vi.mock("@/server/knowledge/service", () => ({
  getKnowledge: vi.fn(async () => ({
    headline: "Staff SRE",
    expertise: "on-call reliability",
    audience: "engineering leaders",
    tone: "",
    topics: ["on-call", "reliability"],
    sources: "",
  })),
}));

import {
  generateCandidates,
  addManualCandidate,
  selectCandidate,
  deleteCandidate,
  getLabView,
} from "./service";

const IDEA = {
  id: "idea_1",
  title: "Rethinking on-call rotations for reliability",
  angle: "Five years of incident data changed how we design rotations",
  notes: "Pages dropped 40% after we removed duplicate alerts.",
  sourceUrls: ["https://example.com/a"],
};

beforeEach(() => {
  vi.clearAllMocks();
  idCounter = 0;
  ai.enabled = true;
  db.$transaction.mockImplementation(async (cb: (tx: unknown) => unknown) => cb(db));
  db.idea.findFirst.mockResolvedValue({ ...IDEA });
  db.hookLab.findUnique.mockResolvedValue({ id: "lab_1" });
  db.hookLab.findUniqueOrThrow.mockResolvedValue({
    id: "lab_1",
    lastGeneratedAt: null,
    candidates: [],
  });
  db.hookLab.create.mockImplementation(async () => ({ id: nextId("lab") }));
  db.hookLab.update.mockResolvedValue({});
  db.hookCandidate.createMany.mockResolvedValue({ count: 0 });
  db.hookCandidate.create.mockImplementation(
    async ({ data }: { data: Record<string, unknown> }) => ({
      id: nextId("cand"),
      ...data,
    }),
  );
  db.activityLog.create.mockResolvedValue({});
});

describe("generateCandidates", () => {
  it("refuses when AI is not configured", async () => {
    ai.enabled = false;
    await expect(generateCandidates("user_1", "idea_1")).rejects.toMatchObject({
      code: "ai_disabled",
    });
    expect(db.hookCandidate.createMany).not.toHaveBeenCalled();
  });

  it("evaluates and persists the AI lines, deduping against existing", async () => {
    db.hookLab.findUniqueOrThrow.mockResolvedValue({
      id: "lab_1",
      lastGeneratedAt: null,
      candidates: [{ text: "An existing hook about on-call rotations" }],
    });
    ai.draftHooks.mockResolvedValue({
      ok: true,
      data: [
        "Why do we still page humans for what a script can fix?",
        '"An existing hook about on-call rotations"', // duplicate after normalising quotes
        "Five years of incident data reshaped our on-call rotations.",
      ],
    });

    const result = await generateCandidates("user_1", "idea_1");

    expect(result.added).toBe(2);
    const rows = db.hookCandidate.createMany.mock.calls[0][0].data as Array<
      Record<string, unknown>
    >;
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ userId: "user_1", labId: "lab_1", source: "AI" });
    expect(rows[0].strategy).toBe("QUESTION");
    expect(typeof rows[0].relevanceScore).toBe("number");
    expect(typeof rows[0].clarityScore).toBe("number");
    expect(db.hookLab.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "lab_1" } }),
    );
    const actions = db.activityLog.create.mock.calls.map((c) => c[0].data.action);
    expect(actions).toContain("hooklab.generated");
  });

  it("surfaces an AI failure as ai_failed", async () => {
    ai.draftHooks.mockResolvedValue({
      ok: false,
      error: "The AI service returned an error (429).",
    });
    await expect(generateCandidates("user_1", "idea_1")).rejects.toMatchObject({
      code: "ai_failed",
    });
  });

  it("respects the per-lab cooldown", async () => {
    db.hookLab.findUniqueOrThrow.mockResolvedValue({
      id: "lab_1",
      lastGeneratedAt: new Date(),
      candidates: [],
    });
    ai.draftHooks.mockResolvedValue({ ok: true, data: ["a hook line that is long enough"] });
    await expect(generateCandidates("user_1", "idea_1", { now: new Date() })).rejects.toMatchObject(
      { code: "rate_limited" },
    );
  });

  it("rejects an idea that is not the caller's", async () => {
    db.idea.findFirst.mockResolvedValue(null);
    await expect(generateCandidates("attacker", "idea_1")).rejects.toMatchObject({
      code: "not_found",
    });
    expect(db.idea.findFirst.mock.calls[0][0].where).toMatchObject({
      id: "idea_1",
      userId: "attacker",
    });
  });
});

describe("addManualCandidate", () => {
  beforeEach(() => {
    db.hookLab.findUniqueOrThrow.mockResolvedValue({ id: "lab_1", candidates: [] });
  });

  it("rejects a hook that is too short", async () => {
    await expect(addManualCandidate("user_1", "idea_1", "too short")).rejects.toMatchObject({
      code: "invalid",
    });
  });

  it("rejects a duplicate of an existing candidate", async () => {
    db.hookLab.findUniqueOrThrow.mockResolvedValue({
      id: "lab_1",
      candidates: [{ text: "Five years of incident data reshaped our rotations." }],
    });
    await expect(
      addManualCandidate("user_1", "idea_1", "five years of incident data reshaped our rotations."),
    ).rejects.toMatchObject({ code: "invalid" });
  });

  it("stores an evaluated manual candidate", async () => {
    const { candidateId } = await addManualCandidate(
      "user_1",
      "idea_1",
      "Why do we still page humans for what a script can fix?",
    );
    expect(candidateId).toMatch(/^cand_/);
    const data = db.hookCandidate.create.mock.calls[0][0].data;
    expect(data).toMatchObject({ source: "MANUAL", userId: "user_1", strategy: "QUESTION" });
    expect(data.warnings).toEqual([]);
  });
});

describe("selectCandidate", () => {
  function candidateWithDraft(draftState: string | null) {
    return {
      id: "cand_1",
      labId: "lab_1",
      text: "Five years of incident data reshaped our on-call rotations.",
      strategy: "DIRECT",
      lab: {
        ideaId: "idea_1",
        idea: { draft: draftState ? { id: "draft_1", state: draftState } : null },
      },
    };
  }

  it("records the selection on the lab", async () => {
    db.hookCandidate.findFirst.mockResolvedValue(candidateWithDraft(null));
    const r = await selectCandidate("user_1", "cand_1");
    expect(r).toEqual({ ideaId: "idea_1", draftUpdated: false });
    expect(db.hookLab.update).toHaveBeenCalledWith({
      where: { id: "lab_1" },
      data: { selectedCandidateId: "cand_1" },
    });
    expect(db.contentDraft.update).not.toHaveBeenCalled();
  });

  it("pushes the hook into a draft that is still in DRAFT", async () => {
    db.hookCandidate.findFirst.mockResolvedValue(candidateWithDraft("DRAFT"));
    const r = await selectCandidate("user_1", "cand_1");
    expect(r.draftUpdated).toBe(true);
    expect(db.contentDraft.update).toHaveBeenCalledWith({
      where: { id: "draft_1" },
      data: { hook: "Five years of incident data reshaped our on-call rotations." },
    });
  });

  it("leaves a draft past DRAFT untouched", async () => {
    db.hookCandidate.findFirst.mockResolvedValue(candidateWithDraft("QUALITY_CHECK"));
    const r = await selectCandidate("user_1", "cand_1");
    expect(r.draftUpdated).toBe(false);
    expect(db.contentDraft.update).not.toHaveBeenCalled();
  });

  it("rejects a candidate that is not the caller's", async () => {
    db.hookCandidate.findFirst.mockResolvedValue(null);
    await expect(selectCandidate("attacker", "cand_1")).rejects.toMatchObject({
      code: "not_found",
    });
    expect(db.hookCandidate.findFirst.mock.calls[0][0].where).toMatchObject({
      id: "cand_1",
      userId: "attacker",
    });
  });
});

describe("deleteCandidate", () => {
  it("deletes a candidate the caller owns", async () => {
    db.hookCandidate.findFirst.mockResolvedValue({
      id: "cand_1",
      labId: "lab_1",
      lab: { ideaId: "idea_1" },
    });
    await deleteCandidate("user_1", "cand_1");
    expect(db.hookCandidate.delete).toHaveBeenCalledWith({ where: { id: "cand_1" } });
  });

  it("rejects a candidate that is not the caller's", async () => {
    db.hookCandidate.findFirst.mockResolvedValue(null);
    await expect(deleteCandidate("attacker", "cand_1")).rejects.toMatchObject({
      code: "not_found",
    });
  });
});

describe("getLabView", () => {
  it("reports a missing lab without inventing candidates", async () => {
    db.idea.findFirst.mockResolvedValue({
      id: "idea_1",
      title: IDEA.title,
      angle: IDEA.angle,
      status: "NEW",
      draft: null,
      hookLab: null,
    });
    const view = await getLabView("user_1", "idea_1");
    expect(view.exists).toBe(false);
    expect(view.candidates).toEqual([]);
    expect(view.selectedId).toBeNull();
  });

  it("returns candidates with a computed differentiation score and mapped warnings", async () => {
    db.idea.findFirst.mockResolvedValue({
      id: "idea_1",
      title: IDEA.title,
      angle: IDEA.angle,
      status: "IN_PROGRESS",
      draft: { id: "draft_1", state: "DRAFT" },
      hookLab: {
        selectedCandidateId: "cand_1",
        candidates: [
          {
            id: "cand_1",
            text: "Five years of incident data reshaped our on-call rotations.",
            strategy: "DIRECT",
            source: "AI",
            relevanceScore: 70,
            relevanceOverlap: ["incident", "rotations"],
            clarityScore: 88,
            clarityGrade: "clear",
            clarityNotes: [{ label: "Filler", status: "pass", detail: "None." }],
            wordCount: 9,
            warnings: ["unverified-figure"],
            createdAt: new Date("2026-09-07T10:00:00Z"),
          },
          {
            id: "cand_2",
            text: "Nobody enjoys being paged at three in the morning.",
            strategy: "DIRECT",
            source: "MANUAL",
            relevanceScore: 20,
            relevanceOverlap: [],
            clarityScore: 92,
            clarityGrade: "clear",
            clarityNotes: [],
            wordCount: 9,
            warnings: [],
            createdAt: new Date("2026-09-07T11:00:00Z"),
          },
        ],
      },
    });

    const view = await getLabView("user_1", "idea_1");
    expect(view.exists).toBe(true);
    expect(view.selectedId).toBe("cand_1");
    expect(view.candidates).toHaveLength(2);
    expect(view.candidates[0].isSelected).toBe(true);
    expect(view.candidates[0].distinctScore).toBeGreaterThanOrEqual(0);
    expect(view.candidates[0].distinctScore).toBeLessThanOrEqual(100);
    expect(view.candidates[0].warnings[0]).toMatchObject({ code: "unverified-figure" });
    expect(view.candidates[0].warnings[0].message).toMatch(/figure/i);
    expect(view.candidates[0].strategyLabel).toBe("Direct");
  });

  it("rejects an idea that is not the caller's", async () => {
    db.idea.findFirst.mockResolvedValue(null);
    await expect(getLabView("attacker", "idea_1")).rejects.toMatchObject({ code: "not_found" });
  });
});
