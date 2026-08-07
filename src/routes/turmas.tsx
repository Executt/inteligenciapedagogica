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
        <div className="grid grid-cols-4 gap-4">
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-32" />)
            : data!.map((t) => (
              <Link key={t.id} to="/turma/$id" params={{ id: t.id }}>
                <Card className="hover:border-primary transition-colors cursor-pointer h-full">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{t.nome}</CardTitle>
                      <Badge variant={t.mediaGeral < 6.5 ? "destructive" : t.mediaGeral < 7.5 ? "secondary" : "outline"} className="font-mono">
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
      </div>
    </AppShell>
  );
}
