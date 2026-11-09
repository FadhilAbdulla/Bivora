"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
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
  const router = useRouter();
  const [pending, start] = useTransition();
  const listed = node === top || offices.some((o) => o.id === node);

  return (
    <Select
      aria-label="Office"
      value={String(node)}
      disabled={pending}
      className="sm:w-64"
      onChange={(e) => {
        const next = new URLSearchParams({ node: e.target.value, ...(source && { source }) });
        start(() => router.push(`/admin/ark?${next}`));
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
