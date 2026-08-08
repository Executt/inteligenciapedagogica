/**
 * HUB-GOV / Horizon chart theme for Recharts.
 * Every value resolves to a semantic design token so charts follow the
 * Morning (light) and Evening (dark) themes automatically.
 */

/** Qualitative series palette (Horizon chart tokens). */
export const chartPalette = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

/**
 * Padrão de traço por série (índice). Garante que séries em gráficos de
 * linha permaneçam distinguíveis sem depender apenas da cor.
 */
export const seriesDashPatterns = ["0", "0", "6 3", "2 3", "10 4 2 4"];

export const seriesDashArray = (index: number) =>
  seriesDashPatterns[index % seriesDashPatterns.length];

export const chartSeriesColor = (index: number) => chartPalette[index % chartPalette.length];

/** Semantic status colors for charts (also conveyed by name/legend, never color alone). */
export const chartStatusColor = {
  positive: "var(--color-success)",
  attention: "var(--color-warning)",
  negative: "var(--color-destructive)",
  neutral: "var(--color-muted-foreground)",
  primary: "var(--color-primary)",
} as const;

export const gridProps = {
  strokeDasharray: "3 3",
  stroke: "var(--color-border)",
  strokeOpacity: 0.9,
  vertical: false,
} as const;

export const axisProps = {
  stroke: "var(--color-border)",
  tick: { fill: "var(--color-muted-foreground)", fontSize: 11 },
  tickLine: false,
  axisLine: { stroke: "var(--color-border)" },
} as const;

export const tooltipProps = {
  cursor: { fill: "var(--color-accent)", fillOpacity: 0.35 },
  contentStyle: {
    background: "var(--color-popover)",
    color: "var(--color-popover-foreground)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius)",
    boxShadow: "var(--shadow-level-2)",
    fontSize: 12,
    padding: "8px 10px",
  },
  labelStyle: { color: "var(--color-foreground)", fontWeight: 600, marginBottom: 2 },
  itemStyle: { color: "var(--color-popover-foreground)" },
} as const;

export const legendProps = {
  wrapperStyle: { fontSize: 12, color: "var(--color-muted-foreground)", paddingTop: 8 },
  iconType: "circle" as const,
  iconSize: 8,
};

/** Radar / polar charts. */
export const polarGridProps = { stroke: "var(--color-border)" } as const;
export const polarTickProps = { fontSize: 10, fill: "var(--color-muted-foreground)" } as const;

/** Bar corner radius aligned with the Horizon 8px radius scale. */
export const barRadius: [number, number, number, number] = [4, 4, 0, 0];
