import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  ChartFrame, ChartGrid, ChartXAxis, ChartYAxis, ChartTooltip, ChartLegend,
  areaSeries, barSeries, lineSeries,
} from "@/components/ui/chart-frame";
import { fetchEscolaDashboard, fetchSugestoesIA } from "@/lib/api";
import { AreaChart, Area, Line, BarChart, Bar } from "recharts";

import { AlertTriangle, TrendingUp, TrendingDown, Users, GraduationCap, Sparkles, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({ component: Overview });

function KPI({ label, value, delta, icon: Icon, tone = "primary" }: {
  label: string; value: string; delta?: string; icon: any; tone?: "primary" | "success" | "warning" | "destructive";
}) {
  const toneMap = {
    primary: "text-primary bg-primary/10",
    success: "text-success bg-success/10",
    warning: "text-warning bg-warning/10",
    destructive: "text-destructive bg-destructive/10",
  } as const;
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
            <div className="text-2xl font-semibold mt-2 tracking-tight">{value}</div>
            {delta && <div className="text-xs text-muted-foreground mt-1">{delta}</div>}
          </div>
          <div className={`h-9 w-9 rounded-md flex items-center justify-center ${toneMap[tone]}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Overview() {
  const dash = useQuery({ queryKey: ["escola", "e1"], queryFn: () => fetchEscolaDashboard("e1") });
  const sugestoes = useQuery({ queryKey: ["sugestoes"], queryFn: fetchSugestoesIA });

  return (
    <AppShell>
      <div className="p-8 max-w-[1600px] mx-auto">
        <PageHeader
          title="Visão Geral da Rede"
          subtitle="Panorama consolidado das escolas municipais · atualizado há 3 minutos"
          actions={
            <>
              <Badge variant="secondary" className="font-normal">Rede: 4 escolas · 103 turmas</Badge>
              <Button asChild size="sm"><Link to="/intervencao">Ver intervenções sugeridas</Link></Button>
            </>
          }
        />

        <div className="grid grid-cols-4 gap-4 mb-6">
          {dash.isLoading
            ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[108px]" />)
            : (
              <>
                <KPI label="Média Geral" value={dash.data!.kpis.mediaGeral.toFixed(1)} delta="+0,3 vs bimestre anterior" icon={TrendingUp} tone="success" />
                <KPI label="Taxa de Retenção" value={`${dash.data!.kpis.taxaRetencao}%`} delta="Meta municipal: 90%" icon={GraduationCap} tone="primary" />
                <KPI label="Alunos em Risco" value={String(dash.data!.kpis.alunosRisco)} delta="Requer plano de ação" icon={AlertTriangle} tone="destructive" />
                <KPI label="Evasão Mensal" value={`${dash.data!.kpis.evasaoMensal}%`} delta="-0,4pp vs mês anterior" icon={TrendingDown} tone="warning" />
              </>
            )}
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <ChartFrame
            className="col-span-2"
            title="Evolução dos Indicadores (últimos 10 meses)"
            description="Média geral e frequência consolidadas da rede."
            height={280}
            loading={dash.isLoading}
            error={dash.isError}
          >
            <AreaChart data={dash.data?.evolucao ?? []}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <ChartGrid />
              <ChartXAxis dataKey="mes" />
              <ChartYAxis />
              <ChartTooltip />
              <ChartLegend />
              <Area dataKey="media" name="Média Geral" {...areaSeries(0, { fill: "url(#g1)", fillOpacity: 1 })} />
              <Line dataKey="frequencia" name="Frequência %" {...lineSeries(2)} />
            </AreaChart>
          </ChartFrame>


          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Sugestões da IA</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {sugestoes.isLoading
                ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)
                : sugestoes.data!.slice(0, 3).map((s) => (
                  <div key={s.id} className="border border-border rounded-md p-3 hover:bg-accent/50 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-xs font-medium">{s.titulo}</div>
                      <Badge variant={s.severidade === "alta" ? "destructive" : s.severidade === "media" ? "secondary" : "outline"} className="text-[10px] shrink-0">
                        {s.severidade}
                      </Badge>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{s.descricao}</div>
                  </div>
                ))}
              <Button asChild variant="ghost" size="sm" className="w-full justify-between">
                <Link to="/intervencao">Ver todas <ArrowRight className="h-3 w-3" /></Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <ChartFrame
          title="Desempenho Comparativo entre Turmas"
          description="Média, frequência e aprovação por turma no bimestre corrente."
          height={280}
          loading={dash.isLoading}
          error={dash.isError}
          empty={!dash.isLoading && (dash.data?.desempenhoTurmas?.length ?? 0) === 0}
        >
          <BarChart data={dash.data?.desempenhoTurmas ?? []}>
            <ChartGrid />
            <ChartXAxis dataKey="turma" />
            <ChartYAxis />
            <ChartTooltip />
            <ChartLegend />
            <Bar dataKey="media" name="Média" {...barSeries(0)} />
            <Bar dataKey="frequencia" name="Frequência %" {...barSeries(2)} />
            <Bar dataKey="aprovacao" name="Aprovação %" {...barSeries(1)} />
          </BarChart>
        </ChartFrame>


        <div className="mt-4 flex items-center gap-2 flex-wrap">
          <QuickLink to="/entidades" label="Cadastrar entidades" />
          <QuickLink to="/integracao" label="Importar dados governamentais" />
          <QuickLink to="/escola" label="Visão detalhada da escola" />
          <QuickLink to="/turmas" label="Explorar turmas" />
        </div>
      </div>
    </AppShell>
  );
}

function QuickLink({ to, label }: { to: string; label: string }) {
  return (
    <Button asChild variant="outline" size="sm">
      <Link to={to}>{label}</Link>
    </Button>
  );
}
