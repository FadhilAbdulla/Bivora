"use client";

import { useCallback, useEffect, useState } from "react";
import { formatMoney } from "@/lib/money";
import { Card, cn } from "./ui";

// One trading account's financial standing, fetched from /api/trading/financials after the page
// has rendered, so the rest of the page never waits for ARK.

type Summary = {
  balance?: number;
  equity?: number;
  credit?: number;
  bonus?: number;
  deposits?: number;
  withdrawals?: number;
  closedProfit?: number;
  margin?: number;
  freeMargin?: number;
  marginLevel?: number;
  profit?: number;
};

type State = { status: "loading" } | { status: "error"; error: string } | { status: "ready"; summary: Summary | null; at: Date };

export function TradingFinancials({
  account,
  currency,
  detailed,
  action,
}: {
  account: { arkUserId: string; label: string };
  currency: string;
  /** Also show deposits, withdrawals and closed profit (the trading account page). */
  detailed?: boolean;
  action?: React.ReactNode;
}) {
  const [state, setState] = useState<State>({ status: "loading" });

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setState({ status: "loading" });
      try {
        const res = await fetch(`/api/trading/financials?account=${encodeURIComponent(account.arkUserId)}`, { cache: "no-store", signal });
        const body = await res.json().catch(() => null);
        if (!res.ok || !body) {
          setState({ status: "error", error: body?.error ?? "Your trading account figures can't be loaded right now." });
          return;
        }
        setState({ status: "ready", summary: body.summary ?? null, at: new Date(body.at ?? Date.now()) });
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setState({ status: "error", error: "Couldn't reach the server. Check your connection and try again." });
      }
    },
    [account.arkUserId],
  );

  useEffect(() => {
    const controller = new AbortController();
    // Loading starts here, after the page is on screen.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const money = (n?: number) => (n === undefined ? "—" : formatMoney(n, currency));
  const s = state.status === "ready" ? state.summary : null;
  const items: [string, string, string?][] = [
    ["Balance", money(s?.balance)],
    ["Equity", money(s?.equity)],
    ["Open P/L", money(s?.profit), s?.profit === undefined ? undefined : s.profit < 0 ? "text-down" : "text-up"],
    ["Free margin", money(s?.freeMargin)],
    ["Used margin", money(s?.margin)],
    ["Margin level", s?.marginLevel !== undefined && s.marginLevel > 0 ? `${s.marginLevel.toFixed(0)}%` : "—"],
    ["Credit", money(s?.credit)],
    ["Bonus", money(s?.bonus)],
    ...(detailed
      ? ([
          ["Total deposits", money(s?.deposits)],
          ["Total withdrawals", money(s?.withdrawals)],
          ["Closed profit", money(s?.closedProfit), s?.closedProfit === undefined ? undefined : s.closedProfit < 0 ? "text-down" : "text-up"],
        ] as [string, string, string?][])
      : []),
  ];

  return (
    <Card className="p-5" aria-busy={state.status === "loading"}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">{account.label}</p>
          <p className="text-xs text-muted">
            {state.status === "ready"
              ? `Updated ${state.at.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`
              : state.status === "loading"
                ? "Getting the latest figures…"
                : "Financial standing"}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void load()}
            disabled={state.status === "loading"}
            className="rounded-md px-2.5 py-1.5 text-sm font-medium text-brand hover:bg-surface-2 disabled:opacity-50"
          >
            Refresh
          </button>
          {action}
        </div>
      </div>

      {state.status === "error" ? (
        <p className="mt-3 text-sm text-muted">{state.error}</p>
      ) : state.status === "ready" && !s ? (
        <p className="mt-3 text-sm text-muted">No figures on this trading account yet.</p>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          {items.map(([label, value, tone]) => (
            <div key={label}>
              <p className="text-xs text-muted">{label}</p>
              {state.status === "loading" ? (
                <div className="mt-1 h-5 w-20 animate-pulse rounded bg-surface-2" />
              ) : (
                <p className={cn("mt-0.5 font-mono font-medium tabular-nums", tone)}>{value}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
