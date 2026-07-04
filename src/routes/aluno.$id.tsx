import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchAlunoMetrics } from "@/lib/api";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from "recharts";
import { CalendarClock, GraduationCap, Users, BarChart3, Brain } from "lucide-react";
import {
  UploadZone, DocumentosList, GerarAnalise, AnalisesHistorico, RequireAuth,
} from "@/components/cortex/DossieAluno";


export const Route = createFileRoute("/aluno/$id")({ component: AlunoView });

function AlunoView() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery({ queryKey: ["aluno", id], queryFn: () => fetchAlunoMetrics(id) });

  if (isLoading || !data?.aluno) {
    return <AppShell><div className="p-8"><Skeleton className="h-96" /></div></AppShell>;
  }

  const a = data.aluno;

  return (
    <AppShell>
      <div className="p-8 max-w-[1600px] mx-auto">
        <PageHeader
          title={`Dossiê · ${a.nome}`}
          subtitle={`Matrícula ${a.matricula} · ${a.idade} anos · Responsável: ${a.responsavel}`}
          actions={
            <div className="flex items-center gap-2">
              <Button asChild size="sm">
                <Link to="/cortex" search={{ aluno: a.id }}>Abrir no Edu-Córtex →</Link>
              </Button>
              <Button asChild variant="outline" size="sm"><Link to="/alunos">← Todos</Link></Button>
            </div>
          }
        />


          <TabsList>
            <TabsTrigger value="visao"><BarChart3 className="h-3.5 w-3.5 mr-1.5" /> Visão geral</TabsTrigger>
            <TabsTrigger value="dossie"><Brain className="h-3.5 w-3.5 mr-1.5" /> Dossiê IA · RAG</TabsTrigger>
          </TabsList>

          <TabsContent value="visao" className="space-y-6">
            <div className="grid grid-cols-4 gap-4">
              <Card><CardContent className="p-5">
                <div className="text-xs uppercase text-muted-foreground font-medium">Média Geral</div>
                <div className="text-2xl font-semibold mt-2">{a.mediaGeral}</div>
              </CardContent></Card>
              <Card><CardContent className="p-5">
                <div className="text-xs uppercase text-muted-foreground font-medium">Frequência</div>
                <div className="text-2xl font-semibold mt-2">{a.frequencia}%</div>
              </CardContent></Card>
              <Card><CardContent className="p-5">
                <div className="text-xs uppercase text-muted-foreground font-medium">Nível de Risco</div>
                <div className="mt-2"><Badge variant={a.risco === "alto" ? "destructive" : a.risco === "medio" ? "secondary" : "outline"} className="text-sm">{a.risco}</Badge></div>
              </CardContent></Card>
              <Card><CardContent className="p-5">
                <div className="text-xs uppercase text-muted-foreground font-medium">Intervenções</div>
                <div className="text-2xl font-semibold mt-2">{data.intervencoes.length}</div>
              </CardContent></Card>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Card className="col-span-2">
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><GraduationCap className="h-4 w-4" /> Evolução das Notas por Bimestre</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={data.timeline}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                      <XAxis dataKey="bimestre" stroke="var(--color-muted-foreground)" fontSize={12} />
                      <YAxis domain={[0, 10]} stroke="var(--color-muted-foreground)" fontSize={12} />
                      <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Line type="monotone" dataKey="Português" stroke="var(--color-chart-1)" strokeWidth={2} />
                      <Line type="monotone" dataKey="Matemática" stroke="var(--color-chart-2)" strokeWidth={2} />
                      <Line type="monotone" dataKey="Ciências" stroke="var(--color-chart-3)" strokeWidth={2} />
                      <Line type="monotone" dataKey="História" stroke="var(--color-chart-4)" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4" /> Competências Socioemocionais</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <RadarChart data={data.socioemocional}>
                      <PolarGrid stroke="var(--color-border)" />
                      <PolarAngleAxis dataKey="competencia" tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                      <Radar name="Nível" dataKey="nivel" stroke="var(--color-primary)" fill="var(--color-primary)" fillOpacity={0.35} />
                      <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
                    </RadarChart>
                  </ResponsiveContainer>
                  <p className="text-[11px] text-muted-foreground mt-2">Extraído por NLP de 24 relatos docentes e 3 observações pedagógicas.</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><CalendarClock className="h-4 w-4" /> Histórico de Intervenções Pedagógicas</CardTitle></CardHeader>
              <CardContent>
                <div className="relative pl-6">
                  <div className="absolute left-2 top-2 bottom-2 w-px bg-border" />
                  {data.intervencoes.map((i) => (
                    <div key={i.id} className="relative py-3">
                      <div className="absolute -left-4 top-4 h-3 w-3 rounded-full bg-primary ring-4 ring-background" />
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{i.titulo}</span>
                            <Badge variant="outline" className="text-[10px]">{i.tipo}</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">{i.responsavel}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs text-muted-foreground">{new Date(i.data).toLocaleDateString("pt-BR")}</div>
                          <Badge variant={i.status === "concluído" ? "outline" : i.status === "em andamento" ? "secondary" : "outline"} className="mt-1 text-[10px]">
                            {i.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dossie" className="space-y-4">
            <RequireAuth>
              <UploadZone alunoId={a.id} />
              <DocumentosList alunoId={a.id} />
              <GerarAnalise alunoId={a.id} alunoNome={a.nome} />
              <AnalisesHistorico alunoId={a.id} />
            </RequireAuth>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

