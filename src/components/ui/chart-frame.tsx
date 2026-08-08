import type { ReactElement, ReactNode } from "react";
import {
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  gridProps,
  axisProps,
  tooltipProps,
  legendProps,
  polarGridProps,
  polarTickProps,
  chartSeriesColor,
  seriesDashArray,
} from "@/lib/chart-theme";

/** ------------------------------------------------------------------
 * ChartFrame — wrapper único para todos os gráficos Recharts.
 * Padroniza: card + elevação, título, altura, estados (carregando /
 * vazio / erro), cores de séries, grades, eixos, tooltip e legenda.
 * Use SEMPRE este componente em vez de montar ResponsiveContainer
 * manualmente, para que o tema Morning/Evening seja respeitado.
 * ------------------------------------------------------------------ */

export type ChartFrameProps = {
  /** Título do gráfico (obrigatório: também serve de rótulo acessível). */
  title: string;
  description?: string;
  /** Altura útil da área de plotagem, em px. */
  height?: number;
  loading?: boolean;
  error?: boolean;
  /** Quando true, exibe o estado vazio padronizado. */
  empty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  errorDescription?: string;
  footnote?: ReactNode;
  actions?: ReactNode;
  className?: string;
  contentClassName?: string;
  /** Renderiza sem o Card externo (para embutir em cards já existentes). */
  bare?: boolean;
  children: ReactElement;
};

export function ChartFrame({
  title,
  description,
  height = 280,
  loading,
  error,
  empty,
  emptyTitle = "Sem dados para exibir",
  emptyDescription = "Não há registros suficientes no período selecionado.",
  errorDescription = "Não foi possível carregar o gráfico. Tente novamente em alguns instantes.",
  footnote,
  actions,
  className,
  contentClassName,
  bare,
  children,
}: ChartFrameProps) {
  const body = loading ? (
    <div role="status" aria-live="polite" aria-label={`Carregando gráfico: ${title}`}>
      <Skeleton style={{ height }} className="w-full" />
    </div>
  ) : error ? (
    <ErrorState description={errorDescription} />
  ) : empty ? (
    <EmptyState title={emptyTitle} description={emptyDescription} />
  ) : (
    <figure
      className="m-0"
      role="img"
      aria-label={description ? `${title}. ${description}` : title}
    >
      <ResponsiveContainer width="100%" height={height}>
        {children}
      </ResponsiveContainer>
      {footnote && (
        <figcaption className="mt-2 text-[11px] text-muted-foreground">{footnote}</figcaption>
      )}
    </figure>
  );

  if (bare) return <div className={cn("w-full", className)}>{body}</div>;

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-sm">{title}</CardTitle>
            {description && (
              <p className="mt-1 text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      </CardHeader>
      <CardContent className={contentClassName}>{body}</CardContent>
    </Card>
  );
}

/** ---- Primitivas temáticas (usar dentro do ChartFrame) ------------- */

export const ChartGrid = (props: Record<string, any>) => (
  <CartesianGrid {...gridProps} {...props} />
);

export const ChartXAxis = (props: Record<string, any>) => (
  <XAxis {...axisProps} {...props} />
);

export const ChartYAxis = (props: Record<string, any>) => (
  <YAxis {...axisProps} {...props} />
);

export const ChartTooltip = (props: Record<string, any>) => (
  <Tooltip {...tooltipProps} {...props} />
);

export const ChartLegend = (props: Record<string, any>) => (
  <Legend {...legendProps} {...props} />
);

export const ChartPolarGrid = (props: Record<string, any>) => (
  <PolarGrid {...polarGridProps} {...props} />
);

export const ChartPolarAngleAxis = (props: Record<string, any>) => (
  <PolarAngleAxis tick={polarTickProps} {...props} />
);

export const ChartPolarRadiusAxis = (props: Record<string, any>) => (
  <PolarRadiusAxis tick={{ fontSize: 9, fill: "var(--color-muted-foreground)" }} {...props} />
);

/**
 * Props padronizadas de série.
 * `index` define cor (paleta chart-1..5) e padrão de traço, para que
 * as séries continuem distinguíveis sem depender apenas da cor.
 */
export function lineSeries(index: number, extra?: Record<string, unknown>) {
  return {
    type: "monotone" as const,
    stroke: chartSeriesColor(index),
    strokeWidth: 2,
    strokeDasharray: seriesDashArray(index),
    dot: false,
    activeDot: { r: 4, strokeWidth: 0 },
    ...extra,
  };
}

export function barSeries(index: number, extra?: Record<string, unknown>) {
  return {
    fill: chartSeriesColor(index),
    radius: [4, 4, 0, 0] as [number, number, number, number],
    maxBarSize: 42,
    ...extra,
  };
}

export function areaSeries(index: number, extra?: Record<string, unknown>) {
  return {
    type: "monotone" as const,
    stroke: chartSeriesColor(index),
    strokeWidth: 2,
    fill: chartSeriesColor(index),
    fillOpacity: 0.16,
    ...extra,
  };
}
