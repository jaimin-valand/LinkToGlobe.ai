import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/primitives";
import { getCurrentUser } from "@/server/auth";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  if (await getCurrentUser()) redirect("/drafts");
  const { next } = await searchParams;

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-fg-muted mt-1 text-sm">
          Your account lives only on this install. Passwords are stored hashed. The app never keeps
          sign-in details for any other service.
        </p>
      </div>
      <Card>
        <LoginForm next={next} />
      </Card>
    </div>
  );
}
