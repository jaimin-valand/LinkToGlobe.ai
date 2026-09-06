"use client";

import { useActionState, useState } from "react";
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

  const [headline, setHeadline] = useState(values.headline);
  const [expertise, setExpertise] = useState(values.expertise);
  const [audience, setAudience] = useState(values.audience);
  const [tone, setTone] = useState(values.tone);
  const [topics, setTopics] = useState(values.topics.join(", "));
  const [sources, setSources] = useState(values.sources);

  return (
    <form action={action} className="flex flex-col gap-5">
      {state.ok && (
        <p className="rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-800 dark:border-green-800 dark:bg-green-950/40 dark:text-green-300">
          Saved.
        </p>
      )}
      <FormError message={state.error} />

      <Field label="Headline" htmlFor="headline" hint="One line about what you do.">
        <Input
          id="headline"
          name="headline"
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
        />
      </Field>

      <Field
        label="Expertise"
        htmlFor="expertise"
        hint="The subjects you know well. Drafts and suggestions use this."
      >
        <Textarea
          id="expertise"
          name="expertise"
          rows={4}
          value={expertise}
          onChange={(e) => setExpertise(e.target.value)}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Audience" htmlFor="audience" hint="Who you are writing for.">
          <Input
            id="audience"
            name="audience"
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
          />
        </Field>
        <Field label="Preferred tone" htmlFor="tone" hint="For example: direct, warm, technical.">
          <Input id="tone" name="tone" value={tone} onChange={(e) => setTone(e.target.value)} />
        </Field>
      </div>

      <Field label="Topics" htmlFor="topics" hint="Separate with commas or new lines.">
        <Textarea
          id="topics"
          name="topics"
          rows={2}
          value={topics}
          onChange={(e) => setTopics(e.target.value)}
        />
      </Field>

      <Field
        label="Reference material"
        htmlFor="sources"
        hint="Links, notes, or past work for drafts to reference. None of this is published on its own."
      >
        <Textarea
          id="sources"
          name="sources"
          rows={5}
          value={sources}
          onChange={(e) => setSources(e.target.value)}
        />
      </Field>

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}
