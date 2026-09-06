import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";

export const metadata: Metadata = { title: "Approvals" };

export default function ApprovalsPage() {
  return (
    <PlaceholderPage title="Approvals" phase="Phase 1">
      <p>
        The mandatory human sign-off queue. Content reaching{" "}
        <code className="font-mono">USER_APPROVAL</code> waits here for an explicit decision before
        it can be scheduled or published. Not implemented in Step 1.
      </p>
    </PlaceholderPage>
  );
}
