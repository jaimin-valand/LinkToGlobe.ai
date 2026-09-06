import { describe, it, expect } from "vitest";
import { APPROVAL_LIFECYCLE, PIPELINE_STAGES, PIPELINE_STAGE_META } from "@/lib/pipeline";

describe("pipeline definition", () => {
  it("matches the documented long-term workflow order", () => {
    expect(PIPELINE_STAGES).toEqual([
      "USER_KNOWLEDGE",
      "RESEARCH",
      "SIGNALS",
      "IDEAS",
      "HOOKS",
      "CONTENT",
      "QUALITY_REVIEW",
      "USER_APPROVAL",
      "SCHEDULE_PUBLISH",
      "ANALYTICS",
      "LEARNING",
    ]);
  });

  it("has metadata for every stage and nothing extra", () => {
    expect(Object.keys(PIPELINE_STAGE_META).sort()).toEqual([...PIPELINE_STAGES].sort());
  });

  it("keeps user approval as a mandatory human gate", () => {
    expect(PIPELINE_STAGE_META.USER_APPROVAL.humanGate).toBe(true);
    const gates = PIPELINE_STAGES.filter((s) => PIPELINE_STAGE_META[s].humanGate);
    expect(gates).toContain("USER_APPROVAL");
  });

  it("routes approval before publishing", () => {
    expect(APPROVAL_LIFECYCLE).toEqual(["DRAFT", "QUALITY_CHECK", "USER_APPROVAL", "PUBLISH"]);
    expect(APPROVAL_LIFECYCLE.indexOf("USER_APPROVAL")).toBeLessThan(
      APPROVAL_LIFECYCLE.indexOf("PUBLISH"),
    );
  });
});
