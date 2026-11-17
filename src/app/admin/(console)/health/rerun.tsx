"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui";

export function RerunButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button type="button" variant="secondary" disabled={pending} onClick={() => start(() => router.refresh())}>
      {pending ? "Checking…" : "Run check again"}
    </Button>
  );
}
