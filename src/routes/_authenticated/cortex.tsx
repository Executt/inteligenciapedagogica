import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Brain, Upload, FileText, Image as ImageIcon, FileSpreadsheet, Trash2, Sparkles,
  ShieldAlert, Cpu, Loader2, ChevronDown, ChevronRight,
} from "lucide-react";
import { z } from "zod";

import { AppShell, PageHeader } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { fetchAlunos } from "@/lib/api";
import {
  criarUploadUrl, listarDocumentos, ingestDocumento, deletarDocumento,
  gerarAnaliseCortex, listarAnalises,
} from "@/lib/cortex/cortex.functions";

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
        {alunoId && alunoAtual ? (
          <CortexPanel alunoId={alunoId} alunoNome={alunoAtual.nome} />
        ) : (
          <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">Selecione um aluno para começar.</CardContent></Card>
        )}
      </div>
    </AppShell>
  );
}

function CortexPanel({ alunoId, alunoNome }: { alunoId: string; alunoNome: string }) {
  return (
    <Tabs defaultValue="dossie" className="space-y-4">
      <TabsList>
        <TabsTrigger value="dossie"><FileText className="h-3.5 w-3.5 mr-1.5" /> Dossiê multimodal</TabsTrigger>
        <TabsTrigger value="analise"><Brain className="h-3.5 w-3.5 mr-1.5" /> Análise integral</TabsTrigger>
      </TabsList>
      <TabsContent value="dossie" className="space-y-4">
        <UploadZone alunoId={alunoId} />
        <DocumentosList alunoId={alunoId} />
      </TabsContent>
      <TabsContent value="analise" className="space-y-4">
        <GerarAnalise alunoId={alunoId} alunoNome={alunoNome} />
        <AnalisesHistorico alunoId={alunoId} />
      </TabsContent>
    </Tabs>
  );
}

