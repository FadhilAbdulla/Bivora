"use client";

import { useTransition } from "react";
import { Button, Card } from "@/components/ui";

/** Shown inside the layout when a page fails to load, e.g. a slow database or ARK moment. */
export default function PageError({ error, retry }: { error: unknown; retry: () => void }) {
  const [pending, start] = useTransition();
  const digest = typeof error === "object" && error && "digest" in error ? String(error.digest) : "";
  return (
    <Card className="mx-auto mt-10 max-w-md p-6 text-center sm:p-8">
      <h1 className="text-lg font-semibold">This page didn&apos;t load</h1>
      <p className="mt-2 text-sm text-muted">Something went wrong on our side, usually for a moment. Try again, and if it keeps happening, let us know.</p>
      <Button className="mt-5" disabled={pending} onClick={() => start(() => retry())}>
        {pending ? "Trying again…" : "Try again"}
      </Button>
      {digest && <p className="mt-4 font-mono text-xs text-muted">Error {digest}</p>}
    </Card>
  );
}
