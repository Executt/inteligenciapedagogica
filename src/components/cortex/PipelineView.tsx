import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Cpu, Cloud, ShieldCheck, Sparkles, Database, FileSearch,
  ArrowRight, CheckCircle2, XCircle, Loader2, Radio,
} from "lucide-react";
import { subscribeFeed, type FeedEntry } from "./DossieAluno";

const etapas = [
  { key: "UPLOAD", icon: Cloud, label: "Upload seguro", desc: "Storage privado + RLS por auth.uid()" },
  { key: "ROTEAMENTO", icon: Cpu, label: "Roteador cognitivo", desc: "Escolha do modelo por MIME/tamanho/LGPD" },
  { key: "EXTRACAO", icon: FileSearch, label: "Extração", desc: "OCR multimodal ou parser textual" },
  { key: "EMBEDDINGS", icon: Database, label: "Vetorização", desc: "Chunking 1200/150 + pgvector HNSW" },
  { key: "OK", icon: Sparkles, label: "Pronto para RAG", desc: "Documento disponível para análise integral" },
] as const;

const rotas = [
  {
    nome: "Rota Local (econômica)",
    modelo: "google/gemini-3.1-flash-lite",
    quando: "Texto simples · conteúdo sensível LGPD",
    cor: "bg-emerald-500/10 border-emerald-500/30",
    icon: ShieldCheck,
  },
  {
    nome: "Rota Multimodal",
    modelo: "google/gemini-2.5-flash",
    quando: "Imagens · PDFs escaneados · provas manuscritas",
    cor: "bg-blue-500/10 border-blue-500/30",
    icon: FileSearch,
  },
  {
    nome: "Rota Premium (síntese)",
    modelo: "google/gemini-2.5-pro",
    quando: "Consolidação RAG nos 3 eixos + plano de ação",
    cor: "bg-violet-500/10 border-violet-500/30",
    icon: Sparkles,
  },
];

/** Ofusca nome de arquivo para não expor dados sensíveis nos logs. */
function ofuscar(nome: string): string {
  const ext = nome.includes(".") ? nome.slice(nome.lastIndexOf(".")) : "";
  const base = nome.replace(ext, "");
  if (base.length <= 4) return `***${ext}`;
  return `${base.slice(0, 2)}***${base.slice(-2)}${ext}`;
}

export function PipelineView() {
  const [logs, setLogs] = useState<FeedEntry[]>([]);

  useEffect(() => {
    return subscribeFeed((e) => setLogs((prev) => [e, ...prev].slice(0, 30)));
  }, []);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Cpu className="h-4 w-4" /> Pipeline de ingestão multimodal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-stretch gap-2 overflow-x-auto pb-2">
            {etapas.map((et, i) => {
              const Icon = et.icon;
              return (
                <div key={et.key} className="flex items-stretch gap-2 shrink-0">
                  <div className="flex-1 min-w-[180px] border rounded-md p-3 bg-muted/20">
                    <div className="flex items-center gap-2 text-xs font-medium">
                      <Icon className="h-3.5 w-3.5 text-primary" /> {et.label}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1">{et.desc}</div>
                    <Badge variant="outline" className="text-[9px] mt-2">etapa {i + 1}</Badge>
                  </div>
                  {i < etapas.length - 1 && (
                    <div className="flex items-center"><ArrowRight className="h-4 w-4 text-muted-foreground" /></div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Cpu className="h-4 w-4" /> Roteamento de modelos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {rotas.map((r) => {
              const Icon = r.icon;
              return (
                <div key={r.nome} className={`rounded-md border p-3 ${r.cor}`}>
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <Icon className="h-3.5 w-3.5" /> {r.nome}
                  </div>
                  <div className="text-xs font-mono mt-2">{r.modelo}</div>
                  <div className="text-[11px] text-muted-foreground mt-1">{r.quando}</div>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-muted-foreground mt-3">
            Decisão determinística em <code>src/lib/cortex/router.ts</code> · sem envio a modelos externos quando o toggle LGPD está ativo.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Radio className="h-4 w-4" /> Logs de ingestão em tempo real
            <Badge variant="outline" className="text-[10px] ml-auto">nomes ofuscados · sem PII</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-8">
              Aguardando eventos. Faça um upload na aba Dossiê para ver o pipeline em ação.
            </div>
          ) : (
            <div className="border rounded-md divide-y font-mono text-[11px]">
              {logs.map((l, i) => (
                <div key={i} className="p-2 flex items-center gap-3">
                  <span className="text-muted-foreground shrink-0">
                    {new Date(l.ts).toLocaleTimeString("pt-BR")}
                  </span>
                  <Badge variant={l.etapa === "OK" ? "outline" : l.etapa === "ERRO" ? "destructive" : "secondary"} className="text-[9px] shrink-0">
                    {l.etapa === "OK" ? <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" /> :
                     l.etapa === "ERRO" ? <XCircle className="h-2.5 w-2.5 mr-0.5" /> :
                     <Loader2 className="h-2.5 w-2.5 mr-0.5 animate-spin" />}
                    {l.etapa}
                  </Badge>
                  <span className="truncate flex-1">{ofuscar(l.nome)}</span>
                  {l.modelo && <span className="text-muted-foreground shrink-0">{l.modelo}</span>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
