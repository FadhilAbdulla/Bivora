import type { FundRequest, User } from "@prisma/client";
import { METHOD_LABELS } from "@/lib/constants";
import { formatDate, formatMoney } from "@/lib/money";
import { EmptyState, StatusBadge, Table, cn } from "./ui";

type Row = FundRequest & { user?: Pick<User, "email" | "firstName" | "lastName"> };

export function FundRequestTable({
  requests,
  showUser,
  compact,
  emptyText = "No requests yet.",
  actions,
}: {
  requests: Row[];
  showUser?: boolean;
  /** Hide the method column, for narrow cards. */
  compact?: boolean;
  emptyText?: string;
  actions?: (request: Row) => React.ReactNode;
}) {
  if (requests.length === 0) return <EmptyState title={emptyText} />;

  return (
    <div className="@container">
      {/* One card per request wherever a table wouldn't fit, including narrow columns on large screens. */}
      <ul className={cn("divide-y divide-line", actions ? "@min-[1080px]:hidden" : "@3xl:hidden")}>
        {requests.map((r) => {
          const action = actions?.(r);
          return (
            <li key={r.id} className="space-y-2 px-4 py-4 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium capitalize">{r.type.toLowerCase()}</p>
                  <p className="text-xs text-muted">{formatDate(r.createdAt)}</p>
                </div>
                <div className="text-right">
                  <p className={cn("font-mono tabular-nums", r.type === "DEPOSIT" ? "text-up" : "text-foreground")}>
                    {r.type === "DEPOSIT" ? "+" : "−"}
                    {formatMoney(r.amount, r.currency)}
                  </p>
                  <StatusBadge status={r.status} />
                </div>
              </div>
              {showUser && r.user && (
                <p className="[overflow-wrap:anywhere]">
                  {r.user.firstName} {r.user.lastName} <span className="text-xs text-muted">· {r.user.email}</span>
                </p>
              )}
              <p className="text-muted">
                {METHOD_LABELS[r.method] ?? r.method}
                {(r.reference || r.payoutDetails) && (
                  <span className="block text-xs [overflow-wrap:anywhere]">{r.reference ?? r.payoutDetails}</span>
                )}
              </p>
              {r.adminNote && <p className="text-xs text-muted">Note: {r.adminNote}</p>}
              {action && <div className="pt-1">{action}</div>}
            </li>
          );
        })}
      </ul>

      <div className={cn("hidden", actions ? "@min-[1080px]:block" : "@3xl:block")}>
    <Table>
      <thead>
        <tr>
          <th>Request</th>
          {showUser && <th>Client</th>}
          {!compact && <th>Method</th>}
          <th className="text-right">Amount</th>
          <th>Status</th>
          {actions && <th className="text-right">Actions</th>}
        </tr>
      </thead>
      <tbody>
        {requests.map((r) => (
          <tr key={r.id} className="align-top">
            <td className="whitespace-nowrap">
              <p className="capitalize">{r.type.toLowerCase()}</p>
              <p className="text-xs text-muted">{formatDate(r.createdAt)}</p>
            </td>
            {showUser && r.user && (
              <td>
                <p>{r.user.firstName} {r.user.lastName}</p>
                <p className="text-xs text-muted [overflow-wrap:anywhere]">{r.user.email}</p>
              </td>
            )}
            {compact ? null : (
              <td>
                <p>{METHOD_LABELS[r.method] ?? r.method}</p>
                {(r.reference || r.payoutDetails) && (
                  <p className="max-w-56 truncate text-xs text-muted" title={r.reference ?? r.payoutDetails ?? ""}>
                    {r.reference ?? r.payoutDetails}
                  </p>
                )}
              </td>
            )}
            <td
              className={cn(
                "whitespace-nowrap text-right font-mono tabular-nums",
                r.type === "DEPOSIT" ? "text-up" : "text-foreground",
              )}
            >
              {r.type === "DEPOSIT" ? "+" : "−"}
              {formatMoney(r.amount, r.currency)}
            </td>
            <td>
              <StatusBadge status={r.status} />
              {r.adminNote && <p className="mt-1 max-w-48 text-xs text-muted">{r.adminNote}</p>}
            </td>
            {actions && <td className="text-right">{actions(r)}</td>}
          </tr>
        ))}
      </tbody>
    </Table>
      </div>
    </div>
  );
}
