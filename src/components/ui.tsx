import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

const buttonVariants = {
  primary: "btn-shine bg-brand text-on-brand shadow-sm shadow-brand/20 hover:bg-brand-strong hover:shadow-lg hover:shadow-brand/30",
  secondary: "border border-line bg-surface-2 text-foreground hover:bg-line",
  ghost: "text-muted hover:text-foreground hover:bg-surface-2",
  danger: "bg-danger/15 text-danger hover:bg-danger/25",
};

const buttonBase =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50";

export function Button({
  variant = "primary",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: keyof typeof buttonVariants }) {
  return <button className={cn(buttonBase, buttonVariants[variant], className)} {...props} />;
}

/** Button styles for a link-like element rendered elsewhere (e.g. a PendingLink). */
export function buttonClass(variant: keyof typeof buttonVariants = "primary", className?: string) {
  return cn(buttonBase, buttonVariants[variant], className);
}

export function ButtonLink({
  variant = "primary",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: keyof typeof buttonVariants }) {
  return <Link className={cn(buttonBase, buttonVariants[variant], className)} {...props} />;
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div className={cn("rounded-xl border border-line bg-surface", className)} {...props} />
  );
}

export function CardHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
      <div className="min-w-0">
        <h2 className="font-medium">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0 [overflow-wrap:anywhere]">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "brand" | "up" | "warning";
}) {
  return (
    <Card className="@container p-5">
      <p className="text-sm text-muted">{label}</p>
      <p
        className={cn(
          "mt-2 font-mono text-[clamp(1rem,11cqw,1.5rem)] font-semibold tabular-nums [overflow-wrap:anywhere]",
          tone === "brand" && "text-brand",
          tone === "up" && "text-up",
          tone === "warning" && "text-warning",
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </Card>
  );
}

const fieldClass =
  "w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-foreground placeholder:text-muted/60 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(fieldClass, className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(fieldClass, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(fieldClass, "min-h-20", className)} {...props} />;
}

export function Alert({
  tone,
  children,
}: {
  tone: "error" | "success" | "info";
  children: ReactNode;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-lg border px-3 py-2 text-sm",
        tone === "error" && "border-danger/30 bg-danger/10 text-danger",
        tone === "success" && "border-up/30 bg-up/10 text-up",
        tone === "info" && "border-line bg-surface-2 text-muted",
      )}
    >
      {children}
    </div>
  );
}

const statusStyles: Record<string, string> = {
  PENDING: "bg-warning/15 text-warning",
  APPROVING: "bg-warning/15 text-warning",
  APPROVED: "bg-up/15 text-up",
  ACTIVE: "bg-up/15 text-up",
  REJECTED: "bg-down/15 text-down",
  SUSPENDED: "bg-down/15 text-down",
  CANCELLED: "bg-line text-muted",
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return (
    <span
      className={cn(
        "inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium capitalize",
        statusStyles[status] ?? "bg-line text-muted",
      )}
    >
      {label ?? status.toLowerCase().replace("_", " ")}
    </span>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="px-5 py-12 text-center">
      <p className="font-medium">{title}</p>
      {children && <div className="mt-1 text-sm text-muted">{children}</div>}
    </div>
  );
}

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm [&_td]:px-5 [&_td]:py-3 [&_th]:px-5 [&_th]:py-2.5 [&_th]:text-xs [&_th]:font-medium [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-muted [&_thead]:border-b [&_thead]:border-line [&_tbody_tr]:border-b [&_tbody_tr]:border-line/60 [&_tbody_tr:last-child]:border-0">
        {children}
      </table>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-surface-2", className)} />;
}
