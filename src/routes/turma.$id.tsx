import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchTurmaAnalytics } from "@/lib/api";
import { disciplinas } from "@/lib/mock-data";
import { AlertTriangle, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/turma/$id")({ component: TurmaView });

function heatColor(v: number) {
  // 0-10 scale: red -> yellow -> green using primary/warning/success
  if (v >= 8) return "bg-success/80 text-success-foreground";
  if (v >= 6.5) return "bg-success/40 text-foreground";
  if (v >= 5) return "bg-warning/50 text-foreground";
  if (v >= 4) return "bg-destructive/40 text-foreground";
  return "bg-destructive/70 text-destructive-foreground";
}

function TurmaView() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery({ queryKey: ["turma", id], queryFn: () => fetchTurmaAnalytics(id) });

  return (
    <AppShell>
      <div className="p-8 max-w-[1600px] mx-auto">
        <PageHeader
          title={data?.turma ? `Turma ${data.turma.nome}` : "Turma"}
          subtitle={data?.turma ? `${data.turma.ano} · ${data.turma.turno} · ${data.turma.totalAlunos} alunos · Média ${data.turma.mediaGeral.toFixed(1)}` : ""}
          actions={<Button asChild variant="outline" size="sm"><Link to="/turmas">← Todas as turmas</Link></Button>}
        />

        {isLoading ? (
          <Skeleton className="h-96" />
        ) : (
          <>
            <Card className="mb-6">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Mapa de Calor · Rendimento por Disciplina</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-xs border-separate border-spacing-1">
                  <thead>
                    <tr>
                      <th className="text-left font-medium text-muted-foreground pb-2 min-w-[180px]">Aluno</th>
                      {disciplinas.map((d) => <th key={d} className="text-center font-medium text-muted-foreground pb-2">{d}</th>)}
                      <th className="text-center font-medium text-muted-foreground pb-2">Média</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data!.heatmap.map((row) => {
                      const notas = disciplinas.map((d) => row[d] as number);
                      const media = notas.reduce((a, b) => a + b, 0) / notas.length;
                      return (
                        <tr key={row.id as string}>
                          <td className="font-medium py-1 pr-3">{row.aluno as string}</td>
                          {disciplinas.map((d) => {
                            const v = Math.max(0, Math.min(10, row[d] as number));
                            return (
                              <td key={d} className={`text-center py-1.5 rounded-md font-mono ${heatColor(v)}`}>
                                {v.toFixed(1)}
                              </td>
                            );
                          })}
                          <td className={`text-center py-1.5 rounded-md font-mono font-semibold ${heatColor(media)}`}>{media.toFixed(1)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="flex items-center gap-2 mt-3 text-[11px] text-muted-foreground">
                  Legenda:
                  <span className="px-2 py-0.5 rounded bg-destructive/70 text-destructive-foreground">&lt;4</span>
                  <span className="px-2 py-0.5 rounded bg-destructive/40">4–5</span>
                  <span className="px-2 py-0.5 rounded bg-warning/50">5–6.5</span>
                  <span className="px-2 py-0.5 rounded bg-success/40">6.5–8</span>
                  <span className="px-2 py-0.5 rounded bg-success/80 text-success-foreground">≥8</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Alunos que necessitam de atenção imediata ({data!.atencaoImediata.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Aluno</TableHead><TableHead>Matrícula</TableHead>
                      <TableHead className="text-right">Média</TableHead>
                      <TableHead className="text-right">Frequência</TableHead>
                      <TableHead>Risco</TableHead><TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data!.atencaoImediata.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.nome}</TableCell>
                        <TableCell className="font-mono text-xs">{a.matricula}</TableCell>
                        <TableCell className="text-right font-mono">{a.mediaGeral}</TableCell>
                        <TableCell className="text-right font-mono">{a.frequencia}%</TableCell>
                        <TableCell>
                          <Badge variant={a.risco === "alto" ? "destructive" : "secondary"}>{a.risco}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild variant="ghost" size="sm">
                            <Link to="/aluno/$id" params={{ id: a.id }}>Dossiê <ChevronRight className="h-3 w-3" /></Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppShell>
  );
}
