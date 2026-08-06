import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  listConnectors, saveConnector, deleteConnector, testConnector, listConnectorLogs,
} from "@/lib/hub/connectors.functions";
import {
  listEvents, publishEvent, drainEvents, listSubscriptions, upsertSubscription, removeSubscription,
} from "@/lib/hub/events.functions";
import { ADAPTERS, ADAPTER_BY_TYPE, AUTH_TIPOS, DIRECOES } from "@/lib/hub/adapters";
import { EVENT_CATALOG, CONSUMIDORES, BUS_TRANSPORT } from "@/lib/hub/events";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plug, Plus, Play, Trash2, Pencil, RefreshCw, Radio, Send } from "lucide-react";
import { SyncTab } from "@/components/config/hub/SyncTab";
import { MappingsTab } from "@/components/config/hub/MappingsTab";
import { BusMonitor } from "@/components/config/hub/BusMonitor";
import { LogsTab } from "@/components/config/hub/LogsTab";

type Conn = any;

const EMPTY: Conn = {
  nome: "", slug: "", descricao: "", adaptador: "rest", direcao: "entrada", base_url: "",
  auth_tipo: "none", auth_config: {}, parametros: {}, eventos_publicados: [], situacao: "inativo",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  ativo: "default", sucesso: "default", processado: "default",
  inativo: "secondary", aviso: "outline", pendente: "outline", descartado: "secondary",
  erro: "destructive",
};

function StatusBadge({ value }: { value?: string | null }) {
  if (!value) return <span className="text-muted-foreground text-xs">—</span>;
  return <Badge variant={STATUS_VARIANT[value] ?? "outline"} className="capitalize">{value}</Badge>;
}

export function IntegrationHubPanel() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Plug className="h-5 w-5" /> Integration Hub
        </h2>
        <p className="text-sm text-muted-foreground">
          Camada única de comunicação com sistemas externos: conectores, adaptadores de protocolo e barramento
          interno de eventos. Nenhum sistema de terceiros acessa o banco diretamente.
        </p>
      </div>

      <Tabs defaultValue="conectores">
        <TabsList>
          <TabsTrigger value="conectores">Conectores</TabsTrigger>
          <TabsTrigger value="adaptadores">Adaptadores</TabsTrigger>
          <TabsTrigger value="sincronizacoes">Sincronizações</TabsTrigger>
          <TabsTrigger value="mapeamentos">Mapeamentos</TabsTrigger>
          <TabsTrigger value="barramento">Barramento de eventos</TabsTrigger>
          <TabsTrigger value="logs">Logs & histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="conectores" className="pt-4"><ConectoresTab /></TabsContent>
        <TabsContent value="adaptadores" className="pt-4"><AdaptadoresTab /></TabsContent>
        <TabsContent value="sincronizacoes" className="pt-4"><SyncTab /></TabsContent>
        <TabsContent value="mapeamentos" className="pt-4"><MappingsTab /></TabsContent>
        <TabsContent value="barramento" className="pt-4"><BarramentoTab /></TabsContent>
        <TabsContent value="logs" className="pt-4"><LogsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ------------------------------- Conectores ------------------------------- */

