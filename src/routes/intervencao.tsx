import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { fetchSugestoesIA, generateReport } from "@/lib/api";
import { AlertTriangle, Sparkles, FileDown, Loader2 } from "lucide-react";

export const Route = createFileRoute("/intervencao")({ component: Intervencao });

function Intervencao() {
  const sugestoes = useQuery({ queryKey: ["sugestoes"], queryFn: fetchSugestoesIA });
  const [publico, setPublico] = useState<"direcao" | "professores" | "pais">("direcao");
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const mut = useMutation({
    mutationFn: generateReport,
    onSuccess: (r) => {
      setPreview(r.corpo);
      toast.success(`Relatório gerado · público ${r.publico}`);
    },
  });

  return (
    <AppShell>
      <div className="p-8 max-w-[1400px] mx-auto">
        <PageHeader
          title="Painel de Intervenção Pedagógica"
          subtitle="O motor de IA cruza notas, frequências e relatos para sugerir ações concretas."
          actions={
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button><FileDown className="h-4 w-4" /> Exportar Relatório</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Exportar Relatório de Intervenção</DialogTitle>
                  <DialogDescription>Escolha o público-alvo. O tom e o nível de detalhe são ajustados automaticamente.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div>
                    <Label className="text-xs mb-2 block">Público-alvo</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["direcao", "professores", "pais"] as const).map((p) => (
                        <button
                          key={p}
                          onClick={() => setPublico(p)}
                          className={`p-3 rounded-md border text-left transition-colors ${
                            publico === p ? "border-primary bg-primary/5" : "border-border hover:bg-accent/50"
                          }`}
                        >
                          <div className="text-sm font-medium capitalize">{p === "direcao" ? "Direção" : p}</div>
                          <div className="text-[11px] text-muted-foreground mt-1">
                            {p === "direcao" && "Estratégico, macro"}
                            {p === "professores" && "Operacional, por disciplina"}
                            {p === "pais" && "Acolhedor, acessível"}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                  {preview && (
                    <div className="border border-border rounded-md p-3 bg-muted/40 text-xs whitespace-pre-wrap font-mono max-h-40 overflow-auto">
                      {preview}
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>Fechar</Button>
                  <Button onClick={() => mut.mutate({ publico, escopo: "Escola EMEF Machado de Assis · Nov/2025" })} disabled={mut.isPending}>
                    {mut.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Gerando…</> : "Gerar via IA"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          }
        />

        <Card className="mb-6">
          <CardContent className="p-5 flex items-center gap-6 flex-wrap">
            <Stat label="Sugestões ativas" value={String(sugestoes.data?.length ?? "…")} />
            <Stat label="Alta severidade" value={String(sugestoes.data?.filter(s => s.severidade === "alta").length ?? "…")} tone="destructive" />
            <Stat label="Pontos de dados cruzados" value="8.421" />
            <Stat label="Modelo IA" value="edugov-mixtral-v2" mono />
            <Stat label="Última execução" value="há 12 min" />
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          {sugestoes.isLoading
            ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40" />)
            : sugestoes.data!.map((s) => <SugestaoCard key={s.id} s={s} />)}
        </div>
      </div>
    </AppShell>
  );
}

function Stat({ label, value, tone, mono }: { label: string; value: string; tone?: "destructive"; mono?: boolean }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
      <div className={`text-xl font-semibold mt-0.5 ${tone === "destructive" ? "text-destructive" : ""} ${mono ? "font-mono text-sm" : ""}`}>{value}</div>
    </div>
  );
}

function SugestaoCard({ s }: { s: ReturnType<typeof getMock>[number] }) {
  const toneMap = {
    alta: "border-l-destructive bg-destructive/5",
    media: "border-l-warning bg-warning/5",
    baixa: "border-l-success bg-success/5",
  } as const;
  return (
    <Card className={`border-l-4 ${toneMap[s.severidade]}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-sm flex items-center gap-2">
            {s.severidade === "alta" ? <AlertTriangle className="h-4 w-4 text-destructive" /> : <Sparkles className="h-4 w-4 text-primary" />}
            {s.titulo}
          </CardTitle>
          <Badge variant={s.severidade === "alta" ? "destructive" : s.severidade === "media" ? "secondary" : "outline"} className="capitalize">
            {s.severidade}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-foreground/80 leading-relaxed">{s.descricao}</p>
        <div className="text-[11px] text-muted-foreground space-y-1">
          <div><span className="font-medium">Alvo:</span> {s.alvo}</div>
          <div><span className="font-medium">Base de evidências:</span> {s.base}</div>
        </div>
        <div className="flex items-center gap-2 pt-2 border-t border-border">
          <Button size="sm" variant="outline">Ver evidências</Button>
          <Button size="sm">Criar plano de ação</Button>
        </div>
      </CardContent>
    </Card>
  );
}

// helper only for type inference on card
function getMock() { return [] as Awaited<ReturnType<typeof fetchSugestoesIA>>; }
