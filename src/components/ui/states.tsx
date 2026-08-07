import type { ReactNode } from "react";
import { Loader2, Inbox, AlertTriangle, Info, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

/** ------------------------------------------------------------------
 * Padrão HUB-GOV para estados de página: carregando, vazio, erro e avisos.
 * ------------------------------------------------------------------ */

export function LoadingState({
  label = "Carregando dados...",
  className,
}: { label?: string; className?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-center justify-center gap-2 rounded-md border border-border bg-card px-4 py-10 text-sm text-muted-foreground elevation-0",
        className,
      )}
    >
      <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function InlineLoader({ label = "Carregando..." }: { label?: string }) {
  return (
    <span role="status" aria-live="polite" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" aria-hidden="true" />
      {label}
    </span>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div role="status" aria-live="polite" aria-label="Carregando tabela" className="space-y-2">
      <div className="flex gap-2">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-8 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-2">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-9 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonCards({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Carregando indicadores"
      className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-4", className)}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-md border border-border bg-card p-4 elevation-0 space-y-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-3 w-32" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonChart({ height = 280 }: { height?: number }) {
  return (
    <div role="status" aria-live="polite" aria-label="Carregando gráfico" className="rounded-md border border-border bg-card p-4 elevation-0">
      <Skeleton className="h-3 w-40 mb-4" />
      <Skeleton style={{ height }} className="w-full" />
    </div>
  );
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-card px-6 py-12 text-center",
        className,
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground" aria-hidden="true">
        {icon ?? <Inbox className="h-5 w-5" />}
      </div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && <p className="max-w-md text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = "Não foi possível carregar os dados",
  description,
  action,
  className,
}: { title?: string; description?: string; action?: ReactNode; className?: string }) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-start gap-2 rounded-md border border-destructive/40 bg-destructive/8 px-4 py-4 text-sm",
        className,
      )}
    >
      <div className="flex items-center gap-2 font-medium text-destructive">
        <AlertTriangle className="h-4 w-4" aria-hidden="true" />
        <span>{title}</span>
      </div>
      {description && <p className="text-muted-foreground">{description}</p>}
      {action}
    </div>
  );
}

const MESSAGE_TONE = {
  info: {
    wrap: "border-info/40 bg-info/8",
    text: "text-info",
    Icon: Info,
    prefix: "Informação",
  },
  success: {
    wrap: "border-success/40 bg-success/8",
    text: "text-success",
    Icon: CheckCircle2,
    prefix: "Sucesso",
  },
  warning: {
    wrap: "border-warning/40 bg-warning/10",
    text: "text-warning",
    Icon: AlertTriangle,
    prefix: "Atenção",
  },
  error: {
    wrap: "border-destructive/40 bg-destructive/8",
    text: "text-destructive",
    Icon: AlertTriangle,
    prefix: "Erro",
  },
} as const;

/** Mensagem semântica (nunca apenas cor: sempre ícone + rótulo textual). */
export function MessageStrip({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: keyof typeof MESSAGE_TONE;
  title?: string;
  children?: ReactNode;
  className?: string;
}) {
  const t = MESSAGE_TONE[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("flex items-start gap-2 rounded-md border px-3 py-2 text-sm", t.wrap, className)}
    >
      <t.Icon className={cn("mt-0.5 h-4 w-4 shrink-0", t.text)} aria-hidden="true" />
      <div className="min-w-0">
        <span className={cn("font-medium", t.text)}>{title ?? t.prefix}</span>
        {children && <div className="text-foreground/80">{children}</div>}
      </div>
    </div>
  );
}
