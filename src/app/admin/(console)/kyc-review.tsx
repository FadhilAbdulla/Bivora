"use client";

import { useActionState } from "react";
import { Alert, Button } from "@/components/ui";
import { reviewKyc } from "./actions";

export function KycReview({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState(reviewKyc, null);

  return (
    <form action={action} className="space-y-2 border-t border-line p-4 sm:p-5">
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      <input type="hidden" name="userId" value={userId} />
      <textarea
        name="note"
        maxLength={500}
        placeholder="Reason (required to reject). The client sees this."
        className="min-h-16 w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand"
      />
      <div className="grid grid-cols-2 gap-2">
        <Button name="decision" value="APPROVED" disabled={pending}>
          Approve
        </Button>
        <Button name="decision" value="REJECTED" variant="danger" disabled={pending}>
          Reject
        </Button>
      </div>
    </form>
  );
}
