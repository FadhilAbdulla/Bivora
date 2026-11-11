"use client";

import { useTransition } from "react";
import { toast } from "@/components/toast";
import { Button } from "@/components/ui";
import { createArkAccountNow } from "../../actions";

export function CreateArkButton({ userId }: { userId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm("Create this client's ARK account now and email their trading login?")) return;
        start(async () => {
          const data = new FormData();
          data.set("userId", userId);
          const r = await createArkAccountNow(data);
          toast(r?.error ?? r?.success ?? "Done.");
        });
      }}
    >
      {pending ? "Creating…" : "Create ARK account"}
    </Button>
  );
}
