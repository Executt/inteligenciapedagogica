import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/states";
import { fetchTurmas } from "@/lib/api";

export const Route = createFileRoute("/turmas")({ component: TurmasList });

function TurmasList() {
  const { data, isLoading } = useQuery({ queryKey: ["turmas"], queryFn: () => fetchTurmas() });
  return (
    <AppShell>
      <div className="p-8 max-w-[1400px] mx-auto">
        <PageHeader title="Turmas" subtitle="Selecione uma turma para acessar a análise detalhada." />
        {!isLoading && (data?.length ?? 0) === 0 ? (
          <EmptyState
            title="Nenhuma turma cadastrada"
            description="Crie turmas em Gestão de Entidades para visualizar a análise pedagógica."
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-32" />)
              : data!.map((t) => (
                <Link key={t.id} to="/turma/$id" params={{ id: t.id }} className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Card className="hover:border-primary hover:elevation-2 transition-all cursor-pointer h-full">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{t.nome}</CardTitle>
                        <Badge variant={t.mediaGeral < 6.5 ? "destructive" : t.mediaGeral < 7.5 ? "warning" : "success"} className="font-mono">
                          {t.mediaGeral.toFixed(1)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="text-xs text-muted-foreground space-y-1">
                      <div>{t.ano} · Turno {t.turno}</div>
                      <div>{t.totalAlunos} alunos matriculados</div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
          </div>
        )}

      </div>
    </AppShell>
  );
}
