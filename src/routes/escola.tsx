import { createFileRoute, Link } from "@tanstack/react-router";
import { gridProps, axisProps, tooltipProps, legendProps, polarGridProps, polarTickProps } from "@/lib/chart-theme";
import { useQuery } from "@tanstack/react-query";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { fetchEscolaDashboard, fetchEscolas, fetchTurmas } from "@/lib/api";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, LineChart, Line,
  RadialBarChart, RadialBar, PolarAngleAxis,
} from "recharts";
import { AlertTriangle, GraduationCap, TrendingDown, TrendingUp, Users } from "lucide-react";

export const Route = createFileRoute("/escola")({ component: EscolaView });

function EscolaView() {
  const escolas = useQuery({ queryKey: ["escolas"], queryFn: fetchEscolas });
  const dash = useQuery({ queryKey: ["escola", "e1"], queryFn: () => fetchEscolaDashboard("e1") });
  const turmas = useQuery({ queryKey: ["turmas", "e1"], queryFn: () => fetchTurmas("e1") });

  const escola = escolas.data?.[0];

  return (
    <AppShell>
      <div className="p-8 max-w-[1600px] mx-auto">
        <PageHeader
          title="Visão da Escola"
          subtitle={escola ? `${escola.nome} · INEP ${escola.codigoInep} · ${escola.municipio}` : "Carregando..."}
          actions={
            <select className="h-9 rounded-md border border-input bg-background px-3 text-sm">
              {escolas.data?.map((e) => <option key={e.id}>{e.nome}</option>)}
            </select>
          }
        />

        <div className="grid grid-cols-4 gap-4 mb-6">
          {dash.isLoading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />) : (
            <>
              <Kpi label="Média Geral" value={dash.data!.kpis.mediaGeral.toFixed(1)} sub="Escala 0–10" icon={TrendingUp} tone="success" />
              <Kpi label="Taxa de Retenção" value={`${dash.data!.kpis.taxaRetencao}%`} sub="Meta 90%" icon={GraduationCap} tone="primary" />
              <Kpi label="Alunos em Risco de Evasão" value={String(dash.data!.kpis.alunosRisco)} sub={`${dash.data!.kpis.totalAlunos} alunos totais`} icon={AlertTriangle} tone="destructive" />
              <Kpi label="Frequência Média" value={`${dash.data!.kpis.frequenciaMedia}%`} sub={`Evasão ${dash.data!.kpis.evasaoMensal}%`} icon={TrendingDown} tone="warning" />
            </>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="col-span-2">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Comparativo entre Turmas</CardTitle></CardHeader>
            <CardContent>
              {dash.isLoading ? <Skeleton className="h-[320px]" /> : (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={dash.data!.desempenhoTurmas}>
                    <CartesianGrid {...gridProps} />
                    <XAxis dataKey="turma" {...axisProps} />
                    <YAxis {...axisProps} />
                    <Tooltip {...tooltipProps} />
                    <Legend {...legendProps} />
                    <Bar dataKey="media" fill="var(--color-primary)" name="Média" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="frequencia" fill="var(--color-chart-3)" name="Frequência %" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="aprovacao" fill="var(--color-chart-2)" name="Aprovação %" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Indicadores Institucionais</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <RadialBarChart innerRadius="30%" outerRadius="100%" data={[
                  { name: "Aprovação", value: 87, fill: "var(--color-chart-3)" },
                  { name: "Frequência", value: 89, fill: "var(--color-primary)" },
                  { name: "Retenção", value: 92, fill: "var(--color-chart-2)" },
                  { name: "IDEB proj.", value: 74, fill: "var(--color-chart-4)" },
                ]}>
                  <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                  <RadialBar background dataKey="value" cornerRadius={6} />
                  <Legend {...legendProps} />
                  <Tooltip {...tooltipProps} />
                </RadialBarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Card className="col-span-2">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Evolução Mensal</CardTitle></CardHeader>
            <CardContent>
              {dash.isLoading ? <Skeleton className="h-64" /> : (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={dash.data!.evolucao}>
                    <CartesianGrid {...gridProps} />
                    <XAxis dataKey="mes" {...axisProps} />
                    <YAxis {...axisProps} />
                    <Tooltip {...tooltipProps} />
                    <Legend {...legendProps} />
                    <Line type="monotone" dataKey="media" stroke="var(--color-primary)" name="Média" strokeWidth={2} />
                    <Line type="monotone" dataKey="frequencia" stroke="var(--color-chart-3)" name="Frequência" strokeWidth={2} />
                    <Line type="monotone" dataKey="evasao" stroke="var(--color-destructive)" name="Evasão %" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4" /> Turmas da Escola</CardTitle></CardHeader>
            <CardContent className="divide-y divide-border">
              {turmas.data?.map((t) => (
                <Link key={t.id} to="/turma/$id" params={{ id: t.id }} className="flex items-center justify-between py-2.5 hover:bg-accent/50 -mx-2 px-2 rounded transition-colors">
                  <div>
                    <div className="text-sm font-medium">{t.nome}</div>
                    <div className="text-xs text-muted-foreground">{t.turno} · {t.totalAlunos} alunos</div>
                  </div>
                  <Badge variant={t.mediaGeral < 6.5 ? "destructive" : t.mediaGeral < 7.5 ? "secondary" : "outline"} className="font-mono">
                    {t.mediaGeral.toFixed(1)}
                  </Badge>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

function Kpi({ label, value, sub, icon: Icon, tone }: { label: string; value: string; sub: string; icon: any; tone: "primary" | "success" | "warning" | "destructive" }) {
  const toneMap = {
    primary: "text-primary bg-primary/10",
    success: "text-success bg-success/10",
    warning: "text-warning bg-warning/10",
    destructive: "text-destructive bg-destructive/10",
  } as const;
  return (
    <Card><CardContent className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
          <div className="text-2xl font-semibold mt-2 tracking-tight">{value}</div>
          <div className="text-xs text-muted-foreground mt-1">{sub}</div>
        </div>
        <div className={`h-9 w-9 rounded-md flex items-center justify-center ${toneMap[tone]}`}><Icon className="h-4 w-4" /></div>
      </div>
    </CardContent></Card>
  );
}
