"use client";

import { useActionState, useState } from "react";
import { Button, Field, FormError, Input, Textarea } from "@/components/ui/primitives";
import {
  aiAssistAction,
  saveDraftAction,
  submitDraftAction,
  type AiState,
  type EditState,
} from "../actions";

interface Draft {
  id: string;
  title: string;
  hook: string;
  body: string;
  sourceNotes: string;
}

const editInitial: EditState = {};
const aiInitial: AiState = {};

export function DraftEditor({ draft, aiEnabled }: { draft: Draft; aiEnabled: boolean }) {
  const [title, setTitle] = useState(draft.title);
  const [hook, setHook] = useState(draft.hook);
  const [body, setBody] = useState(draft.body);
  const [sourceNotes, setSourceNotes] = useState(draft.sourceNotes);

  const [saveState, save, saving] = useActionState(saveDraftAction, editInitial);
  const [ai, runAi, aiPending] = useActionState(aiAssistAction, aiInitial);

  const hidden = (
    <>
      <input type="hidden" name="id" value={draft.id} />
      <input type="hidden" name="title" value={title} />
      <input type="hidden" name="hook" value={hook} />
      <input type="hidden" name="body" value={body} />
      <input type="hidden" name="sourceNotes" value={sourceNotes} />
    </>
  );

  return (
    <div className="flex flex-col gap-6">
      <form action={save} className="flex flex-col gap-4">
        <input type="hidden" name="id" value={draft.id} />
        {saveState.ok && (
          <p className="rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-800 dark:border-green-800 dark:bg-green-950/40 dark:text-green-300">
            Saved.
          </p>
        )}
        <FormError message={saveState.error} />

        <Field label="Title" htmlFor="title">
          <Input
            id="title"
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={200}
          />
        </Field>

        <Field label="Hook" htmlFor="hook" hint="The opening line readers see first.">
          <Textarea
            id="hook"
            name="hook"
            rows={2}
            value={hook}
            onChange={(e) => setHook(e.target.value)}
          />
        </Field>

        <Field label="Body" htmlFor="body">
          <Textarea
            id="body"
            name="body"
            rows={12}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </Field>

        <Field
          label="Source notes"
          htmlFor="sourceNotes"
          hint="Facts, links, quotes the draft draws on. Quality checks look here when the body cites figures."
        >
          <Textarea
            id="sourceNotes"
            name="sourceNotes"
            rows={4}
            value={sourceNotes}
            onChange={(e) => setSourceNotes(e.target.value)}
          />
        </Field>

        <div className="flex flex-wrap gap-3">
          <Button type="submit" variant="secondary" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>

      {aiEnabled && (
        <div className="border-border bg-surface rounded-lg border p-4">
          <h3 className="text-sm font-semibold">AI assist</h3>
          <p className="text-fg-muted mt-0.5 text-xs">
            Suggestions only. Nothing is applied until you paste it in. Save first so the assistant
            sees your latest text.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(["ideas", "hook", "expand", "review"] as const).map((kind) => (
              <form key={kind} action={runAi}>
                {hidden}
                <input type="hidden" name="kind" value={kind} />
                <Button type="submit" variant="ghost" disabled={aiPending}>
                  {kind === "ideas"
                    ? "Topic ideas"
                    : kind === "hook"
                      ? "Hook options"
                      : kind === "expand"
                        ? "Expand body"
                        : "Review"}
                </Button>
              </form>
            ))}
          </div>

          <FormError message={ai.error} />

          {ai.ideas && (
            <ul className="mt-3 list-disc pl-5 text-sm">
              {ai.ideas.map((x, i) => (
                <li key={i}>{x}</li>
              ))}
            </ul>
          )}
          {ai.hooks && (
            <ul className="mt-3 flex flex-col gap-2 text-sm">
              {ai.hooks.map((x, i) => (
                <li key={i} className="flex items-start justify-between gap-3">
                  <span>{x}</span>
                  <button
                    type="button"
                    className="text-signal shrink-0 text-xs underline underline-offset-2"
                    onClick={() => setHook(x)}
                  >
                    use
                  </button>
                </li>
              ))}
            </ul>
          )}
          {ai.body && (
            <div className="mt-3 text-sm">
              <pre className="border-border bg-bg max-h-60 overflow-auto rounded border p-3 whitespace-pre-wrap">
                {ai.body}
              </pre>
              <button
                type="button"
                className="text-signal mt-2 text-xs underline underline-offset-2"
                onClick={() => setBody(ai.body!)}
              >
                replace body with this
              </button>
            </div>
          )}
          {ai.notes && (
            <ul className="mt-3 flex flex-col gap-1.5 text-sm">
              {ai.notes.map((n, i) => (
                <li key={i}>
                  <span
                    className={
                      n.severity === "warning"
                        ? "font-medium text-amber-700 dark:text-amber-400"
                        : "text-fg-muted"
                    }
                  >
                    {n.severity}:
                  </span>{" "}
                  {n.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <form action={submitDraftAction} className="border-border bg-surface rounded-lg border p-4">
        <input type="hidden" name="id" value={draft.id} />
        <h3 className="text-sm font-semibold">Ready?</h3>
        <p className="text-fg-muted mt-0.5 text-xs">
          Submitting runs the automated quality checks and moves the draft to Quality check. Save
          your edits first.
        </p>
        <Button type="submit" className="mt-3">
          Submit for quality check
        </Button>
      </form>
    </div>
  );
}
