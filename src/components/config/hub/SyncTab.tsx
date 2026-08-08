import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { listConnectors } from "@/lib/hub/connectors.functions";
import { listSyncJobs, saveSyncJob, deleteSyncJob, listSyncRuns, runSyncJob } from "@/lib/hub/sync.functions";
import { AGGREGATE_LABEL, SYNC_AGGREGATES, ERROR_CATEGORIES } from "@/lib/hub/mapping";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Play, RotateCcw, Trash2, Pencil, Timer, CalendarClock } from "lucide-react";

const FREQUENCIAS = [
  { min: 15, rotulo: "A cada 15 minutos" },
  { min: 30, rotulo: "A cada 30 minutos" },
  { min: 60, rotulo: "A cada hora" },
  { min: 180, rotulo: "A cada 3 horas" },
  { min: 360, rotulo: "A cada 6 horas" },
  { min: 720, rotulo: "Duas vezes ao dia" },
  { min: 1440, rotulo: "Diária" },
  { min: 10080, rotulo: "Semanal" },
];

const VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  sucesso: "default", executando: "outline", aviso: "outline", erro: "destructive",
};

function Status({ value }: { value?: string | null }) {
  if (!value) return <span className="text-xs text-muted-foreground">—</span>;
  return <Badge variant={VARIANT[value] ?? "secondary"} className="capitalize">{value}</Badge>;
}

const dt = (v?: string | null) => (v ? new Date(v).toLocaleString("pt-BR") : "—");

