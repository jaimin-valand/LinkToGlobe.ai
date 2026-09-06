/**
 * The LinkToGlobe content pipeline, expressed as data.
 *
 * This module intentionally contains NO behavior — it is the single source of
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
    title: "User knowledge",
    summary: "Expertise, positioning, and source material the user provides.",
    humanGate: false,
  },
  RESEARCH: {
    stage: "RESEARCH",
    title: "Research",
    summary: "Gather supporting material from approved, attributable sources.",
    humanGate: false,
  },
  SIGNALS: {
    stage: "SIGNALS",
    title: "Signals",
    summary: "Detect timely themes worth responding to.",
    humanGate: false,
  },
  IDEAS: {
    stage: "IDEAS",
    title: "Ideas",
    summary: "Turn signals and knowledge into candidate topics.",
    humanGate: false,
  },
  HOOKS: {
    stage: "HOOKS",
    title: "Hooks",
    summary: "Draft opening angles for the strongest ideas.",
    humanGate: false,
  },
  CONTENT: {
    stage: "CONTENT",
    title: "Content",
    summary: "Produce full drafts from an approved idea and hook.",
    humanGate: false,
  },
  QUALITY_REVIEW: {
    stage: "QUALITY_REVIEW",
    title: "Quality review",
    summary: "Automated checks for accuracy, originality, and policy fit.",
    humanGate: false,
  },
  USER_APPROVAL: {
    stage: "USER_APPROVAL",
    title: "User approval",
    summary: "Mandatory human sign-off. Nothing is published without it.",
    humanGate: true,
  },
  SCHEDULE_PUBLISH: {
    stage: "SCHEDULE_PUBLISH",
    title: "Schedule / publish",
    summary: "Queue or publish approved content to a connected destination.",
    humanGate: false,
  },
  ANALYTICS: {
    stage: "ANALYTICS",
    title: "Analytics",
    summary: "Collect performance data for published content.",
    humanGate: false,
  },
  LEARNING: {
    stage: "LEARNING",
    title: "Learning",
    summary: "Feed outcomes back into research, ideas, and drafting.",
    humanGate: false,
  },
};

/**
 * The lifecycle a single piece of content moves through before it can be
 * published. Enforced by the eventual publishing service — see SECURITY.md.
 */
export const APPROVAL_LIFECYCLE = ["DRAFT", "QUALITY_CHECK", "USER_APPROVAL", "PUBLISH"] as const;

export type ApprovalState = (typeof APPROVAL_LIFECYCLE)[number];
