"use client";

import { useActionState } from "react";
import { approveRequest, rejectRequest } from "./actions";

export function ReviewActions({ id, type, amount }: { id: string; type: string; amount: string }) {
  const [approveState, approve, approving] = useActionState(approveRequest, null);
  const [rejectState, reject, rejecting] = useActionState(rejectRequest, null);
  const state = approveState ?? rejectState;
  const busy = approving || rejecting;

  return (
    <form className="flex w-full flex-col items-stretch gap-1.5 text-left md:ml-auto md:w-56">
      <input type="hidden" name="id" value={id} />
      <input
        name="adminNote"
        placeholder="Note (optional)"
        maxLength={500}
        className="rounded-md border border-line bg-surface-2 px-2 py-2 text-sm outline-none focus:border-brand md:py-1 md:text-xs"
      />
      <div className="flex gap-1.5">
        <button
          formAction={approve}
          disabled={busy}
          onClick={(e) => {
            if (!confirm(`Approve this ${type.toLowerCase()} of ${amount}?`)) e.preventDefault();
          }}
          className="flex-1 rounded-md bg-up px-2 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 md:py-1 md:text-xs"
        >
          {approving ? "…" : "Approve"}
        </button>
        <button
          formAction={reject}
          disabled={busy}
          className="flex-1 rounded-md bg-danger/15 px-2 py-2 text-sm font-medium text-danger hover:bg-danger/25 disabled:opacity-50 md:py-1 md:text-xs"
        >
          {rejecting ? "…" : "Reject"}
        </button>
      </div>
      {state?.error && <p className="text-xs text-danger">{state.error}</p>}
    </form>
  );
}
