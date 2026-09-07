import type { AiProvider, AiResult, AiReviewNote, DraftContext, KnowledgeContext } from "./types";

const API_URL = "https://api.openai.com/v1/chat/completions";

interface OpenAiConfig {
  apiKey: string;
  model: string;
}

function knowledgeBlock(k: KnowledgeContext): string {
  return [
    `Headline: ${k.headline || "(none)"}`,
    `Expertise: ${k.expertise || "(none)"}`,
    `Audience: ${k.audience || "(none)"}`,
    `Preferred tone: ${k.tone || "(none)"}`,
    `Topics: ${k.topics.length ? k.topics.join(", ") : "(none)"}`,
  ].join("\n");
}

async function call(
  config: OpenAiConfig,
  system: string,
  user: string,
  maxTokens = 1024,
): Promise<AiResult<string>> {
  let res: Response;
  try {
    res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
  } catch (err) {
    return { ok: false, error: `Could not reach the AI service: ${(err as Error).message}` };
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return {
      ok: false,
      error: `The AI service returned an error (${res.status}). ${detail.slice(0, 200)}`,
    };
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = (json.choices?.[0]?.message?.content ?? "").trim();
  if (!text) return { ok: false, error: "The AI service sent back an empty response." };
  return { ok: true, data: text };
}

function parseLines(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.replace(/^\s*(?:[-*\d.)]+)\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 8);
}

/**
 * OpenAI provider. Same contract as the Anthropic provider; selected by
 * AI_PROVIDER=openai. Uses only the facts it is given and is never applied to a
 * draft without an explicit user action (see src/app/drafts/actions.ts).
 */
export function createOpenAiProvider(config: OpenAiConfig): AiProvider {
  return {
    id: "openai",
    enabled: true,

    async suggestIdeas(ctx: KnowledgeContext): Promise<AiResult<string[]>> {
      const r = await call(
        config,
        "You help a professional brainstorm content topics. Reply with 5 concise, specific topic ideas, one per line, no numbering, no preamble.",
        `Here is the professional's context:\n${knowledgeBlock(ctx)}\n\nSuggest 5 content topics they are well placed to write about.`,
      );
      return r.ok ? { ok: true, data: parseLines(r.data ?? "") } : { ok: false, error: r.error };
    },

    async suggestHook(ctx): Promise<AiResult<string[]>> {
      const r = await call(
        config,
        "You write opening hooks for professional posts. Reply with 3 alternative first-line hooks, one per line, no numbering, no preamble. Do not fabricate statistics.",
        `Context:\n${knowledgeBlock(ctx.knowledge)}\n\nDraft title: ${ctx.title}\nExisting notes: ${ctx.sourceNotes || "(none)"}\n\nWrite 3 opening hooks.`,
      );
      return r.ok ? { ok: true, data: parseLines(r.data ?? "") } : { ok: false, error: r.error };
    },

    async expandDraft(ctx): Promise<AiResult<string>> {
      return call(
        config,
        `You help draft professional content in the author's own voice. Tone: ${ctx.knowledge.tone || "clear and direct"}. Use only the facts in the notes provided. Do not invent data, quotes, or sources. Return the draft body only.`,
        `Context:\n${knowledgeBlock(ctx.knowledge)}\n\nTitle: ${ctx.title}\nHook: ${ctx.hook || "(none)"}\nNotes / source material:\n${ctx.sourceNotes || "(none)"}\n\nExisting body:\n${ctx.body || "(empty)"}\n\nWrite or extend the draft body.`,
        1500,
      );
    },

    async review(ctx: DraftContext): Promise<AiResult<AiReviewNote[]>> {
      const r = await call(
        config,
        'You are a careful editor. List concrete issues with the draft (clarity, unsupported claims, tone, structure). Reply one issue per line as "warning: ..." or "info: ...". If the draft is solid, reply "info: no significant issues found".',
        `Title: ${ctx.title}\nHook: ${ctx.hook}\nBody:\n${ctx.body}\n\nNotes:\n${ctx.sourceNotes || "(none)"}`,
      );
      if (!r.ok) return { ok: false, error: r.error };
      const notes: AiReviewNote[] = parseLines(r.data ?? "").map((line) => {
        const m = /^(warning|info)\s*:\s*(.*)$/i.exec(line);
        return m
          ? { severity: m[1].toLowerCase() === "warning" ? "warning" : "info", message: m[2] }
          : { severity: "info", message: line };
      });
      return { ok: true, data: notes };
    },
  };
}
