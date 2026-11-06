"use client";

import { useActionState } from "react";
import { Alert, Button } from "@/components/ui";
import { resendArkCredentials, reviewKyc } from "./actions";

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
        <Button
          name="decision"
          value="APPROVED"
          disabled={pending}
          onClick={(e) => {
            if (!confirm("Approve this client? This creates their ARK account and emails them their login details.")) e.preventDefault();
          }}
        >
          {pending ? "Working…" : "Approve"}
        </Button>
        <Button name="decision" value="REJECTED" variant="danger" disabled={pending}>
          Reject
        </Button>
      </div>
      <p className="text-xs text-muted">Approving creates the client&apos;s ARK account and emails them their login details.</p>
    </form>
  );
}

export function ResendCredentials({ userId, sent }: { userId: string; sent: boolean }) {
  const [state, action, pending] = useActionState(resendArkCredentials, null);

  return (
    <form action={action} className="space-y-2 border-t border-line p-4 sm:p-5">
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      {state?.success && <Alert tone="success">{state.success}</Alert>}
      <input type="hidden" name="userId" value={userId} />
      <Button
        variant="secondary"
        disabled={pending}
        onClick={(e) => {
          if (sent && !confirm("Send new login details? This replaces the client's current ARK password.")) e.preventDefault();
        }}
      >
        {pending ? "Sending…" : "Resend login details"}
      </Button>
    </form>
  );
}