export function SyncTab() {
  const qc = useQueryClient();
  const connsFn = useServerFn(listConnectors);
  const jobsFn = useServerFn(listSyncJobs);
  const saveFn = useServerFn(saveSyncJob);
  const delFn = useServerFn(deleteSyncJob);
  const runsFn = useServerFn(listSyncRuns);
  const runFn = useServerFn(runSyncJob);

  const [form, setForm] = useState<any | null>(null);
  const [filtroConector, setFiltroConector] = useState("todos");

  const { data: conectores = [] } = useQuery({ queryKey: ["hub", "connectors"], queryFn: () => connsFn({}) });
  const { data: jobs = [] } = useQuery({ queryKey: ["hub", "jobs"], queryFn: () => jobsFn({}) });
  const { data: runs = [] } = useQuery({ queryKey: ["hub", "runs"], queryFn: () => runsFn({ data: {} }) });

  const nomeConector = useMemo(
    () => Object.fromEntries((conectores as any[]).map((c) => [c.id, c.nome])),
    [conectores],
  );

  const salvar = useMutation({
    mutationFn: (p: any) => saveFn({ data: p }),
    onSuccess: () => {
      toast.success("Agendamento salvo.");
      setForm(null);
      qc.invalidateQueries({ queryKey: ["hub", "jobs"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao salvar."),
  });

  const executar = useMutation({
    mutationFn: (p: { job_id: string; reprocessa_run_id?: string | null; gatilho: "manual" | "reprocessamento" }) => runFn({ data: p }),
    onSuccess: (r: any) => {
      const msg = `${r.mensagem} (${r.duracao_ms} ms)`;
      r.status === "erro" ? toast.error(msg) : r.status === "aviso" ? toast.warning(msg) : toast.success(msg);
      qc.invalidateQueries({ queryKey: ["hub"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha na execução."),
  });

  const excluir = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Agendamento removido."); qc.invalidateQueries({ queryKey: ["hub", "jobs"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao remover."),
  });

  const runsFiltrados = (runs as any[]).filter((r) => filtroConector === "todos" || r.connector_id === filtroConector);

  const indicadores = useMemo(() => {
    const total = runsFiltrados.length;
    const erros = runsFiltrados.filter((r) => r.status === "erro");
    const porCategoria = ERROR_CATEGORIES.map((c) => ({
      ...c,
      qtd: erros.filter((r) => (r.categoria_erro ?? "outro") === c.id).length,
    })).filter((c) => c.qtd > 0);
    return {
      total,
      sucesso: runsFiltrados.filter((r) => r.status === "sucesso").length,
      aviso: runsFiltrados.filter((r) => r.status === "aviso").length,
      erro: erros.length,
      registros: runsFiltrados.reduce((a, r) => a + (r.registros_validos ?? 0), 0),
      porCategoria,
    };
  }, [runsFiltrados]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Execução e agendamento de sincronizações por conector: frequência, status por job e reprocessamento.
        </p>
        <Button size="sm" disabled={!(conectores as any[]).length}
          onClick={() => setForm({ connector_id: (conectores as any[])[0]?.id, nome: "", agregado: "student", frequencia_min: 60, limite_registros: 500, ativo: true })}>
          <Plus className="h-4 w-4 mr-1" /> Novo agendamento
        </Button>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Job</TableHead>
              <TableHead>Conector</TableHead>
              <TableHead>Agregado</TableHead>
              <TableHead>Frequência</TableHead>
              <TableHead>Última / próxima</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(jobs as any[]).length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-muted-foreground">
                Nenhum agendamento. Crie um job para sincronizar dados de um conector.
              </TableCell></TableRow>
            )}
            {(jobs as any[]).map((j) => (
              <TableRow key={j.id}>
                <TableCell>
                  <div className="font-medium">{j.nome}</div>
                  <div className="text-xs text-muted-foreground">{j.limite_registros} registros/execução</div>
                </TableCell>
                <TableCell className="text-sm">{nomeConector[j.connector_id] ?? "—"}</TableCell>
                <TableCell className="text-sm">{AGGREGATE_LABEL[j.agregado as keyof typeof AGGREGATE_LABEL] ?? j.agregado}</TableCell>
                <TableCell className="text-sm">
                  <span className="flex items-center gap-1"><Timer className="h-3.5 w-3.5 text-muted-foreground" />
                    {FREQUENCIAS.find((f) => f.min === j.frequencia_min)?.rotulo ?? `${j.frequencia_min} min`}</span>
                  {!j.ativo && <Badge variant="secondary" className="mt-1">pausado</Badge>}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  <div>últ.: {dt(j.ultima_execucao)}</div>
                  <div className="flex items-center gap-1"><CalendarClock className="h-3 w-3" /> próx.: {j.ativo ? dt(j.proxima_execucao) : "—"}</div>
                </TableCell>
                <TableCell>
                  <Status value={j.ultimo_status} />
                  <div className="text-xs text-muted-foreground max-w-[200px] truncate">{j.ultima_mensagem ?? ""}</div>
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  <Button variant="ghost" size="icon" aria-label="Executar agora" title="Executar agora" disabled={executar.isPending}
                    onClick={() => executar.mutate({ job_id: j.id, gatilho: "manual" })}>
                    <Play className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" aria-label={j.ativo ? "Pausar" : "Retomar"} title={j.ativo ? "Pausar" : "Retomar"}
                    onClick={() => salvar.mutate({ ...stripJob(j), ativo: !j.ativo })}>
                    <Timer className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" aria-label="Editar" title="Editar" onClick={() => setForm(stripJob(j))}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" aria-label="Remover" title="Remover" onClick={() => excluir.mutate(j.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <div className="flex items-center gap-3">
        <Label className="text-xs">Execuções do conector</Label>
        <Select value={filtroConector} onValueChange={setFiltroConector}>
          <SelectTrigger className="w-72"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os conectores</SelectItem>
            {(conectores as any[]).map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { r: "Execuções", v: indicadores.total },
          { r: "Sucesso", v: indicadores.sucesso },
          { r: "Com ressalvas", v: indicadores.aviso },
          { r: "Erros", v: indicadores.erro },
          { r: "Registros válidos", v: indicadores.registros },
        ].map((k) => (
          <Card key={k.r} className="p-3">
            <div className="text-xs text-muted-foreground">{k.r}</div>
            <div className="text-xl font-semibold">{k.v}</div>
          </Card>
        ))}
      </div>

      {indicadores.porCategoria.length > 0 && (
        <Card className="p-3">
          <div className="text-xs text-muted-foreground mb-2">Erros por categoria</div>
          <div className="flex flex-wrap gap-2">
            {indicadores.porCategoria.map((c) => (
              <Badge key={c.id} variant="destructive">{c.rotulo}: {c.qtd}</Badge>
            ))}
          </div>
        </Card>
      )}

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Início</TableHead>
              <TableHead>Conector</TableHead>
              <TableHead>Gatilho</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Lidos / válidos</TableHead>
              <TableHead>Rejeitados / dup.</TableHead>
              <TableHead>Duração</TableHead>
              <TableHead>Mensagem</TableHead>
              <TableHead className="text-right">Reprocessar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {runsFiltrados.length === 0 && (
              <TableRow><TableCell colSpan={9} className="text-muted-foreground">Nenhuma execução registrada.</TableCell></TableRow>
            )}
            {runsFiltrados.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="text-xs text-muted-foreground">{dt(r.iniciado_em)}</TableCell>
                <TableCell className="text-sm">{nomeConector[r.connector_id] ?? "—"}</TableCell>
                <TableCell className="text-xs capitalize">{r.gatilho}</TableCell>
                <TableCell>
                  <Status value={r.status} />
                  {r.categoria_erro && r.status === "erro" && (
                    <div className="text-[11px] text-muted-foreground">
                      {ERROR_CATEGORIES.find((c) => c.id === r.categoria_erro)?.rotulo ?? r.categoria_erro}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-sm">{r.registros_lidos} / {r.registros_validos}</TableCell>
                <TableCell className="text-sm">{r.registros_rejeitados} / {r.registros_duplicados}</TableCell>
                <TableCell className="text-sm">{r.duracao_ms ?? "—"} ms</TableCell>
                <TableCell className="text-xs max-w-[280px] truncate">{r.mensagem}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" aria-label="Reprocessar esta execução" title="Reprocessar esta execução" disabled={!r.job_id || executar.isPending}
                    onClick={() => executar.mutate({ job_id: r.job_id, reprocessa_run_id: r.id, gatilho: "reprocessamento" })}>
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {form && (
        <Dialog open onOpenChange={(o) => !o && setForm(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>{form.id ? "Editar agendamento" : "Novo agendamento"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Nome do job</Label>
                <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Alunos — carga noturna" />
              </div>
              <div>
                <Label>Conector</Label>
                <Select value={form.connector_id} onValueChange={(v) => setForm({ ...form, connector_id: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(conectores as any[]).map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Agregado</Label>
                  <Select value={form.agregado} onValueChange={(v) => setForm({ ...form, agregado: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SYNC_AGGREGATES.map((a) => <SelectItem key={a} value={a}>{AGGREGATE_LABEL[a]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Frequência</Label>
                  <Select value={String(form.frequencia_min)} onValueChange={(v) => setForm({ ...form, frequencia_min: Number(v) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FREQUENCIAS.map((f) => <SelectItem key={f.min} value={String(f.min)}>{f.rotulo}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Limite de registros por execução</Label>
                <Input type="number" value={form.limite_registros}
                  onChange={(e) => setForm({ ...form, limite_registros: Number(e.target.value) })} />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} />
                <Label>Agendamento ativo</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setForm(null)}>Cancelar</Button>
              <Button disabled={salvar.isPending} onClick={() => {
                if (!form.nome || !form.connector_id) return toast.error("Informe nome e conector.");
                salvar.mutate(form);
              }}>{salvar.isPending ? "Salvando…" : "Salvar"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function stripJob(j: any) {
  return {
    id: j.id, connector_id: j.connector_id, nome: j.nome, agregado: j.agregado,
    frequencia_min: j.frequencia_min, limite_registros: j.limite_registros, ativo: j.ativo,
  };
}
