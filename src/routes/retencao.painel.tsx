import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent } from "@/components/ui/card";
import {
  ChartFrame, ChartGrid, ChartXAxis, ChartYAxis, ChartTooltip, ChartLegend,
  areaSeries, barSeries, lineSeries,
} from "@/components/ui/chart-frame";
import { AreaChart, Area, Line, BarChart, Bar } from "recharts";
import { TrendingDown, TrendingUp, AlertTriangle, PhoneCall, ShieldCheck } from "lucide-react";
import { EmptyState, SkeletonCards, SkeletonChart, ErrorState } from "@/components/ui/states";
import { getRetencaoIndicadores } from "@/lib/retencao/indicadores.functions";

export const Route = createFileRoute("/retencao/painel")({
  component: PainelRetencao,
  head: () => ({
    meta: [
      { title: "Painel de Indicadores · Retenção Estudantil · Edu-Gov" },
      { name: "description", content: "Indicadores consolidados de retenção e evasão escolar por escola, causa e canal de contato." },
      { property: "og:title", content: "Painel de Indicadores · Retenção Estudantil · Edu-Gov" },
      { property: "og:description", content: "Indicadores consolidados de retenção e evasão escolar por escola, causa e canal de contato." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function KPI({ label, value, delta, positive, icon: Icon, tone }: {
  label: string; value: string; delta: string; positive: boolean;
  icon: typeof AlertTriangle; tone: "primary" | "success" | "warning" | "destructive";
}) {
  const toneMap = {
    primary: "text-primary bg-primary/10",
    success: "text-success bg-success/10",
    warning: "text-warning bg-warning/10",
    destructive: "text-destructive bg-destructive/10",
  } as const;
  const Trend = positive ? TrendingUp : TrendingDown;
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
            <div className="text-2xl font-semibold mt-2 tracking-tight">{value}</div>
            <div className={`mt-2 flex items-center gap-1 text-xs ${positive ? "text-success" : "text-destructive"}`}>
              <Trend className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{delta}</span>
            </div>
          </div>
          <div className={`shrink-0 h-9 w-9 rounded-sm flex items-center justify-center ${toneMap[tone]}`}>
            <Icon className="h-4 w-4" aria-hidden="true" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PainelRetencao() {
  const navigate = useNavigate();
  const carregar = useServerFn(getRetencaoIndicadores);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["retencao-indicadores"],
    queryFn: () => carregar(),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SkeletonCards count={4} />
        <SkeletonChart />
      </div>
    );
  }

  if (isError || !data) {
    return <ErrorState title="Não foi possível carregar os indicadores" description="Tente novamente em alguns instantes." />;
  }

  const { kpis, serie, causas, canais, porEscola } = data;
  const semDados = kpis.totalIntervencoes === 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPI
          label="Taxa de evasão"
          value={`${kpis.taxaEvasao.toFixed(1)}%`}
          delta="matrículas encerradas sobre o total"
          positive={kpis.taxaEvasao <= 5}
          icon={TrendingDown}
          tone="destructive"
        />
        <KPI
          label="Alunos em risco"
          value={String(kpis.alunosRisco)}
          delta="com intervenção sem retorno positivo"
          positive={false}
          icon={AlertTriangle}
          tone="warning"
        />
        <KPI
          label="Intervenções no mês"
          value={String(kpis.intervencoesMes)}
          delta={`${kpis.intervencoesMesDelta >= 0 ? "+" : ""}${kpis.intervencoesMesDelta} vs. mês anterior`}
          positive={kpis.intervencoesMesDelta >= 0}
          icon={PhoneCall}
          tone="primary"
        />
        <KPI
          label="Efetividade das intervenções"
          value={`${kpis.efetividade.toFixed(1)}%`}
          delta="contatos com retorno positivo"
          positive={kpis.efetividade >= 50}
          icon={ShieldCheck}
          tone="success"
        />
      </div>

      {semDados ? (
        <EmptyState
          title="Nenhuma intervenção registrada ainda"
          description="Os indicadores são calculados a partir das intervenções gravadas. Registre a primeira intervenção para ver os gráficos."
          icon={<PhoneCall className="h-5 w-5" aria-hidden="true" />}
        />
      ) : (
        <>
          <ChartFrame
            title="Evolução das intervenções e da efetividade"
            description="Volume mensal de intervenções registradas e percentual de contatos com retorno positivo."
            height={280}
          >
            <AreaChart data={serie}>
              <defs>
                <linearGradient id="grad-intervencoes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <ChartGrid />
              <ChartXAxis dataKey="mes" />
              <ChartYAxis />
              <ChartTooltip />
              <ChartLegend />
              <Area dataKey="intervencoes" name="Intervenções" {...areaSeries(0, { fill: "url(#grad-intervencoes)", fillOpacity: 1 })} />
              <Line dataKey="efetividade" name="Efetividade %" {...lineSeries(2)} />
            </AreaChart>
          </ChartFrame>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <ChartFrame
              title="Retenção por unidade escolar"
              description="Clique em uma unidade para abrir a visão detalhada da escola."
              height={320}
            >
              <BarChart
                data={porEscola}
                layout="vertical"
                margin={{ left: 12 }}
                onClick={(state: any) => {
                  const id = state?.activePayload?.[0]?.payload?.escolaId;
                  if (id) navigate({ to: "/retencao/escola/$id", params: { id } });
                }}
              >
                <ChartGrid vertical horizontal={false} />
                <ChartXAxis type="number" />
                <ChartYAxis type="category" dataKey="escola" width={170} />
                <ChartTooltip />
                <ChartLegend />
                <Bar dataKey="intervencoes" name="Intervenções" {...barSeries(0)} />
                <Bar dataKey="risco" name="Alunos em risco" {...barSeries(1)} />
              </BarChart>
            </ChartFrame>

            <ChartFrame
              title="Causas registradas"
              description="Distribuição das causas informadas nas intervenções do período."
              height={320}
            >
              <BarChart data={causas}>
                <ChartGrid />
                <ChartXAxis dataKey="causa" />
                <ChartYAxis />
                <ChartTooltip />
                <Bar dataKey="casos" name="Casos" {...barSeries(2)} />
              </BarChart>
            </ChartFrame>
          </div>

          <ChartFrame
            title="Efetividade por canal de contato"
            description="Contatos com retorno positivo versus sem resposta, por canal utilizado."
            height={260}
            footnote="Fonte: intervenções registradas na plataforma Edu-Gov."
          >
            <BarChart data={canais}>
              <ChartGrid />
              <ChartXAxis dataKey="canal" />
              <ChartYAxis />
              <ChartTooltip />
              <ChartLegend />
              <Bar dataKey="sucesso" name="Sucesso" {...barSeries(3)} />
              <Bar dataKey="semResposta" name="Sem retorno" {...barSeries(4)} />
            </BarChart>
          </ChartFrame>
        </>
      )}
    </div>
  );
}
