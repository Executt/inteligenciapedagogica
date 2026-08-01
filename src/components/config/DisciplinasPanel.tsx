import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getSetting, setSetting } from "@/lib/admin/settings.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BookOpen, Plus, Save, Search, Trash2, Paperclip, Loader2, GraduationCap } from "lucide-react";
import {
  AREAS, DISCIPLINAS_SEED, DISCIPLINAS_SETTING_KEY, ETAPA_LABEL,
  type Disciplina, type Etapa, type Recurso,
} from "./disciplinas-catalog";

const TIPO_RECURSO: Record<Recurso["tipo"], string> = {
  livro: "Livro",
  documento: "Documento",
  apostila: "Apostila",
  video: "Vídeo",
  bncc: "BNCC",
};

export function DisciplinasPanel() {
  const qc = useQueryClient();
  const get = useServerFn(getSetting);
  const set = useServerFn(setSetting);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "settings", DISCIPLINAS_SETTING_KEY],
    queryFn: () => get({ data: { chave: DISCIPLINAS_SETTING_KEY } }),
  });

  const [rows, setRows] = useState<Disciplina[]>([]);
  const [dirty, setDirty] = useState(false);
  const [q, setQ] = useState("");
  const [etapa, setEtapa] = useState<"todas" | Etapa>("todas");
  const [area, setArea] = useState<string>("todas");
  const [recursosDe, setRecursosDe] = useState<Disciplina | null>(null);
  const [novaOpen, setNovaOpen] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    const persisted = (data as any)?.disciplinas as Disciplina[] | undefined;
    setRows(persisted?.length ? persisted : DISCIPLINAS_SEED);
    setDirty(false);
  }, [data, isLoading]);

  const save = useMutation({
    mutationFn: (next: Disciplina[]) => set({ data: { chave: DISCIPLINAS_SETTING_KEY, valor: { disciplinas: next } } }),
    onSuccess: () => {
      setDirty(false);
      qc.invalidateQueries({ queryKey: ["admin", "settings", DISCIPLINAS_SETTING_KEY] });
      toast.success("Catálogo de disciplinas salvo.");
    },
    onError: (e: any) => toast.error(e.message ?? "Falha ao salvar"),
  });

  function mutate(fn: (rs: Disciplina[]) => Disciplina[]) {
    setRows((rs) => fn(rs));
    setDirty(true);
  }

  const filtered = useMemo(() => rows.filter((r) => {
    const okQ = !q || [r.nome, r.codigo, r.area].join(" ").toLowerCase().includes(q.toLowerCase());
    const okE = etapa === "todas" || r.etapas.includes(etapa);
    const okA = area === "todas" || r.area === area;
    return okQ && okE && okA;
  }), [rows, q, etapa, area]);

  const totalRecursos = rows.reduce((acc, r) => acc + r.recursos.length, 0);

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold flex items-center gap-2"><BookOpen className="h-4 w-4" /> Disciplinas e materiais</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Catálogo por etapa (Fundamental / Médio), área do conhecimento e materiais vinculados. {rows.length} disciplinas · {totalRecursos} materiais.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setNovaOpen(true)}><Plus className="h-4 w-4 mr-1" /> Nova disciplina</Button>
          <Button onClick={() => save.mutate(rows)} disabled={!dirty || save.isPending}>
            {save.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />} Salvar
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row gap-3 md:items-end">
            <div className="flex-1 relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} className="pl-8" placeholder="Buscar por nome, código ou área" />
            </div>
            <div className="w-full md:w-52">
              <Label className="text-xs">Etapa</Label>
              <Select value={etapa} onValueChange={(v: any) => setEtapa(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as etapas</SelectItem>
                  <SelectItem value="fundamental">Ensino Fundamental</SelectItem>
                  <SelectItem value="medio">Ensino Médio</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-56">
              <Label className="text-xs">Área</Label>
              <Select value={area} onValueChange={setArea}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as áreas</SelectItem>
                  {AREAS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Disciplina</TableHead>
                <TableHead className="w-20">Código</TableHead>
                <TableHead className="w-48">Área</TableHead>
                <TableHead className="w-56">Etapas</TableHead>
                <TableHead className="w-24">C.H.</TableHead>
                <TableHead className="w-28">Materiais</TableHead>
                <TableHead className="w-20">Ativa</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.nome}</TableCell>
                  <TableCell className="font-mono text-xs">{r.codigo}</TableCell>
                  <TableCell className="text-xs">{r.area}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {(["fundamental", "medio"] as Etapa[]).map((e) => {
                        const on = r.etapas.includes(e);
                        return (
                          <button
                            key={e}
                            type="button"
                            onClick={() => mutate((rs) => rs.map((x) => x.id === r.id
                              ? { ...x, etapas: on ? x.etapas.filter((y) => y !== e) : [...x.etapas, e] }
                              : x))}
                            className={`px-2 py-0.5 rounded text-[11px] border ${on ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}
                          >
                            {e === "fundamental" ? "Fund." : "Médio"}
                          </button>
                        );
                      })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      value={r.cargaHoraria}
                      onChange={(e) => mutate((rs) => rs.map((x) => x.id === r.id ? { ...x, cargaHoraria: Number(e.target.value) || 0 } : x))}
                      className="h-8 w-20 text-xs"
                    />
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setRecursosDe(r)}>
                      <Paperclip className="h-3 w-3 mr-1" /> {r.recursos.length}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={r.ativa}
                      onCheckedChange={(v) => mutate((rs) => rs.map((x) => x.id === r.id ? { ...x, ativa: v } : x))}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => mutate((rs) => rs.filter((x) => x.id !== r.id))}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-xs text-muted-foreground py-6">Nenhuma disciplina encontrada.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><GraduationCap className="h-4 w-4" /> Distribuição por etapa</CardTitle>
          <CardDescription>Resumo do catálogo ativo.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-3 text-xs">
          {(["fundamental", "medio"] as Etapa[]).map((e) => (
            <div key={e} className="rounded border p-3">
              <div className="text-[11px] text-muted-foreground">{ETAPA_LABEL[e]}</div>
              <div className="text-lg font-semibold">{rows.filter((r) => r.ativa && r.etapas.includes(e)).length}</div>
              <div className="text-[11px] text-muted-foreground">disciplinas ativas</div>
            </div>
          ))}
          <div className="rounded border p-3">
            <div className="text-[11px] text-muted-foreground">Carga horária total (ativa)</div>
            <div className="text-lg font-semibold">{rows.filter((r) => r.ativa).reduce((a, r) => a + r.cargaHoraria, 0)}h</div>
          </div>
        </CardContent>
      </Card>

      {recursosDe && (
        <RecursosDialog
          disciplina={rows.find((r) => r.id === recursosDe.id) ?? recursosDe}
          onClose={() => setRecursosDe(null)}
          onChange={(recursos) => mutate((rs) => rs.map((x) => x.id === recursosDe.id ? { ...x, recursos } : x))}
        />
      )}

      <NovaDisciplinaDialog
        open={novaOpen}
        onOpenChange={setNovaOpen}
        onAdd={(d) => mutate((rs) => [d, ...rs])}
      />
    </div>
  );
}

function RecursosDialog({ disciplina, onClose, onChange }: {
  disciplina: Disciplina;
  onClose: () => void;
  onChange: (recursos: Recurso[]) => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState<Recurso["tipo"]>("livro");
  const [referencia, setReferencia] = useState("");
  const [ano, setAno] = useState<number>(new Date().getFullYear());

  function add() {
    if (titulo.trim().length < 3) { toast.error("Informe um título com pelo menos 3 caracteres."); return; }
    onChange([...disciplina.recursos, { id: crypto.randomUUID(), titulo: titulo.trim(), tipo, referencia: referencia.trim(), ano }]);
    setTitulo(""); setReferencia("");
    toast.success("Material vinculado.");
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Materiais · {disciplina.nome}</DialogTitle>
          <DialogDescription>Livros, documentos oficiais e apostilas vinculados a esta disciplina.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-6 gap-2 items-end">
          <div className="col-span-2">
            <Label className="text-xs">Título</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Matemática Contexto & Aplicações" />
          </div>
          <div>
            <Label className="text-xs">Tipo</Label>
            <Select value={tipo} onValueChange={(v: any) => setTipo(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(TIPO_RECURSO).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Referência</Label>
            <Input value={referencia} onChange={(e) => setReferencia(e.target.value)} placeholder="PNLD 2021 · Editora" />
          </div>
          <div>
            <Label className="text-xs">Ano</Label>
            <Input type="number" value={ano} onChange={(e) => setAno(Number(e.target.value) || new Date().getFullYear())} />
          </div>
        </div>
        <Button size="sm" onClick={add}><Plus className="h-3.5 w-3.5 mr-1" /> Vincular material</Button>

        <div className="max-h-72 overflow-auto divide-y">
          {disciplina.recursos.map((r) => (
            <div key={r.id} className="py-2 flex items-center gap-3">
              <Badge variant="outline" className="text-[10px]">{TIPO_RECURSO[r.tipo]}</Badge>
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate">{r.titulo}</div>
                <div className="text-[11px] text-muted-foreground truncate">{r.referencia}{r.ano ? ` · ${r.ano}` : ""}</div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => onChange(disciplina.recursos.filter((x) => x.id !== r.id))}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          {disciplina.recursos.length === 0 && (
            <p className="text-xs text-muted-foreground py-6 text-center">Nenhum material vinculado.</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NovaDisciplinaDialog({ open, onOpenChange, onAdd }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAdd: (d: Disciplina) => void;
}) {
  const [nome, setNome] = useState("");
  const [codigo, setCodigo] = useState("");
  const [area, setArea] = useState<string>(AREAS[0]);
  const [etapas, setEtapas] = useState<Etapa[]>(["fundamental"]);
  const [ch, setCh] = useState(40);

  function submit() {
    if (nome.trim().length < 3) { toast.error("Nome muito curto."); return; }
    if (codigo.trim().length < 2) { toast.error("Informe um código (ex.: MAT)."); return; }
    if (etapas.length === 0) { toast.error("Selecione ao menos uma etapa."); return; }
    onAdd({
      id: crypto.randomUUID(), nome: nome.trim(), codigo: codigo.trim().toUpperCase(),
      area, etapas, cargaHoraria: ch, ativa: true, recursos: [],
    });
    toast.success(`${nome.trim()} adicionada ao catálogo.`);
    setNome(""); setCodigo(""); setCh(40); setEtapas(["fundamental"]);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nova disciplina</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label className="text-xs">Nome</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Código</Label><Input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="MAT" /></div>
            <div><Label className="text-xs">Carga horária anual</Label><Input type="number" value={ch} onChange={(e) => setCh(Number(e.target.value) || 0)} /></div>
          </div>
          <div>
            <Label className="text-xs">Área do conhecimento</Label>
            <Select value={area} onValueChange={setArea}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{AREAS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Etapas de ensino</Label>
            <div className="flex gap-2 mt-1">
              {(["fundamental", "medio"] as Etapa[]).map((e) => {
                const on = etapas.includes(e);
                return (
                  <button key={e} type="button"
                    onClick={() => setEtapas(on ? etapas.filter((x) => x !== e) : [...etapas, e])}
                    className={`px-3 py-1.5 rounded-md text-xs border ${on ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}>
                    {ETAPA_LABEL[e]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit}>Adicionar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
