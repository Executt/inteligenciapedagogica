import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchAlunos } from "@/lib/api";
import { ChevronRight } from "lucide-react";

export const Route = createFileRoute("/alunos")({ component: AlunosList });

function AlunosList() {
  const { data, isLoading } = useQuery({ queryKey: ["alunos"], queryFn: () => fetchAlunos() });
  return (
    <AppShell>
      <div className="p-8 max-w-[1400px] mx-auto">
        <PageHeader title="Dossiê do Aluno" subtitle="Selecione um aluno para abrir o perfil pedagógico completo." />
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Alunos ({data?.length ?? 0})</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-96" /> : (
              <div className="divide-y divide-border">
                {data!.map((a) => (
                  <Link key={a.id} to="/aluno/$id" params={{ id: a.id }} className="flex items-center gap-4 py-3 hover:bg-accent/50 -mx-2 px-2 rounded transition-colors">
                    <div className="h-9 w-9 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center">
                      {a.nome.split(" ").map(n => n[0]).slice(0, 2).join("")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{a.nome}</div>
                      <div className="text-xs text-muted-foreground">Mat. {a.matricula} · {a.responsavel}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">Média <span className="font-mono font-semibold text-foreground">{a.mediaGeral}</span></div>
                    <div className="text-xs text-muted-foreground">Freq. <span className="font-mono font-semibold text-foreground">{a.frequencia}%</span></div>
                    <Badge variant={a.risco === "alto" ? "destructive" : a.risco === "medio" ? "secondary" : "outline"}>{a.risco}</Badge>
                    <Button variant="ghost" size="sm"><ChevronRight className="h-4 w-4" /></Button>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
