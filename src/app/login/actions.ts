"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { register, signIn } from "@/server/auth";

const schema = z.object({
  intent: z.enum(["signin", "register"]),
  email: z.string().email("Enter a valid email."),
  password: z.string().min(1, "Enter your password."),
  name: z.string().optional(),
  next: z.string().optional(),
});

export interface AuthFormState {
  error?: string;
}

function safeNext(next: string | undefined): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/drafts";
}

export async function authenticate(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { intent, email, password, name, next } = parsed.data;

  const result =
    intent === "register" ? await register(email, password, name) : await signIn(email, password);

  if (!result.ok) return { error: result.error };
  redirect(safeNext(next));
}
