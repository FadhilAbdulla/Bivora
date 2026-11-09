"use client";

import { useState } from "react";
import { usePendingNav } from "@/components/pending-nav";
import { Select } from "@/components/ui";

/** Switches the accounts list to another office. */
export function OfficePicker({ offices, top, topName, node, source }: {
  offices: { id: number; label: string }[];
  top: number;
  topName: string;
  node: number;
  /** The Bivora / ARK filter, kept when the office changes. */
  source?: string;
}) {
  const { pending, go } = usePendingNav();
  // Shows the new choice while its page loads (the page remounts this with the new node).
  const [shown, setShown] = useState(String(node));
  const listed = node === top || offices.some((o) => o.id === node);

  return (
    <Select
      aria-label="Office"
      value={shown}
      disabled={pending}
      className="sm:w-64"
      onChange={(e) => {
        setShown(e.target.value);
        const next = new URLSearchParams({ node: e.target.value, ...(source && { source }) });
        go(`/admin/ark?${next}`);
      }}
    >
      {offices.map((o) => (
        <option key={o.id} value={o.id}>{o.label}</option>
      ))}
      {!listed && <option value={node}>Office {node}</option>}
      <option value={top}>All offices{topName ? ` · ${topName}` : ""}</option>
    </Select>
  );
}
