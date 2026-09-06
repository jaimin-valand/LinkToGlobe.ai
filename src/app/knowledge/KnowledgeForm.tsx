"use client";

import { useActionState } from "react";
import { Button, Field, FormError, Input, Textarea } from "@/components/ui/primitives";
import { saveKnowledgeAction, type KnowledgeFormState } from "./actions";

interface Values {
  headline: string;
  expertise: string;
  audience: string;
  tone: string;
  topics: string[];
  sources: string;
}

const initial: KnowledgeFormState = {};

export function KnowledgeForm({ values }: { values: Values }) {
  const [state, action, pending] = useActionState(saveKnowledgeAction, initial);

  return (
    <form action={action} className="flex flex-col gap-5">
      {state.ok && (
        <p className="rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-800 dark:border-green-800 dark:bg-green-950/40 dark:text-green-300">
          Saved.
        </p>
      )}
      <FormError message={state.error} />

      <Field label="Headline" htmlFor="headline" hint="One line: who you are, professionally.">
        <Input id="headline" name="headline" defaultValue={values.headline} />
      </Field>

      <Field
        label="Expertise"
        htmlFor="expertise"
        hint="What you know deeply. Used to ground drafts and topic suggestions."
      >
        <Textarea id="expertise" name="expertise" rows={4} defaultValue={values.expertise} />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Audience" htmlFor="audience" hint="Who you are writing for.">
          <Input id="audience" name="audience" defaultValue={values.audience} />
        </Field>
        <Field label="Preferred tone" htmlFor="tone" hint="e.g. direct, warm, technical.">
          <Input id="tone" name="tone" defaultValue={values.tone} />
        </Field>
      </div>

      <Field label="Topics" htmlFor="topics" hint="Comma or newline separated.">
        <Textarea id="topics" name="topics" rows={2} defaultValue={values.topics.join(", ")} />
      </Field>

      <Field
        label="Reference material"
        htmlFor="sources"
        hint="Links, notes, prior work you want drafts to draw on. Nothing here is published automatically."
      >
        <Textarea id="sources" name="sources" rows={5} defaultValue={values.sources} />
      </Field>

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save knowledge"}
        </Button>
      </div>
    </form>
  );
}
