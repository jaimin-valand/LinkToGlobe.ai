/**
 * Provider-agnostic AI layer. All model access goes through this interface so
 * providers can be swapped by env config (AI_PROVIDER). No provider SDK is
 * imported outside this folder.
 */

export interface KnowledgeContext {
  headline: string;
  expertise: string;
  audience: string;
  tone: string;
  topics: string[];
}

export interface DraftContext {
  title: string;
  hook: string;
  body: string;
  sourceNotes: string;
}

export interface HookBrief {
  /** The idea's working title. */
  idea: string;
  /** The idea's angle / summary. */
  angle: string;
  /** Idea notes and source material — the only facts the model may use. */
  notes: string;
}

export interface AiReviewNote {
  severity: "info" | "warning";
  message: string;
}

export interface AiResult<T> {
  ok: boolean;
  /** Present when ok. */
  data?: T;
  /** Present when !ok — a human-readable reason, never a fabricated answer. */
  error?: string;
}

export interface AiProvider {
  readonly id: string;
  /** False for the "manual" provider — the UI hides AI actions when disabled. */
  readonly enabled: boolean;

  suggestIdeas(ctx: KnowledgeContext): Promise<AiResult<string[]>>;
  suggestHook(ctx: DraftContext & { knowledge: KnowledgeContext }): Promise<AiResult<string[]>>;
  /** Several distinct opening-line options for one idea (Hook Lab). Advisory;
   *  must use only the facts it is given and never invent figures or sources. */
  draftHooks(ctx: HookBrief & { knowledge: KnowledgeContext }): Promise<AiResult<string[]>>;
  expandDraft(ctx: DraftContext & { knowledge: KnowledgeContext }): Promise<AiResult<string>>;
  review(ctx: DraftContext): Promise<AiResult<AiReviewNote[]>>;
}
