import type { ContentState } from "@/generated/prisma";

/**
 * The content lifecycle state machine.
 *
 *   DRAFT ─submit→ QUALITY_CHECK ─pass→ USER_APPROVAL ─approve→ PUBLISHED
 *     ▲                │                     │
 *     └────────────────┴─────────────────────┤
 *                                            └─reject→ REJECTED ─revise→ DRAFT
 *
 * PUBLISHED is terminal. Every transition is checked server-side by
 * assertTransition(); the UI only ever *requests* a transition.
 */

export type ContentTransition =
  | "submit" // DRAFT -> QUALITY_CHECK
  | "return-to-draft" // QUALITY_CHECK | USER_APPROVAL | REJECTED -> DRAFT
  | "pass-quality" // QUALITY_CHECK -> USER_APPROVAL
  | "approve" // USER_APPROVAL -> PUBLISHED
  | "reject"; // USER_APPROVAL -> REJECTED

const TRANSITIONS: Record<ContentTransition, { from: ContentState[]; to: ContentState }> = {
  submit: { from: ["DRAFT"], to: "QUALITY_CHECK" },
  "return-to-draft": { from: ["QUALITY_CHECK", "USER_APPROVAL", "REJECTED"], to: "DRAFT" },
  "pass-quality": { from: ["QUALITY_CHECK"], to: "USER_APPROVAL" },
  approve: { from: ["USER_APPROVAL"], to: "PUBLISHED" },
  reject: { from: ["USER_APPROVAL"], to: "REJECTED" },
};

export class TransitionError extends Error {}

/** Throws TransitionError if `transition` is not allowed from `current`. */
export function assertTransition(
  current: ContentState,
  transition: ContentTransition,
): ContentState {
  const rule = TRANSITIONS[transition];
  if (!rule || !rule.from.includes(current)) {
    throw new TransitionError(`Cannot "${transition}" from ${current}.`);
  }
  return rule.to;
}

export function canTransition(current: ContentState, transition: ContentTransition): boolean {
  return TRANSITIONS[transition]?.from.includes(current) ?? false;
}

export const STATE_LABELS: Record<ContentState, string> = {
  DRAFT: "Draft",
  QUALITY_CHECK: "Quality check",
  USER_APPROVAL: "Awaiting approval",
  PUBLISHED: "Published",
  REJECTED: "Rejected",
};
