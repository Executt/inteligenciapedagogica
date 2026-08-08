import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell, PageHeader } from "@/components/AppShell";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchAlunos } from "@/lib/api";
import { ChevronRight } from "lucide-react";

export const Route = createFileRoute("/alunos")({ component: AlunosList });

type Aluno = Awaited<ReturnType<typeof fetchAlunos>>[number];

function AlunosList() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useQuery({ queryKey: ["alunos"], queryFn: () => fetchAlunos() });

  const columns: DataTableColumn<Aluno>[] = [
    {
      id: "aluno",
      header: "Aluno",
      cell: (a) => (
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
          >
            {a.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">{a.nome}</span>
            <span className="block text-xs text-muted-foreground">
              Mat. {a.matricula} · {a.responsavel}
            </span>
          </span>
        </div>
      ),
    },
    { id: "media", header: "Média", align: "right", className: "font-mono", cell: (a) => a.mediaGeral },
    { id: "freq", header: "Frequência", align: "right", className: "font-mono", cell: (a) => `${a.frequencia}%` },
    {
      id: "risco",
      header: "Risco",
      cell: (a) => (
        <Badge variant={a.risco === "alto" ? "destructive" : a.risco === "medio" ? "warning" : "success"}>
          Risco {a.risco}
        </Badge>
      ),
    },
    {
      id: "acao",
      header: <span className="sr-only">Ações</span>,
      align: "right",
      cell: (a) => (
        <Button asChild variant="ghost" size="sm">
          <Link to="/aluno/$id" params={{ id: a.id }}>
            Dossiê <ChevronRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        </Button>
      ),
    },
  ];

  return (
    <AppShell>
      <div className="p-8 max-w-[1400px] mx-auto">
        <PageHeader title="Dossiê do Aluno" subtitle="Selecione um aluno para abrir o perfil pedagógico completo." />
        <DataTable
          title={`Alunos (${data?.length ?? 0})`}
          columns={columns}
          rows={data}
          rowKey={(a) => a.id}
          loading={isLoading}
          error={isError}
          pageSize={12}
          caption="Lista de alunos com média geral, frequência e nível de risco"
          emptyTitle="Nenhum aluno encontrado"
          emptyDescription="Cadastre alunos ou importe dados governamentais para começar."
          onRowClick={(a) => navigate({ to: "/aluno/$id", params: { id: a.id } })}
        />
      </div>
    </AppShell>
  );
}
