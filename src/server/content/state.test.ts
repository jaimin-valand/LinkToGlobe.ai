import { describe, it, expect } from "vitest";
import { assertTransition, canTransition, TransitionError } from "./state";

describe("content state machine", () => {
  it("allows the happy path DRAFT -> QUALITY_CHECK -> USER_APPROVAL -> PUBLISHED", () => {
    expect(assertTransition("DRAFT", "submit")).toBe("QUALITY_CHECK");
    expect(assertTransition("QUALITY_CHECK", "pass-quality")).toBe("USER_APPROVAL");
    expect(assertTransition("USER_APPROVAL", "approve")).toBe("PUBLISHED");
  });

  it("does not allow skipping the approval gate", () => {
    expect(canTransition("QUALITY_CHECK", "approve")).toBe(false);
    expect(() => assertTransition("QUALITY_CHECK", "approve")).toThrow(TransitionError);
    expect(canTransition("DRAFT", "approve")).toBe(false);
  });

  it("PUBLISHED is terminal", () => {
    expect(canTransition("PUBLISHED", "submit")).toBe(false);
    expect(canTransition("PUBLISHED", "return-to-draft")).toBe(false);
  });

  it("rejection is only reachable from USER_APPROVAL", () => {
    expect(canTransition("USER_APPROVAL", "reject")).toBe(true);
    expect(canTransition("QUALITY_CHECK", "reject")).toBe(false);
  });

  it("rejected drafts can go back to draft", () => {
    expect(assertTransition("REJECTED", "return-to-draft")).toBe("DRAFT");
  });
});
