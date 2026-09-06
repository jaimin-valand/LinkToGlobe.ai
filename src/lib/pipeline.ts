/**
 * The LinkToGlobe.ai content pipeline, expressed as data.
 *
 * This module intentionally contains NO behaviour. It is the single source of
 * truth for the stage sequence that the rest of the system (UI, DB enums,
 * docs) is built around. Implementation of each stage lands in later phases;
 * see ROADMAP.md.
 */

export const PIPELINE_STAGES = [
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
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export interface PipelineStageMeta {
  readonly stage: PipelineStage;
  readonly title: string;
  readonly summary: string;
  /** Whether this stage requires an explicit human decision to advance. */
  readonly humanGate: boolean;
}

export const PIPELINE_STAGE_META: Record<PipelineStage, PipelineStageMeta> = {
  USER_KNOWLEDGE: {
    stage: "USER_KNOWLEDGE",
    title: "Your knowledge",
    summary: "What you know, who you write for, and the material you want to draw on.",
    humanGate: false,
  },
  RESEARCH: {
    stage: "RESEARCH",
    title: "Research",
    summary: "Supporting material from sources you can cite.",
    humanGate: false,
  },
  SIGNALS: {
    stage: "SIGNALS",
    title: "Signals",
    summary: "Topics that are worth a timely response.",
    humanGate: false,
  },
  IDEAS: {
    stage: "IDEAS",
    title: "Ideas",
    summary: "Those topics shaped into things you could write about.",
    humanGate: false,
  },
  HOOKS: {
    stage: "HOOKS",
    title: "Hooks",
    summary: "Opening lines for the ideas worth pursuing.",
    humanGate: false,
  },
  CONTENT: {
    stage: "CONTENT",
    title: "Draft",
    summary: "The full piece, written out.",
    humanGate: false,
  },
  QUALITY_REVIEW: {
    stage: "QUALITY_REVIEW",
    title: "Quality checks",
    summary: "Automated checks that run before a person reviews it.",
    humanGate: false,
  },
  USER_APPROVAL: {
    stage: "USER_APPROVAL",
    title: "Your approval",
    summary: "You read it and decide. Nothing goes out without this step.",
    humanGate: true,
  },
  SCHEDULE_PUBLISH: {
    stage: "SCHEDULE_PUBLISH",
    title: "Publish",
    summary: "Send approved content out, or queue it for later.",
    humanGate: false,
  },
  ANALYTICS: {
    stage: "ANALYTICS",
    title: "Analytics",
    summary: "How published content performed.",
    humanGate: false,
  },
  LEARNING: {
    stage: "LEARNING",
    title: "Learning",
    summary: "Using what worked to shape the next round.",
    humanGate: false,
  },
};

/**
 * The lifecycle a single piece of content moves through before it can be
 * published. Enforced by the publishing service; see SECURITY.md.
 */
export const APPROVAL_LIFECYCLE = ["DRAFT", "QUALITY_CHECK", "USER_APPROVAL", "PUBLISH"] as const;

export type ApprovalState = (typeof APPROVAL_LIFECYCLE)[number];
