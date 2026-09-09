import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileAudio, FileText, Image as ImageIcon, FileSpreadsheet, Loader2, Save, Brain } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getSetting, setSetting } from "@/lib/admin/settings.functions";
import {
  MODELOS_POR_TIPO,
  MODELO_PADRAO_POR_TIPO,
  MODELOS_ANALISE,
  MODELO_ANALISE_PADRAO,
  type ConfigModelos,
  type TipoArquivo,
} from "@/lib/cortex/router";

const CHAVE = "cortex.modelos";

const TIPOS: { tipo: TipoArquivo; label: string; descricao: string; icon: typeof FileText }[] = [
  { tipo: "audio", label: "Áudios", descricao: "Reuniões, relatos falados, gravações de aula (mp3, wav, m4a, ogg, webm).", icon: FileAudio },
  { tipo: "pdf", label: "PDFs", descricao: "Laudos, boletins, pareceres e documentos digitalizados.", icon: FileText },
  { tipo: "imagem", label: "Imagens (JPG/PNG)", descricao: "Provas manuscritas, fotos de cadernos e atividades.", icon: ImageIcon },
  { tipo: "planilha", label: "Planilhas / CSV", descricao: "Notas, frequência e exportações da secretaria.", icon: FileSpreadsheet },
  { tipo: "texto", label: "Textos simples", descricao: "Relatos docentes, redações digitadas e anotações.", icon: FileText },
];

export function ModelosPorTipoPanel() {
  const qc = useQueryClient();
  const get = useServerFn(getSetting);
  const save = useServerFn(setSetting);

  const { data, isLoading } = useQuery({
    queryKey: ["setting", CHAVE],
    queryFn: () => get({ data: { chave: CHAVE } }),
  });

  const [cfg, setCfg] = useState<ConfigModelos>({});

  useEffect(() => {
    if (data) setCfg((data as ConfigModelos) ?? {});
  }, [data]);

  const mut = useMutation({
    mutationFn: () =>
      save({
        data: {
          chave: CHAVE,
          valor: {
            porTipo: cfg.porTipo ?? {},
            analise: cfg.analise ?? MODELO_ANALISE_PADRAO,
            sensivelLocal: cfg.sensivelLocal ?? true,
          },
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["setting", CHAVE] });
      toast.success("Direcionamento de modelos salvo. Novos uploads já usam esta configuração.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao salvar"),
  });

  const setTipo = (tipo: TipoArquivo, modelo: string) =>
    setCfg((c) => ({ ...c, porTipo: { ...(c.porTipo ?? {}), [tipo]: modelo } }));

  if (isLoading) return <Skeleton className="h-72" />;

  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Brain className="h-4 w-4" /> Modelo de IA por tipo de arquivo
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Escolha qual modelo processa cada formato enviado ao dossiê do aluno. Áudios são transcritos,
          PDFs e imagens passam por leitura multimodal, planilhas e textos usam o modelo econômico.
        </p>
      </header>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Ingestão de documentos</CardTitle>
          <CardDescription>Aplicado no momento do upload, salvo quando um modelo é escolhido manualmente no envio.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {TIPOS.map(({ tipo, label, descricao, icon: Icon }) => (
            <div key={tipo} className="flex flex-col md:flex-row md:items-center gap-3 border-b pb-4 last:border-0 last:pb-0">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-medium">{label}</div>
                  <div className="text-xs text-muted-foreground">{descricao}</div>
                </div>
              </div>
              <Select
                value={cfg.porTipo?.[tipo] ?? MODELO_PADRAO_POR_TIPO[tipo]}
                onValueChange={(v) => setTipo(tipo, v)}
              >
                <SelectTrigger className="w-full md:w-[300px]" aria-label={`Modelo para ${label}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODELOS_POR_TIPO[tipo].map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Relatório integral (3 eixos)</CardTitle>
          <CardDescription>Modelo de raciocínio usado na análise consolidada com RAG.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <Label className="text-sm flex-1">Modelo da análise final</Label>
            <Select value={cfg.analise ?? MODELO_ANALISE_PADRAO} onValueChange={(v) => setCfg((c) => ({ ...c, analise: v }))}>
              <SelectTrigger className="w-full md:w-[300px]" aria-label="Modelo da análise final">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODELOS_ANALISE.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-md bg-muted/40">
            <Label htmlFor="sens-local" className="text-xs flex-1">
              Conteúdo marcado como sensível (LGPD) sempre vai para o modelo econômico restrito, ignorando a escolha por tipo.
            </Label>
            <Switch
              id="sens-local"
              checked={cfg.sensivelLocal ?? true}
              onCheckedChange={(v) => setCfg((c) => ({ ...c, sensivelLocal: v }))}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => mut.mutate()} disabled={mut.isPending}>
          {mut.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
          Salvar direcionamento
        </Button>
      </div>
    </div>
  );
}
