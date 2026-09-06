import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";

export const metadata: Metadata = { title: "Analytics" };

export default function AnalyticsPage() {
  return (
    <PlaceholderPage title="Analytics" phase="Phase 3">
      <p>
        Performance of published content, feeding the learning loop. No metrics are collected or
        displayed in Step 1 — there is deliberately no placeholder data here.
      </p>
    </PlaceholderPage>
  );
}
