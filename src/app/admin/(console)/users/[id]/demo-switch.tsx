"use client";

import { useTransition } from "react";
import { toast } from "@/components/toast";
import { Button } from "@/components/ui";
import { setClientDemo } from "../../actions";

/** Switches the client's ARK account between real and demo, after a confirm. */
export function DemoSwitch({ userId, demo }: { userId: string; demo: boolean }) {
  const [pending, start] = useTransition();
  const to = demo ? "real" : "demo";
  return (
    <Button
      type="button"
      variant="secondary"
      className="px-3 py-1.5 text-xs"
      disabled={pending}
      onClick={() => {
        const message = demo
          ? "Switch this client's ARK account back to a real account?"
          : "Switch this client's ARK account to a demo account? It will be treated as demo in ARK and in Bivora's reports.";
        if (!confirm(message)) return;
        start(async () => {
          const data = new FormData();
          data.set("userId", userId);
          data.set("demo", demo ? "0" : "1");
          const r = await setClientDemo(data);
          toast(r?.error ?? r?.success ?? "Done.");
        });
      }}
    >
      {pending ? "Switching…" : `Switch to ${to}`}
    </Button>
  );
}
