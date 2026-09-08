import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import {
  ChartFrame, ChartGrid, ChartXAxis, ChartYAxis, ChartTooltip, ChartLegend,
  areaSeries, barSeries, lineSeries,
} from "@/components/ui/chart-frame";
import { AreaChart, Area, Line, BarChart, Bar } from "recharts";
import { TrendingDown, TrendingUp, AlertTriangle, PhoneCall, ShieldCheck } from "lucide-react";
import { retencaoKPIs, evolucaoRetencao, evasaoPorEscola, causasEvasao, canaisContato } from "@/lib/retencao-data";

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
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPI
          label="Taxa de evasão"
          value={`${retencaoKPIs.taxaEvasao.toFixed(1)}%`}
          delta={`${retencaoKPIs.taxaEvasaoDelta.toFixed(1)} p.p. vs. mês anterior`}
          positive
          icon={TrendingDown}
          tone="destructive"
        />
        <KPI
          label="Alunos em risco"
          value={String(retencaoKPIs.alunosRisco)}
          delta={`${retencaoKPIs.alunosRiscoDelta} alunos no mês`}
          positive
          icon={AlertTriangle}
          tone="warning"
        />
        <KPI
          label="Intervenções no mês"
          value={String(retencaoKPIs.intervencoesMes)}
          delta={`+${retencaoKPIs.intervencoesMesDelta} registros`}
          positive
          icon={PhoneCall}
          tone="primary"
        />
        <KPI
          label="Taxa de recuperação"
          value={`${retencaoKPIs.taxaRecuperacao.toFixed(1)}%`}
          delta={`+${retencaoKPIs.taxaRecuperacaoDelta.toFixed(1)} p.p.`}
          positive
          icon={ShieldCheck}
          tone="success"
        />
      </div>

      <ChartFrame
        title="Evolução da evasão e das intervenções"
        description="Taxa de evasão mensal da rede e volume de intervenções registradas."
        height={280}
      >
        <AreaChart data={evolucaoRetencao}>
          <defs>
            <linearGradient id="grad-evasao" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <ChartGrid />
          <ChartXAxis dataKey="mes" />
          <ChartYAxis />
          <ChartTooltip />
          <ChartLegend />
          <Area dataKey="evasao" name="Evasão %" {...areaSeries(0, { fill: "url(#grad-evasao)", fillOpacity: 1 })} />
          <Line dataKey="intervencoes" name="Intervenções" {...lineSeries(2)} />
        </AreaChart>
      </ChartFrame>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ChartFrame
          title="Evasão por unidade escolar"
          description="Percentual de evasão e alunos em risco por escola."
          height={300}
        >
          <BarChart data={evasaoPorEscola} layout="vertical" margin={{ left: 12 }}>
            <ChartGrid vertical horizontal={false} />
            <ChartXAxis type="number" />
            <ChartYAxis type="category" dataKey="escola" width={170} />
            <ChartTooltip />
            <ChartLegend />
            <Bar dataKey="evasao" name="Evasão %" {...barSeries(0)} />
            <Bar dataKey="risco" name="Alunos em risco" {...barSeries(1)} />
          </BarChart>
        </ChartFrame>

        <ChartFrame
          title="Causas registradas de evasão"
          description="Distribuição das causas informadas nas intervenções do período."
          height={300}
        >
          <BarChart data={causasEvasao}>
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
        footnote="Fonte: registros de intervenção do Portal de Retenção Estudantil."
      >
        <BarChart data={canaisContato}>
          <ChartGrid />
          <ChartXAxis dataKey="canal" />
          <ChartYAxis />
          <ChartTooltip />
          <ChartLegend />
          <Bar dataKey="sucesso" name="Sucesso" {...barSeries(3)} />
          <Bar dataKey="semResposta" name="Sem resposta" {...barSeries(4)} />
        </BarChart>
      </ChartFrame>
    </div>
  );
}
