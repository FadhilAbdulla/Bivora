import { Card } from "./ui";

export function ArkPendingNotice({ compact }: { compact?: boolean }) {
  return (
    <Card className={compact ? "p-5" : "p-8 text-center"}>
      <div className={compact ? "flex items-start gap-3" : "mx-auto max-w-md"}>
        <span className={`grid size-10 shrink-0 place-items-center rounded-lg bg-warning/15 text-warning ${compact ? "" : "mx-auto"}`}>
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M12 6v6l4 2M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20" />
          </svg>
        </span>
        <div className={compact ? "" : "mt-4"}>
          <p className="font-medium">Trading account connection pending</p>
          <p className="mt-1 text-sm text-muted">
            Live balance, equity, open positions and trade history will appear here once your account is linked to our
            trading platform.
          </p>
        </div>
      </div>
    </Card>
  );
}