function UploadZone({ alunoId }: { alunoId: string }) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [sensivel, setSensivel] = useState(false);
  const [feed, setFeed] = useState<{ nome: string; rota: string; modelo: string; motivo: string; status: string }[]>([]);
  const criarUp = useServerFn(criarUploadUrl);
  const ingest = useServerFn(ingestDocumento);

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const { path, token } = await criarUp({ data: { alunoId, nome: file.name } });
      const { error } = await supabase.storage.from("dossies").uploadToSignedUrl(path, token, file);
      if (error) throw new Error(error.message);
      const entry = { nome: file.name, rota: "…", modelo: "…", motivo: "roteando", status: "PROCESSANDO" };
      setFeed((f) => [entry, ...f]);
      const res = await ingest({
        data: { alunoId, storagePath: path, nome: file.name, mime: file.type || "application/octet-stream", tamanho: file.size, sensivel },
      });
      setFeed((f) => f.map((x) => (x.nome === file.name && x.status === "PROCESSANDO" ? { ...x, status: "OK" } : x)));
      return res;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cortex-docs", alunoId] });
      toast.success("Documento ingerido");
    },
    onError: (e) => {
      setFeed((f) => f.map((x) => (x.status === "PROCESSANDO" ? { ...x, status: "ERRO" } : x)));
      toast.error(e instanceof Error ? e.message : "Falha na ingestão");
    },
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Upload className="h-4 w-4" /> Ingestão multimodal (imagens · PDFs · textos · planilhas)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            Array.from(e.dataTransfer.files).forEach((f) => upload.mutate(f));
          }}
        >
          <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
          <div className="text-sm font-medium">Arraste arquivos ou clique para selecionar</div>
          <div className="text-xs text-muted-foreground mt-1">Provas manuscritas, laudos, relatos, planilhas do gov, redações — o roteador decide o pipeline.</div>
          <input
            ref={inputRef} type="file" className="hidden" multiple
            accept="image/*,application/pdf,text/*,.csv,.xlsx"
            onChange={(e) => { Array.from(e.target.files ?? []).forEach((f) => upload.mutate(f)); e.target.value = ""; }}
          />
        </div>

        <div className="flex items-center gap-3 mt-4 p-3 rounded-md bg-muted/40">
          <ShieldAlert className="h-4 w-4 text-amber-600" />
          <Label htmlFor="sensivel-sw" className="text-xs flex-1">Conteúdo sensível (LGPD) — força rota econômica restrita</Label>
          <Switch id="sensivel-sw" checked={sensivel} onCheckedChange={setSensivel} />
        </div>

        {feed.length > 0 && (
          <div className="mt-4 border rounded-md divide-y">
            <div className="p-3 text-xs font-medium bg-muted/30 flex items-center gap-2">
              <Cpu className="h-3.5 w-3.5" /> Feed do roteador
            </div>
            {feed.map((f, i) => (
              <div key={i} className="p-3 text-xs flex items-center justify-between gap-4">
                <div className="truncate flex-1">
                  <div className="font-medium truncate">{f.nome}</div>
                  <div className="text-muted-foreground">{f.motivo}</div>
                </div>
                <Badge variant={f.status === "OK" ? "outline" : f.status === "ERRO" ? "destructive" : "secondary"}>
                  {f.status === "PROCESSANDO" && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                  {f.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const iconTipo = { imagem: ImageIcon, pdf: FileText, texto: FileText, planilha: FileSpreadsheet } as const;

function DocumentosList({ alunoId }: { alunoId: string }) {
  const qc = useQueryClient();
  const listar = useServerFn(listarDocumentos);
  const del = useServerFn(deletarDocumento);
  const { data, isLoading } = useQuery({
    queryKey: ["cortex-docs", alunoId],
    queryFn: () => listar({ data: { alunoId } }),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["cortex-docs", alunoId] }); toast.success("Documento removido"); },
  });

  if (isLoading) return <Skeleton className="h-32" />;
  if (!data?.length) return (
    <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
      Nenhum documento no dossiê deste aluno ainda.
    </CardContent></Card>
  );

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Documentos do dossiê ({data.length})</CardTitle></CardHeader>
      <CardContent className="divide-y">
        {data.map((d) => {
          const Icon = iconTipo[d.tipo as keyof typeof iconTipo] ?? FileText;
          return (
            <div key={d.id} className="py-3 flex items-start gap-3">
              <Icon className="h-4 w-4 mt-1 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium truncate">{d.nome}</span>
                  <Badge variant="outline" className="text-[10px]">{d.tipo}</Badge>
                  <Badge variant={d.status_ingestao === "PROCESSADO" ? "outline" : d.status_ingestao === "ERRO" ? "destructive" : "secondary"} className="text-[10px]">
                    {d.status_ingestao}
                  </Badge>
                  {d.rota_roteador && <Badge variant="secondary" className="text-[10px]"><Cpu className="h-2.5 w-2.5 mr-0.5" />{d.rota_roteador} · {d.modelo_usado}</Badge>}
                  {d.sensivel && <Badge variant="secondary" className="text-[10px]"><ShieldAlert className="h-2.5 w-2.5 mr-0.5" />LGPD</Badge>}
                </div>
                {d.resumo && <p className="text-xs text-muted-foreground mt-1">{d.resumo}</p>}
                {d.erro && <p className="text-xs text-destructive mt-1">{d.erro}</p>}
                {Array.isArray(d.competencias) && d.competencias.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(d.competencias as string[]).map((c) => <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>)}
                  </div>
                )}
              </div>
              <Button variant="ghost" size="icon" onClick={() => delMut.mutate(d.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function GerarAnalise({ alunoId, alunoNome }: { alunoId: string; alunoNome: string }) {
  const qc = useQueryClient();
  const [publico, setPublico] = useState<"direcao" | "professores" | "pais">("professores");
  const gerar = useServerFn(gerarAnaliseCortex);
  const mut = useMutation({
    mutationFn: () => gerar({ data: { alunoId, publico } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["cortex-analises", alunoId] }); toast.success("Análise gerada"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao gerar análise"),
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Sparkles className="h-4 w-4" /> Gerar análise integral para {alunoNome}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <Select value={publico} onValueChange={(v) => setPublico(v as typeof publico)}>
            <SelectTrigger className="w-[240px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="direcao">Direção (estratégico)</SelectItem>
              <SelectItem value="professores">Professores (operacional)</SelectItem>
              <SelectItem value="pais">Pais (acolhedor)</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending}>
            {mut.isPending ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Orquestrando…</> : <><Brain className="h-3.5 w-3.5 mr-1.5" /> Gerar análise</>}
          </Button>
          <span className="text-xs text-muted-foreground">RAG top-8 · gemini-2.5-pro · zero-alucinação</span>
        </div>
        {mut.data?.lacunas && mut.data.lacunas.length > 0 && (
          <div className="mt-4 p-3 rounded-md border border-amber-500/40 bg-amber-500/5">
            <div className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">Lacunas de dados declaradas pelo modelo:</div>
            <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-0.5">
              {mut.data.lacunas.map((l, i) => <li key={i}>{l}</li>)}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AnalisesHistorico({ alunoId }: { alunoId: string }) {
  const listar = useServerFn(listarAnalises);
  const { data, isLoading } = useQuery({
    queryKey: ["cortex-analises", alunoId],
    queryFn: () => listar({ data: { alunoId } }),
  });
  if (isLoading) return <Skeleton className="h-64" />;
  if (!data?.length) return <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Nenhuma análise gerada ainda.</CardContent></Card>;
  return (
    <div className="space-y-4">
      {data.map((a) => <AnaliseCard key={a.id} analise={a} />)}
    </div>
  );
}

type Eixo = { diagnostico?: string; evidencias?: string[]; competencias_bncc?: string[]; estilos_aprendizagem?: string[]; padroes_raciocinio?: string[]; indicadores?: string[]; sinais_alerta?: string[] };
type Plano = { publico_alvo: "pais" | "professores" | "direcao"; acao: string; prazo: string; responsavel_sugerido: string };

function AnaliseCard({ analise }: { analise: Record<string, unknown> }) {
  const [openFontes, setOpenFontes] = useState(false);
  const edu = analise.eixo_educacional as Eixo;
  const cog = analise.eixo_cognitivo as Eixo;
  const soc = analise.eixo_socioemocional as Eixo;
  const plano = (analise.plano_acao as Plano[]) ?? [];
  const fontes = (analise.fontes as { trecho: string; similarity: number }[]) ?? [];
  const data = useMemo(() => new Date(analise.criado_em as string).toLocaleString("pt-BR"), [analise.criado_em]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Brain className="h-4 w-4" /> Análise Edu-Córtex
            <Badge variant="outline" className="text-[10px]">público: {String(analise.publico_alvo)}</Badge>
            <Badge variant="secondary" className="text-[10px]"><Cpu className="h-2.5 w-2.5 mr-0.5" />{String(analise.modelo_usado)}</Badge>
          </CardTitle>
          <span className="text-xs text-muted-foreground">{data}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <EixoCard titulo="Educacional" cor="bg-blue-500/10 border-blue-500/30" eixo={edu} extras={[["Competências BNCC", edu?.competencias_bncc]]} />
          <EixoCard titulo="Cognitivo" cor="bg-violet-500/10 border-violet-500/30" eixo={cog} extras={[["Estilos", cog?.estilos_aprendizagem], ["Padrões", cog?.padroes_raciocinio]]} />
          <EixoCard titulo="Socioemocional" cor="bg-emerald-500/10 border-emerald-500/30" eixo={soc} extras={[["Indicadores", soc?.indicadores], ["Sinais de alerta", soc?.sinais_alerta]]} />
        </div>

        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">Plano de intervenção pedagógica</div>
          <div className="border rounded-md divide-y">
            {plano.map((p, i) => (
              <div key={i} className="p-3 flex items-start gap-3">
                <Badge variant={p.publico_alvo === "direcao" ? "default" : p.publico_alvo === "professores" ? "secondary" : "outline"} className="shrink-0 mt-0.5">
                  {p.publico_alvo}
                </Badge>
                <div className="flex-1 min-w-0">
                  <div className="text-sm">{p.acao}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{p.prazo} · {p.responsavel_sugerido}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {fontes.length > 0 && (
          <div>
            <button onClick={() => setOpenFontes(!openFontes)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              {openFontes ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              Citações RAG ({fontes.length})
            </button>
            {openFontes && (
              <div className="mt-2 space-y-1.5">
                {fontes.map((f, i) => (
                  <div key={i} className="text-xs p-2 rounded bg-muted/40 border">
                    <span className="text-muted-foreground">[sim {f.similarity.toFixed(2)}]</span> {f.trecho}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EixoCard({ titulo, cor, eixo, extras }: { titulo: string; cor: string; eixo: Eixo; extras: [string, string[] | undefined][] }) {
  return (
    <div className={`rounded-md border p-3 ${cor}`}>
      <div className="text-xs uppercase tracking-wider font-semibold mb-2">{titulo}</div>
      <p className="text-sm">{eixo?.diagnostico ?? "—"}</p>
      {extras.map(([label, arr]) =>
        arr && arr.length > 0 ? (
          <div key={label} className="mt-2">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
            <div className="flex flex-wrap gap-1 mt-0.5">
              {arr.map((v, i) => <Badge key={i} variant="outline" className="text-[10px]">{v}</Badge>)}
            </div>
          </div>
        ) : null,
      )}
      {eixo?.evidencias && eixo.evidencias.length > 0 && (
        <ul className="mt-2 text-xs text-muted-foreground list-disc pl-4 space-y-0.5">
          {eixo.evidencias.slice(0, 3).map((e, i) => <li key={i}>{e}</li>)}
        </ul>
      )}
    </div>
  );
}
