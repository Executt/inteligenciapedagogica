import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { listEscolasRetencao } from "@/lib/retencao/indicadores.functions";

export const Route = createFileRoute("/retencao/escolas")({
  component: EscolasRetencao,
  head: () => ({
    meta: [
      { title: "Retenção por Escola · Edu-Gov" },
      { name: "description", content: "Retenção estudantil por unidade escolar: intervenções, alunos em risco e efetividade dos contatos." },
      { property: "og:title", content: "Retenção por Escola · Edu-Gov" },
      { property: "og:description", content: "Retenção estudantil por unidade escolar: intervenções, alunos em risco e efetividade dos contatos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Row = {
  id: string;
  nome: string;
  tipo: string;
  bairro: string | null;
  situacao: string;
  intervencoes: number;
  alunosRisco: number;
  efetividade: number;
};

function EscolasRetencao() {
  const navigate = useNavigate();
  const carregar = useServerFn(listEscolasRetencao);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["retencao-escolas"],
    queryFn: () => carregar(),
  });
  const [busca, setBusca] = useState("");

  const rows = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return ((data ?? []) as Row[])
      .filter((e) => !termo || e.nome.toLowerCase().includes(termo) || (e.bairro ?? "").toLowerCase().includes(termo))
      .sort((a, b) => b.alunosRisco - a.alunosRisco || a.nome.localeCompare(b.nome));
  }, [data, busca]);

  const columns: DataTableColumn<Row>[] = [
    {
      id: "escola",
      header: "Unidade escolar",
      cell: (e) => (
        <div className="min-w-0">
          <div className="font-medium truncate">{e.nome}</div>
          <div className="text-xs text-muted-foreground">{e.tipo}{e.bairro ? ` · ${e.bairro}` : ""}</div>
        </div>
      ),
    },
    { id: "intervencoes", header: "Intervenções", align: "right", cell: (e) => String(e.intervencoes) },
    { id: "risco", header: "Alunos em risco", align: "right", cell: (e) => String(e.alunosRisco) },
    { id: "efetividade", header: "Efetividade", align: "right", cell: (e) => `${e.efetividade.toFixed(1)}%` },
    {
      id: "situacao",
      header: "Situação",
      cell: (e) => <Badge variant={e.situacao === "ativa" ? "outline" : "secondary"}>{e.situacao}</Badge>,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="relative sm:max-w-sm w-full">
        <label htmlFor="busca-escola-retencao" className="sr-only">Buscar unidade escolar</label>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <Input
          id="busca-escola-retencao"
          className="pl-9"
          placeholder="Buscar por nome ou bairro"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      <DataTable
        title="Retenção por unidade escolar"
        columns={columns}
        rows={rows}
        rowKey={(e) => e.id}
        loading={isLoading}
        error={isError}
        onRowClick={(e) => navigate({ to: "/retencao/escola/$id", params: { id: e.id } })}
        emptyTitle="Nenhuma unidade encontrada"
        emptyDescription="Ajuste a busca para localizar a unidade escolar."
        pageSize={15}
        caption="Clique em uma unidade para abrir a visão detalhada de retenção."
      />
    </div>
  );
}