function ConectoresTab() {
  const qc = useQueryClient();
  const list = useServerFn(listConnectors);
  const save = useServerFn(saveConnector);
  const remove = useServerFn(deleteConnector);
  const test = useServerFn(testConnector);

  const [form, setForm] = useState<Conn | null>(null);
  const { data: conectores = [], isLoading } = useQuery({ queryKey: ["hub", "connectors"], queryFn: () => list({}) });

  const salvar = useMutation({
    mutationFn: (payload: Conn) => save({ data: payload }),
    onSuccess: () => {
      toast.success("Conector salvo.");
      setForm(null);
      qc.invalidateQueries({ queryKey: ["hub", "connectors"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao salvar conector."),
  });

  const testar = useMutation({
    mutationFn: (id: string) => test({ data: { id } }),
    onSuccess: (r: any) => {
      const msg = `${r.mensagem} (${r.duracao_ms} ms)`;
      r.status === "erro" ? toast.error(msg) : r.status === "aviso" ? toast.warning(msg) : toast.success(msg);
      qc.invalidateQueries({ queryKey: ["hub"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha no teste de conexão."),
  });

  const excluir = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Conector removido.");
      qc.invalidateQueries({ queryKey: ["hub", "connectors"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao remover."),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{(conectores as Conn[]).length} conector(es) registrado(s).</p>
        <Button size="sm" onClick={() => setForm({ ...EMPTY })}>
          <Plus className="h-4 w-4 mr-1" /> Novo conector
        </Button>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Identificação</TableHead>
              <TableHead>Adaptador</TableHead>
              <TableHead>Direção</TableHead>
              <TableHead>Autenticação</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead>Último teste</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={7} className="text-muted-foreground">Carregando…</TableCell></TableRow>}
            {!isLoading && (conectores as Conn[]).length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-muted-foreground">
                Nenhum conector cadastrado. Crie o primeiro para integrar um sistema da Secretaria.
              </TableCell></TableRow>
            )}
            {(conectores as Conn[]).map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <div className="font-medium">{c.nome}</div>
                  <div className="text-xs text-muted-foreground font-mono">{c.slug}</div>
                </TableCell>
                <TableCell className="text-sm">{ADAPTER_BY_TYPE[c.adaptador as keyof typeof ADAPTER_BY_TYPE]?.rotulo ?? c.adaptador}</TableCell>
                <TableCell className="text-sm capitalize">{c.direcao}</TableCell>
                <TableCell className="text-sm">{AUTH_TIPOS.find((a) => a.id === c.auth_tipo)?.rotulo}</TableCell>
                <TableCell><StatusBadge value={c.situacao} /></TableCell>
                <TableCell className="text-xs max-w-[220px]">
                  <StatusBadge value={c.ultimo_teste_status} />
                  <div className="text-muted-foreground truncate">{c.ultimo_teste_mensagem ?? "—"}</div>
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  <Button variant="ghost" size="icon" title="Testar conexão"
                    disabled={testar.isPending} onClick={() => testar.mutate(c.id)}>
                    <Play className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" title="Editar" onClick={() => setForm({ ...c })}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" title="Remover" onClick={() => excluir.mutate(c.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <ConnectorDialog form={form} setForm={setForm} onSave={(p) => salvar.mutate(p)} saving={salvar.isPending} />
    </div>
  );
}

function ConnectorDialog({
  form, setForm, onSave, saving,
}: { form: Conn | null; setForm: (c: Conn | null) => void; onSave: (c: Conn) => void; saving: boolean }) {
  if (!form) return null;
  const def = ADAPTER_BY_TYPE[form.adaptador as keyof typeof ADAPTER_BY_TYPE];
  const set = (patch: Partial<Conn>) => setForm({ ...form, ...patch });
  const setParam = (k: string, v: string) => set({ parametros: { ...(form.parametros ?? {}), [k]: v } });
  const setAuth = (k: string, v: string) => set({ auth_config: { ...(form.auth_config ?? {}), [k]: v } });

  const authFields: Record<string, string[]> = {
    none: [],
    api_key: ["header", "api_key"],
    bearer: ["token"],
    basic: ["usuario", "senha"],
    oauth2: ["token_url", "client_id", "client_secret", "escopo"],
    mtls: ["certificado", "chave"],
  };

  const submit = () => {
    if (!form.nome || !form.slug) return toast.error("Informe nome e identificador (slug).");
    const { created_at, updated_at, ultimo_teste_em, ultimo_teste_status, ultimo_teste_mensagem, ...payload } = form;
    onSave(payload);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && setForm(null)}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{form.id ? "Editar conector" : "Novo conector"}</DialogTitle></DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Nome</Label>
              <Input value={form.nome} onChange={(e) => set({ nome: e.target.value })} placeholder="Sistema de Gestão Escolar" />
            </div>
            <div>
              <Label>Identificador (slug)</Label>
              <Input value={form.slug} onChange={(e) => set({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} placeholder="gestao-escolar" />
            </div>
          </div>

          <div>
            <Label>Descrição</Label>
            <Textarea rows={2} value={form.descricao ?? ""} onChange={(e) => set({ descricao: e.target.value })} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Adaptador</Label>
              <Select value={form.adaptador} onValueChange={(v) => set({ adaptador: v, parametros: {} })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ADAPTERS.map((a) => <SelectItem key={a.tipo} value={a.tipo}>{a.rotulo}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Direção</Label>
              <Select value={form.direcao} onValueChange={(v) => set({ direcao: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DIRECOES.map((d) => <SelectItem key={d.id} value={d.id}>{d.rotulo}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {def?.familia === "api" && (
            <div>
              <Label>Endereço base</Label>
              <Input value={form.base_url ?? ""} onChange={(e) => set({ base_url: e.target.value })} placeholder="https://api.educacao.gov.br" />
            </div>
          )}

          <div className="rounded-md border p-3 space-y-3">
            <div className="text-sm font-medium">Autenticação</div>
            <Select value={form.auth_tipo} onValueChange={(v) => set({ auth_tipo: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {AUTH_TIPOS.map((a) => <SelectItem key={a.id} value={a.id}>{a.rotulo}</SelectItem>)}
              </SelectContent>
            </Select>
            {(authFields[form.auth_tipo] ?? []).length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {authFields[form.auth_tipo].map((k) => (
                  <div key={k}>
                    <Label className="capitalize">{k.replace("_", " ")}</Label>
                    <Input value={(form.auth_config ?? {})[k] ?? ""} onChange={(e) => setAuth(k, e.target.value)} />
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Segredos são gravados no backend e devolvidos mascarados — nunca ficam expostos na interface.
            </p>
          </div>

          {(def?.campos ?? []).length > 0 && (
            <div className="rounded-md border p-3 space-y-3">
              <div className="text-sm font-medium">Parâmetros do adaptador</div>
              <div className="grid grid-cols-2 gap-3">
                {def.campos.map((c: { id: string; rotulo: string; placeholder?: string; obrigatorio?: boolean }) => (
                  <div key={c.id}>
                    <Label>{c.rotulo}{c.obrigatorio && " *"}</Label>
                    <Input value={(form.parametros ?? {})[c.id] ?? ""} placeholder={c.placeholder}
                      onChange={(e) => setParam(c.id, e.target.value)} />
                  </div>
                ))}
              </div>
              {def.execucao === "agente" && (
                <p className="text-xs text-muted-foreground">
                  Este adaptador exige agente de integração na rede da Secretaria — o teste valida apenas a configuração.
                </p>
              )}
            </div>
          )}

          <div className="rounded-md border p-3 space-y-2">
            <div className="text-sm font-medium">Eventos publicados por este conector</div>
            <div className="grid grid-cols-2 gap-2">
              {EVENT_CATALOG.map((e) => {
                const marcado = (form.eventos_publicados ?? []).includes(e.nome);
                return (
                  <label key={e.nome} className="flex items-center gap-2 text-sm">
                    <Switch checked={marcado} onCheckedChange={(v) =>
                      set({
                        eventos_publicados: v
                          ? [...(form.eventos_publicados ?? []), e.nome]
                          : (form.eventos_publicados ?? []).filter((x: string) => x !== e.nome),
                      })
                    } />
                    <span className="font-mono text-xs">{e.nome}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={form.situacao === "ativo"} onCheckedChange={(v) => set({ situacao: v ? "ativo" : "inativo" })} />
            <Label>Conector ativo</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setForm(null)}>Cancelar</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Salvando…" : "Salvar conector"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------ Adaptadores ------------------------------- */

function AdaptadoresTab() {
  const familias: Array<{ id: string; rotulo: string }> = [
    { id: "api", rotulo: "APIs & Serviços" },
    { id: "banco", rotulo: "Bancos de dados relacionais e NoSQL" },
    { id: "diretorio", rotulo: "Diretórios corporativos" },
    { id: "arquivo", rotulo: "Arquivos & transferência" },
  ];
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Catálogo de adaptadores suportados. Cada conector escolhe um adaptador, que traduz o protocolo externo
        para o contrato interno do Edu-Gov.
      </p>
      {familias.map((f) => (
        <Card key={f.id} className="p-4">
          <div className="text-sm font-semibold mb-2">{f.rotulo}</div>
          <div className="flex flex-wrap gap-2">
            {ADAPTERS.filter((a) => a.familia === f.id).map((a) => (
              <Badge key={a.tipo} variant={a.execucao === "nativo" ? "default" : "secondary"}>
                {a.rotulo} · {a.execucao}
              </Badge>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

/* ------------------------------- Barramento ------------------------------- */

function BarramentoTab() {
  const qc = useQueryClient();
  const eventsFn = useServerFn(listEvents);
  const subsFn = useServerFn(listSubscriptions);
  const publish = useServerFn(publishEvent);
  const drain = useServerFn(drainEvents);
  const upsertSub = useServerFn(upsertSubscription);
  const rmSub = useServerFn(removeSubscription);

  const [nome, setNome] = useState(EVENT_CATALOG[0].nome as string);
  const [agregadoId, setAgregadoId] = useState("");
  const [payload, setPayload] = useState('{\n  "origem": "manual"\n}');
  const [novoConsumidor, setNovoConsumidor] = useState<string>(CONSUMIDORES[0]);
  const [novoEvento, setNovoEvento] = useState<string>(EVENT_CATALOG[0].nome);

  const { data: eventos = [] } = useQuery({ queryKey: ["hub", "events"], queryFn: () => eventsFn({ data: {} }) });
  const { data: subs = [] } = useQuery({ queryKey: ["hub", "subs"], queryFn: () => subsFn({}) });

  const publicar = useMutation({
    mutationFn: async () => {
      let parsed: Record<string, unknown> = {};
      try { parsed = JSON.parse(payload || "{}"); } catch { throw new Error("Payload não é um JSON válido."); }
      return publish({ data: { nome: nome as any, agregado_id: agregadoId || null, payload: parsed, origem: "administration" } });
    },
    onSuccess: () => { toast.success("Evento publicado no barramento."); qc.invalidateQueries({ queryKey: ["hub", "events"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao publicar."),
  });

  const consumir = useMutation({
    mutationFn: () => drain({ data: { limit: 25 } }),
    onSuccess: (r: any) => {
      toast.success(`${r.processados} evento(s) entregue(s); ${r.semConsumidor} sem consumidor.`);
      qc.invalidateQueries({ queryKey: ["hub", "events"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao consumir eventos."),
  });

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="text-sm font-semibold flex items-center gap-2 mb-1"><Radio className="h-4 w-4" /> Transporte do barramento</div>
        <p className="text-xs text-muted-foreground">
          Atual: <span className="font-mono">{BUS_TRANSPORT.atual}</span> (outbox transacional no banco).
          Preparado para migrar para <span className="font-mono">{BUS_TRANSPORT.planejado.join(" / ")}</span> sem alterar
          os contratos de evento (nome, agregado, correlação e payload).
        </p>
      </Card>

      <BusMonitor />

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4 space-y-3">
          <div className="text-sm font-semibold">Produzir evento</div>
          <div>
            <Label>Evento</Label>
            <Select value={nome} onValueChange={setNome}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {EVENT_CATALOG.map((e) => <SelectItem key={e.nome} value={e.nome}>{e.nome} · {e.agregado}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>ID do agregado</Label>
            <Input value={agregadoId} onChange={(e) => setAgregadoId(e.target.value)} placeholder="matrícula, código da escola…" />
          </div>
          <div>
            <Label>Payload (JSON)</Label>
            <Textarea rows={4} className="font-mono text-xs" value={payload} onChange={(e) => setPayload(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => publicar.mutate()} disabled={publicar.isPending}>
              <Send className="h-4 w-4 mr-1" /> Publicar
            </Button>
            <Button size="sm" variant="outline" onClick={() => consumir.mutate()} disabled={consumir.isPending}>
              <RefreshCw className="h-4 w-4 mr-1" /> Consumir pendentes
            </Button>
          </div>
        </Card>

        <Card className="p-4 space-y-3">
          <div className="text-sm font-semibold">Assinaturas (consumo)</div>
          <div className="flex gap-2">
            <Select value={novoConsumidor} onValueChange={setNovoConsumidor}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>{CONSUMIDORES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={novoEvento} onValueChange={setNovoEvento}>
              <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
              <SelectContent>{EVENT_CATALOG.map((e) => <SelectItem key={e.nome} value={e.nome}>{e.nome}</SelectItem>)}</SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={async () => {
              try {
                await upsertSub({ data: { consumidor: novoConsumidor as any, evento: novoEvento as any, ativo: true } });
                toast.success("Assinatura registrada.");
                qc.invalidateQueries({ queryKey: ["hub", "subs"] });
              } catch (e: any) { toast.error(e?.message ?? "Falha."); }
            }}><Plus className="h-4 w-4" /></Button>
          </div>
          <div className="max-h-56 overflow-y-auto divide-y">
            {(subs as any[]).map((s) => (
              <div key={s.id} className="flex items-center justify-between py-1.5 text-sm">
                <span><Badge variant="secondary" className="mr-2">{s.consumidor}</Badge><span className="font-mono text-xs">{s.evento}</span></span>
                <div className="flex items-center gap-2">
                  <Switch checked={s.ativo} onCheckedChange={async (v) => {
                    await upsertSub({ data: { consumidor: s.consumidor, evento: s.evento, ativo: v } });
                    qc.invalidateQueries({ queryKey: ["hub", "subs"] });
                  }} />
                  <Button variant="ghost" size="icon" onClick={async () => {
                    await rmSub({ data: { id: s.id } });
                    qc.invalidateQueries({ queryKey: ["hub", "subs"] });
                  }}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
            {(subs as any[]).length === 0 && <p className="text-xs text-muted-foreground py-2">Nenhuma assinatura ativa.</p>}
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Evento</TableHead>
              <TableHead>Agregado</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tentativas</TableHead>
              <TableHead>Publicado em</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(eventos as any[]).map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-mono text-xs">{e.nome}</TableCell>
                <TableCell className="text-sm">{e.agregado}{e.agregado_id ? ` · ${e.agregado_id}` : ""}</TableCell>
                <TableCell className="text-sm">{e.origem}</TableCell>
                <TableCell><StatusBadge value={e.status} /></TableCell>
                <TableCell className="text-sm">{e.tentativas}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString("pt-BR")}</TableCell>
              </TableRow>
            ))}
            {(eventos as any[]).length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-muted-foreground">Nenhum evento no barramento.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
