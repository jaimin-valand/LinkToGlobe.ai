import type { Metadata } from "next";
import { requireUser } from "@/server/auth";
import { getKnowledge } from "@/server/knowledge/service";
import { KnowledgeForm } from "./KnowledgeForm";

export const metadata: Metadata = { title: "Knowledge" };

export default async function KnowledgePage() {
  const user = await requireUser();
  const knowledge = await getKnowledge(user.id);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Your knowledge</h1>
        <p className="text-fg-muted mt-1 text-sm">
          The professional context every draft is grounded in. This is the{" "}
          <span className="font-mono">USER_KNOWLEDGE</span> pipeline stage.
        </p>
      </div>

      <KnowledgeForm
        values={{
          headline: knowledge?.headline ?? "",
          expertise: knowledge?.expertise ?? "",
          audience: knowledge?.audience ?? "",
          tone: knowledge?.tone ?? "",
          topics: knowledge?.topics ?? [],
          sources: knowledge?.sources ?? "",
        }}
      />
    </div>
  );
}
