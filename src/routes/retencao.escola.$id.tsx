import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import {
  ChartFrame, ChartGrid, ChartXAxis, ChartYAxis, ChartTooltip, ChartLegend, barSeries,
} from "@/components/ui/chart-frame";
import { chartSeriesColor } from "@/lib/chart-theme";
import { ErrorState, SkeletonCards, SkeletonChart } from "@/components/ui/states";
import { getEscolaRetencao } from "@/lib/retencao/indicadores.functions";
import { RESULTADOS, CATEGORIAS_CAUSA } from "@/lib/retencao/intervencoes.functions";

export const Route = createFileRoute("/retencao/escola/$id")({
  component: EscolaRetencao,
  head: () => ({
    meta: [
      { title: "Retenção da Unidade Escolar · Edu-Gov" },
      { name: "description", content: "Intervenções, causas de evasão e efetividade dos contatos de uma unidade escolar da rede municipal." },
      { property: "og:title", content: "Retenção da Unidade Escolar · Edu-Gov" },
      { property: "og:description", content: "Intervenções, causas de evasão e efetividade dos contatos de uma unidade escolar da rede municipal." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Intervencao = {
  id: string;
  data_intervencao: string;
  tipo_contato: string;
  resultado: string;
  categoria_causa: string;
  responsavel: string;
  proximos_passos: string | null;
  aluno: { id: string; nome: string; codigo: string } | null;
};

function Resumo({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
        <div className="text-2xl font-semibold mt-2 tracking-tight">{value}</div>
      </CardContent>
    </Card>
  );
}

function dataBR(iso: string) {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

function desdeISO(periodo: string) {
  if (periodo === "todos") return null;
  const dias = Number(periodo);
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d.toISOString().slice(0, 10);
}

function EscolaRetencao() {
  const { id } = Route.useParams();
  const carregar = useServerFn(getEscolaRetencao);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["retencao-escola", id],
    queryFn: () => carregar({ data: { escolaId: id } }),
  });

  const [periodo, setPeriodo] = useState("90");
  const [resultado, setResultado] = useState("todos");
  const [causa, setCausa] = useState("todas");

  const intervencoes = useMemo(() => {
    const desde = desdeISO(periodo);
    return ((data?.intervencoes ?? []) as Intervencao[]).filter(
      (i) =>
        (!desde || i.data_intervencao >= desde) &&
        (resultado === "todos" || i.resultado === resultado) &&
        (causa === "todas" || i.categoria_causa === causa),
    );
  }, [data, periodo, resultado, causa]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SkeletonCards count={4} />
        <SkeletonChart />
      </div>
    );
  }

  if (isError || !data?.escola) {
    return (
      <ErrorState
        title="Unidade escolar não encontrada"
        description="Volte para a lista de unidades e tente novamente."
      />
    );
  }

  const escola = data.escola as {
    id: string; nome: string; tipo_unidade: string; bairro: string | null;
    municipio: string; situacao: string; diretor: string | null;
  };

  const colunas: DataTableColumn<Intervencao>[] = [
    { id: "data", header: "Data", cell: (i) => dataBR(i.data_intervencao) },
    {
      id: "aluno",
      header: "Aluno",
      cell: (i) =>
        i.aluno ? (
          <Link to="/aluno/$id" params={{ id: i.aluno.id }} className="text-primary hover:underline">
            {i.aluno.nome}
          </Link>
        ) : (
          "—"
        ),
    },
    { id: "canal", header: "Canal", cell: (i) => i.tipo_contato },
    {
      id: "resultado",
      header: "Resultado",
      cell: (i) => (
        <Badge variant={i.resultado === "Sucesso" ? "outline" : "secondary"}>{i.resultado}</Badge>
      ),
    },
    { id: "causa", header: "Causa", cell: (i) => i.categoria_causa },
    { id: "responsavel", header: "Responsável", cell: (i) => i.responsavel },
    {
      id: "proximos",
      header: "Próximos passos",
      cell: (i) => <span className="text-xs text-muted-foreground">{i.proximos_passos ?? "—"}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-5 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight">{escola.nome}</h2>
            <p className="text-sm text-muted-foreground">
              {escola.tipo_unidade}
              {escola.bairro ? ` · ${escola.bairro}` : ""} · {escola.municipio}
              {escola.diretor ? ` · Direção: ${escola.diretor}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild size="sm">
              <Link to="/retencao/registrar">Registrar intervenção</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/retencao/escolas">← Todas as unidades</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Resumo label="Matrículas" value={String(data.resumo.matriculas)} />
        <Resumo label="Alunos em risco" value={String(data.resumo.alunosRisco)} />
        <Resumo label="Intervenções" value={String(data.resumo.intervencoes)} />
        <Resumo label="Efetividade" value={`${data.resumo.efetividade.toFixed(1)}%`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartFrame
          title="Causas registradas"
          description="Distribuição das causas das intervenções da unidade."
          empty={data.causas.length === 0}
        >
          <PieChart>
            <Pie data={data.causas} dataKey="casos" nameKey="causa" innerRadius={55} outerRadius={95}>
              {data.causas.map((_, i) => (
                <Cell key={i} fill={chartSeriesColor(i)} />
              ))}
            </Pie>
            <ChartTooltip />
            <ChartLegend />
          </PieChart>
        </ChartFrame>

        <ChartFrame
          title="Efetividade por canal de contato"
          description="Contatos com retorno positivo e sem retorno por canal."
          empty={data.canais.length === 0}
        >
          <BarChart data={data.canais}>
            <ChartGrid />
            <ChartXAxis dataKey="canal" />
            <ChartYAxis />
            <ChartTooltip />
            <ChartLegend />
            <Bar dataKey="sucesso" name="Sucesso" {...barSeries(0)} />
            <Bar dataKey="semResposta" name="Sem retorno" {...barSeries(1)} />
          </BarChart>
        </ChartFrame>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={periodo} onValueChange={setPeriodo}>
          <SelectTrigger className="w-[190px]" aria-label="Filtrar por período">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
            <SelectItem value="365">Últimos 12 meses</SelectItem>
            <SelectItem value="todos">Todo o período</SelectItem>
          </SelectContent>
        </Select>
        <Select value={resultado} onValueChange={setResultado}>
          <SelectTrigger className="w-[180px]" aria-label="Filtrar por resultado">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os resultados</SelectItem>
            {RESULTADOS.map((r) => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={causa} onValueChange={setCausa}>
          <SelectTrigger className="w-[180px]" aria-label="Filtrar por causa">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as causas</SelectItem>
            {CATEGORIAS_CAUSA.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        title="Intervenções da unidade"
        columns={colunas}
        rows={intervencoes}
        rowKey={(i) => i.id}
        pageSize={12}
        emptyTitle="Nenhuma intervenção no filtro selecionado"
        emptyDescription="Ajuste o período, o resultado ou a causa para ver os registros."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DataTable
          title="Alunos em risco na unidade"
          columns={[
            {
              id: "aluno",
              header: "Aluno",
              cell: (a: { id: string; nome: string; codigo: string; pendentes: number }) => (
                <Link to="/aluno/$id" params={{ id: a.id }} className="text-primary hover:underline">
                  {a.nome}
                </Link>
              ),
            },
            { id: "codigo", header: "Matrícula", cell: (a) => a.codigo },
            { id: "pendentes", header: "Contatos sem êxito", align: "right", cell: (a) => String(a.pendentes) },
          ]}
          rows={data.alunosRisco}
          rowKey={(a) => a.id}
          pageSize={8}
          emptyTitle="Nenhum aluno em risco"
          emptyDescription="Todas as intervenções da unidade tiveram retorno positivo."
        />

        <DataTable
          title="Efetividade por responsável"
          columns={[
            { id: "responsavel", header: "Responsável", cell: (r: { responsavel: string; total: number; efetividade: number }) => r.responsavel },
            { id: "total", header: "Intervenções", align: "right", cell: (r) => String(r.total) },
            { id: "efetividade", header: "Efetividade", align: "right", cell: (r) => `${r.efetividade.toFixed(1)}%` },
          ]}
          rows={data.responsaveis}
          rowKey={(r) => r.responsavel}
          pageSize={8}
          emptyTitle="Sem responsáveis registrados"
          emptyDescription="Nenhuma intervenção foi registrada nesta unidade."
        />
      </div>
    </div>
  );
}
