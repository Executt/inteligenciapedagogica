import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Brain, FileText, Activity } from "lucide-react";

import { AppShell, PageHeader } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { fetchAlunos } from "@/lib/api";
import {
  UploadZone, DocumentosList, GerarAnalise, AnalisesHistorico,
} from "@/components/cortex/DossieAluno";
import { PipelineView } from "@/components/cortex/PipelineView";

const SearchSchema = z.object({ aluno: z.string().optional() });

export const Route = createFileRoute("/_authenticated/cortex")({
  validateSearch: (s) => SearchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Edu-Córtex · Console de Orquestração" },
      { name: "description", content: "Orquestrador cognitivo com RAG multimodal, roteamento de modelos e análises pedagógicas nos 3 eixos." },
    ],
  }),
  component: CortexConsole,
});

function CortexConsole() {
  const { aluno: alunoIdSearch } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const { data: alunos } = useQuery({ queryKey: ["alunos-all"], queryFn: () => fetchAlunos() });
  const alunoId = alunoIdSearch ?? alunos?.[0]?.id;
  const alunoAtual = alunos?.find((a) => a.id === alunoId);

  return (
    <AppShell>
      <div className="p-8 max-w-[1600px] mx-auto">
        <PageHeader
          title="Edu-Córtex · Orquestrador Cognitivo"
          subtitle="Ingestão multimodal, RAG vetorial e análise consolidada nos eixos educacional, cognitivo e socioemocional."
          actions={
            <div className="flex items-center gap-2">
              <Select value={alunoId} onValueChange={(v) => navigate({ search: { aluno: v } })}>
                <SelectTrigger className="w-[280px]"><SelectValue placeholder="Selecionar aluno..." /></SelectTrigger>
                <SelectContent>
                  {(alunos ?? []).map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.nome} · {a.matricula}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/auth" }); }}>
                Sair
              </Button>
            </div>
          }
        />
        <Tabs defaultValue="dossie" className="space-y-4">
          <TabsList>
            <TabsTrigger value="dossie"><FileText className="h-3.5 w-3.5 mr-1.5" /> Dossiê multimodal</TabsTrigger>
            <TabsTrigger value="analise"><Brain className="h-3.5 w-3.5 mr-1.5" /> Análise integral</TabsTrigger>
            <TabsTrigger value="pipeline"><Activity className="h-3.5 w-3.5 mr-1.5" /> Pipeline & Roteamento</TabsTrigger>
          </TabsList>

          {alunoId && alunoAtual ? (
            <>
              <TabsContent value="dossie" className="space-y-4">
                <UploadZone alunoId={alunoId} />
                <DocumentosList alunoId={alunoId} />
              </TabsContent>
              <TabsContent value="analise" className="space-y-4">
                <GerarAnalise alunoId={alunoId} alunoNome={alunoAtual.nome} />
                <AnalisesHistorico alunoId={alunoId} />
              </TabsContent>
            </>
          ) : (
            <TabsContent value="dossie">
              <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">Selecione um aluno para começar.</CardContent></Card>
            </TabsContent>
          )}

          <TabsContent value="pipeline">
            <PipelineView />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
