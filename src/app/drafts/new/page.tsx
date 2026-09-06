import type { Metadata } from "next";
import { Card } from "@/components/ui/primitives";
import { requireUser } from "@/server/auth";
import { NewDraftForm } from "./NewDraftForm";

export const metadata: Metadata = { title: "New draft" };

export default async function NewDraftPage() {
  await requireUser();
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">New draft</h1>
      <Card>
        <NewDraftForm />
      </Card>
    </div>
  );
}
