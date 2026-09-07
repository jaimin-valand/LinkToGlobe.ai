import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocked Prisma (hoisted for the vi.mock factory) ────────────────────────

let idCounter = 0;
const nextId = (p: string) => `${p}_${++idCounter}`;

const { db } = vi.hoisted(() => {
  const db = {
    contentDraft: { create: vi.fn(), findFirst: vi.fn() },
    idea: { findFirst: vi.fn(), update: vi.fn() },
    activityLog: { create: vi.fn() },
    $transaction: vi.fn(),
  };
  db.$transaction.mockImplementation(async (cb: (tx: unknown) => unknown) => cb(db));
  return { db };
});

vi.mock("@/lib/db", () => ({ prisma: db }));

// Import after the mock is registered.
import { createDraftFromIdea, NotFoundError } from "./service";

interface IdeaRow {
  id: string;
  userId: string;
  title: string;
  angle: string;
  notes: string;
  sourceUrls: string[];
  status: "NEW" | "IN_PROGRESS" | "ARCHIVED";
  draft: { id: string } | null;
}

function idea(over: Partial<IdeaRow> = {}): IdeaRow {
  return {
    id: "idea_1",
    userId: "user_1",
    title: "On-call rotations are getting rethought",
    angle: "What five years of incident data changed about our rotation design",
    notes: 'From research: "on-call reliability"\n\nWhy it matters: teams are burning out',
    sourceUrls: ["https://a.example.com/story", "https://b.example.com/story"],
    status: "NEW",
    draft: null,
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  idCounter = 0;
  db.$transaction.mockImplementation(async (cb: (tx: unknown) => unknown) => cb(db));
  db.contentDraft.create.mockImplementation(
    async ({ data }: { data: Record<string, unknown> }) => ({
      id: nextId("draft"),
      state: "DRAFT",
      ...data,
    }),
  );
  db.idea.update.mockResolvedValue({});
  db.activityLog.create.mockResolvedValue({});
});

describe("createDraftFromIdea", () => {
  it("creates a DRAFT from the idea, carrying the angle and sources", async () => {
    db.idea.findFirst.mockResolvedValue(idea());

    const result = await createDraftFromIdea("user_1", "idea_1");

    expect(result.alreadyExisted).toBe(false);
    expect(result.draftId).toMatch(/^draft_/);

    const data = db.contentDraft.create.mock.calls[0][0].data;
    expect(data).toMatchObject({
      userId: "user_1",
      title: "On-call rotations are getting rethought",
      hook: "What five years of incident data changed about our rotation design",
      originIdeaId: "idea_1",
    });
    // Body is never pre-filled — the user writes it.
    expect(data.body).toBeUndefined();
    // Sources are carried into the notes.
    expect(data.sourceNotes).toContain("https://a.example.com/story");
    expect(data.sourceNotes).toContain("https://b.example.com/story");
    expect(data.sourceNotes).toContain("teams are burning out");
  });

  it("moves a NEW idea to IN_PROGRESS and logs the conversion", async () => {
    db.idea.findFirst.mockResolvedValue(idea({ status: "NEW" }));

    await createDraftFromIdea("user_1", "idea_1");

    expect(db.idea.update).toHaveBeenCalledWith({
      where: { id: "idea_1" },
      data: { status: "IN_PROGRESS" },
    });
    const actions = db.activityLog.create.mock.calls.map((c) => c[0].data.action);
    expect(actions).toContain("draft.created");
    expect(actions).toContain("idea.converted");
  });

  it("does not change the idea status when it is not NEW", async () => {
    db.idea.findFirst.mockResolvedValue(idea({ status: "ARCHIVED" }));

    await createDraftFromIdea("user_1", "idea_1");

    expect(db.idea.update).not.toHaveBeenCalled();
  });

  it("is idempotent: returns the existing draft and creates nothing", async () => {
    db.idea.findFirst.mockResolvedValue(idea({ draft: { id: "draft_existing" } }));

    const result = await createDraftFromIdea("user_1", "idea_1");

    expect(result).toEqual({ draftId: "draft_existing", alreadyExisted: true });
    expect(db.contentDraft.create).not.toHaveBeenCalled();
    expect(db.idea.update).not.toHaveBeenCalled();
  });

  it("rejects an idea that does not belong to the user", async () => {
    db.idea.findFirst.mockResolvedValue(null);

    await expect(createDraftFromIdea("attacker", "idea_1")).rejects.toBeInstanceOf(NotFoundError);
    // The query is always scoped by userId.
    expect(db.idea.findFirst.mock.calls[0][0].where).toMatchObject({
      id: "idea_1",
      userId: "attacker",
    });
  });

  it("handles an idea with no notes and no sources", async () => {
    db.idea.findFirst.mockResolvedValue(idea({ notes: "", sourceUrls: [] }));

    await createDraftFromIdea("user_1", "idea_1");

    expect(db.contentDraft.create.mock.calls[0][0].data.sourceNotes).toBe("");
  });

  it("clamps an over-long title and angle to the draft editor limits", async () => {
    db.idea.findFirst.mockResolvedValue(idea({ title: "t".repeat(400), angle: "a".repeat(5000) }));

    await createDraftFromIdea("user_1", "idea_1");

    const data = db.contentDraft.create.mock.calls[0][0].data;
    expect(data.title).toHaveLength(200);
    expect(data.hook).toHaveLength(2000);
  });
});
