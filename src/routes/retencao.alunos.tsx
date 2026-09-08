import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, PhoneCall } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { alunosRisco, type AlunoRisco } from "@/lib/retencao-data";

export const Route = createFileRoute("/retencao/alunos")({
  component: AlunosRisco,
  head: () => ({
    meta: [
      { title: "Alunos em Risco · Retenção Estudantil · Edu-Gov" },
      { name: "description", content: "Lista priorizada de alunos em risco de evasão com frequência, causa provável e status das intervenções." },
      { property: "og:title", content: "Alunos em Risco · Retenção Estudantil · Edu-Gov" },
      { property: "og:description", content: "Lista priorizada de alunos em risco de evasão com frequência, causa provável e status das intervenções." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const riscoLabel: Record<AlunoRisco["risco"], string> = { alto: "Alto", medio: "Médio", baixo: "Baixo" };
const riscoOrder: Record<AlunoRisco["risco"], number> = { alto: 0, medio: 1, baixo: 2 };

function formatData(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function AlunosRisco() {
  const [busca, setBusca] = useState("");
  const [risco, setRisco] = useState("todos");
  const [status, setStatus] = useState("todos");

  const rows = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return alunosRisco
      .filter((a) =>
        (!termo || a.nome.toLowerCase().includes(termo) || a.matricula.includes(termo) || a.turma.toLowerCase().includes(termo)) &&
        (risco === "todos" || a.risco === risco) &&
        (status === "todos" || a.statusIntervencao === status),
      )
      .sort((a, b) => riscoOrder[a.risco] - riscoOrder[b.risco] || a.frequencia - b.frequencia);
  }, [busca, risco, status]);

  const columns: DataTableColumn<AlunoRisco>[] = [
    {
      id: "aluno",
      header: "Aluno",
      cell: (a) => (
        <div className="min-w-0">
          <div className="font-medium truncate">{a.nome}</div>
          <div className="text-xs text-muted-foreground">Matrícula {a.matricula} · {a.turma}</div>
        </div>
      ),
    },
    { id: "escola", header: "Unidade escolar", cell: (a) => <span className="text-sm">{a.escola}</span> },
    {
      id: "risco",
      header: "Risco",
      cell: (a) => (
        <Badge variant={a.risco === "alto" ? "destructive" : a.risco === "medio" ? "secondary" : "outline"}>
          {riscoLabel[a.risco]}
        </Badge>
      ),
    },
    { id: "frequencia", header: "Frequência", align: "right", cell: (a) => `${a.frequencia}%` },
    { id: "media", header: "Média", align: "right", cell: (a) => a.mediaGeral.toFixed(1) },
    { id: "faltas", header: "Faltas seguidas", align: "right", cell: (a) => String(a.faltasConsecutivas) },
    { id: "causa", header: "Causa provável", cell: (a) => a.causaProvavel },
    { id: "contato", header: "Último contato", cell: (a) => formatData(a.ultimoContato) },
    {
      id: "status",
      header: "Intervenção",
      cell: (a) => (
        <Badge variant={a.statusIntervencao === "Pendente" ? "destructive" : a.statusIntervencao === "Em andamento" ? "secondary" : "outline"}>
          {a.statusIntervencao}
        </Badge>
      ),
    },
    {
      id: "acao",
      header: "Ação",
      align: "right",
      cell: () => (
        <Button asChild variant="ghost" size="sm">
          <Link to="/retencao/registrar">
            <PhoneCall className="h-3.5 w-3.5" aria-hidden="true" />
            Registrar
          </Link>
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:max-w-xs w-full">
          <label htmlFor="busca-risco" className="sr-only">Buscar aluno, matrícula ou turma</label>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <Input
            id="busca-risco"
            className="pl-9"
            placeholder="Buscar por nome, matrícula ou turma"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <Select value={risco} onValueChange={setRisco}>
          <SelectTrigger className="sm:w-44" aria-label="Filtrar por nível de risco">
            <SelectValue placeholder="Nível de risco" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os riscos</SelectItem>
            <SelectItem value="alto">Risco alto</SelectItem>
            <SelectItem value="medio">Risco médio</SelectItem>
            <SelectItem value="baixo">Risco baixo</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="sm:w-48" aria-label="Filtrar por status da intervenção">
            <SelectValue placeholder="Status da intervenção" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="Pendente">Pendente</SelectItem>
            <SelectItem value="Em andamento">Em andamento</SelectItem>
            <SelectItem value="Resolvido">Resolvido</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto">
        <DataTable
          title={`Alunos em risco (${rows.length})`}
          columns={columns}
          rows={rows}
          rowKey={(a) => a.id}
          pageSize={8}
          caption="Alunos com sinais de evasão, ordenados por prioridade de atendimento."
          emptyTitle="Nenhum aluno encontrado"
          emptyDescription="Ajuste a busca ou os filtros de risco e status para visualizar registros."
        />
      </div>
    </div>
  );
}
