"use client";

import { useActionState, useState } from "react";
import { Button, Field, FormError, Input } from "@/components/ui/primitives";
import { authenticate, type AuthFormState } from "./actions";

const initial: AuthFormState = {};

export function LoginForm({ next }: { next?: string }) {
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [state, formAction, pending] = useActionState(authenticate, initial);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="intent" value={mode} />
      {next && <input type="hidden" name="next" value={next} />}

      <FormError message={state.error} />

      {mode === "register" && (
        <Field label="Name" htmlFor="name">
          <Input id="name" name="name" autoComplete="name" />
        </Field>
      )}

      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </Field>

      <Field
        label="Password"
        htmlFor="password"
        hint={mode === "register" ? "At least 8 characters." : undefined}
      >
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete={mode === "register" ? "new-password" : "current-password"}
        />
      </Field>

      <Button type="submit" disabled={pending}>
        {pending ? "…" : mode === "signin" ? "Sign in" : "Create account"}
      </Button>

      <button
        type="button"
        className="text-fg-muted text-sm underline underline-offset-4"
        onClick={() => setMode(mode === "signin" ? "register" : "signin")}
      >
        {mode === "signin" ? "Need an account? Register" : "Have an account? Sign in"}
      </button>
    </form>
  );
}
