import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";

export const metadata: Metadata = { title: "Pipeline" };

export default function PipelinePage() {
  return (
    <PlaceholderPage title="Pipeline" phase="Phase 1–2">
      <p>
        The working view of each piece of content as it moves through research, ideas, drafting, and
        quality review. Not implemented in Step 1.
      </p>
    </PlaceholderPage>
  );
}
