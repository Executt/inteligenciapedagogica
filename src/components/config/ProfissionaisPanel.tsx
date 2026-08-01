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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Plus, Search, ChevronLeft, ChevronRight, Trash2, Save, Loader2, Building2, BookOpen, Pencil } from "lucide-react";
import {
  DISCIPLINAS_SEED, DISCIPLINAS_SETTING_KEY, PROFISSIONAIS_SETTING_KEY, UNIDADES_ESCOLARES,
  type Disciplina, type Etapa,
} from "./disciplinas-catalog";

const TURMAS = ["6A", "6B", "7A", "7B", "8A", "8B", "9A", "9B", "1EM-A", "1EM-B", "2EM-A", "3EM-A"];

const cargoValues = ["professor", "coordenacao", "direcao", "secretaria", "apoio"] as const;
const vinculoValues = ["concursado", "estatutario", "terceirizado", "contrato"] as const;
type Cargo = typeof cargoValues[number];
type Vinculo = typeof vinculoValues[number];

const CARGO_LABEL: Record<Cargo, string> = {
  professor: "Professor(a)", coordenacao: "Coordenação", direcao: "Direção", secretaria: "Secretaria", apoio: "Apoio",
};
const VINC_LABEL: Record<Vinculo, string> = {
  concursado: "Concursado", estatutario: "Estatutário", terceirizado: "Terceirizado", contrato: "Contrato",
};

type Prof = {
  id: string;
  nome: string;
  cpf: string;
  matricula: string;
  email: string;
  cargo: Cargo;
  vinculo: Vinculo;
  unidades: string[];      // ids de unidades escolares (múltiplas)
  disciplinas: string[];   // ids de disciplinas (múltiplas)
  turmas: string[];
  ativo: boolean;
};

const MOCK: Prof[] = [
  { id: "1", nome: "Ana Paula Ribeiro", cpf: "123.456.789-01", matricula: "SP-104521", email: "ana.ribeiro@edu.sp.gov.br", cargo: "professor", vinculo: "concursado", unidades: ["u1", "u2"], disciplinas: ["d06", "d17"], turmas: ["9A", "9B"], ativo: true },
  { id: "2", nome: "Carlos Menezes", cpf: "234.567.890-12", matricula: "SP-110988", email: "carlos.menezes@edu.sp.gov.br", cargo: "professor", vinculo: "estatutario", unidades: ["u1"], disciplinas: ["d01", "d19"], turmas: ["7A", "7B", "8A"], ativo: true },
  { id: "3", nome: "Débora Nunes", cpf: "345.678.901-23", matricula: "SP-201044", email: "debora.nunes@edu.sp.gov.br", cargo: "coordenacao", vinculo: "concursado", unidades: ["u1", "u3", "u5"], disciplinas: [], turmas: [], ativo: true },
  { id: "4", nome: "Eduardo Silveira", cpf: "456.789.012-34", matricula: "SP-330211", email: "eduardo.silveira@edu.sp.gov.br", cargo: "professor", vinculo: "terceirizado", unidades: ["u2", "u4"], disciplinas: ["d09", "d10"], turmas: ["2EM-A", "3EM-A"], ativo: true },
  { id: "5", nome: "Fernanda Costa", cpf: "567.890.123-45", matricula: "SP-330555", email: "fernanda.costa@edu.sp.gov.br", cargo: "professor", vinculo: "concursado", unidades: ["u3"], disciplinas: ["d11", "d12"], turmas: ["6A", "6B"], ativo: false },
  { id: "6", nome: "Gustavo Lopes", cpf: "678.901.234-56", matricula: "SP-401800", email: "gustavo.lopes@edu.sp.gov.br", cargo: "professor", vinculo: "contrato", unidades: ["u3", "u6"], disciplinas: ["d03"], turmas: ["6A", "6B", "7A", "7B"], ativo: true },
  { id: "7", nome: "Helena Martins", cpf: "789.012.345-67", matricula: "SP-402990", email: "helena.martins@edu.sp.gov.br", cargo: "professor", vinculo: "estatutario", unidades: ["u4"], disciplinas: ["d08"], turmas: ["1EM-A", "1EM-B"], ativo: true },
  { id: "8", nome: "Igor Ramos", cpf: "890.123.456-78", matricula: "SP-503311", email: "igor.ramos@edu.sp.gov.br", cargo: "apoio", vinculo: "terceirizado", unidades: ["u5"], disciplinas: [], turmas: [], ativo: true },
  { id: "9", nome: "Juliana Prado", cpf: "901.234.567-89", matricula: "SP-503455", email: "juliana.prado@edu.sp.gov.br", cargo: "professor", vinculo: "concursado", unidades: ["u5", "u6"], disciplinas: ["d04", "d02"], turmas: ["8A", "8B"], ativo: true },
  { id: "10", nome: "Luciano Vargas", cpf: "012.345.678-90", matricula: "SP-600100", email: "luciano.vargas@edu.sp.gov.br", cargo: "direcao", vinculo: "concursado", unidades: ["u1"], disciplinas: [], turmas: [], ativo: true },
  { id: "11", nome: "Márcia Tavares", cpf: "111.222.333-44", matricula: "SP-600233", email: "marcia.tavares@edu.sp.gov.br", cargo: "secretaria", vinculo: "estatutario", unidades: ["u2"], disciplinas: [], turmas: [], ativo: true },
  { id: "12", nome: "Nilton Barcelos", cpf: "222.333.444-55", matricula: "SP-701001", email: "nilton.barcelos@edu.sp.gov.br", cargo: "professor", vinculo: "contrato", unidades: ["u6"], disciplinas: ["d07", "d24"], turmas: ["6A", "7A"], ativo: true },
];

const PAGE_SIZE = 8;
const emptyProf = (): Prof => ({
  id: crypto.randomUUID(), nome: "", cpf: "", matricula: "", email: "",
  cargo: "professor", vinculo: "concursado", unidades: [], disciplinas: [], turmas: [], ativo: true,
});

export function ProfissionaisPanel() {
  const qc = useQueryClient();
  const get = useServerFn(getSetting);
  const set = useServerFn(setSetting);

  const profQuery = useQuery({
    queryKey: ["admin", "settings", PROFISSIONAIS_SETTING_KEY],
    queryFn: () => get({ data: { chave: PROFISSIONAIS_SETTING_KEY } }),
  });
  const discQuery = useQuery({
    queryKey: ["admin", "settings", DISCIPLINAS_SETTING_KEY],
    queryFn: () => get({ data: { chave: DISCIPLINAS_SETTING_KEY } }),
  });

  const catalogo: Disciplina[] = useMemo(() => {
    const persisted = (discQuery.data as any)?.disciplinas as Disciplina[] | undefined;
    return (persisted?.length ? persisted : DISCIPLINAS_SEED).filter((d) => d.ativa);
  }, [discQuery.data]);

  const [rows, setRows] = useState<Prof[]>([]);
  const [dirty, setDirty] = useState(false);
  const [q, setQ] = useState("");
  const [cargoFilter, setCargoFilter] = useState<string>("todos");
  const [vinculoFilter, setVinculoFilter] = useState<string>("todos");
  const [unidadeFilter, setUnidadeFilter] = useState<string>("todas");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Prof | null>(null);

  useEffect(() => {
    if (profQuery.isLoading) return;
    const persisted = (profQuery.data as any)?.profissionais as Prof[] | undefined;
    setRows(persisted?.length ? persisted : MOCK);
    setDirty(false);
  }, [profQuery.data, profQuery.isLoading]);

  const save = useMutation({
    mutationFn: (next: Prof[]) => set({ data: { chave: PROFISSIONAIS_SETTING_KEY, valor: { profissionais: next } } }),
    onSuccess: () => {
      setDirty(false);
      qc.invalidateQueries({ queryKey: ["admin", "settings", PROFISSIONAIS_SETTING_KEY] });
      toast.success("Vínculos de profissionais salvos.");
    },
    onError: (e: any) => toast.error(e.message ?? "Falha ao salvar"),
  });

  function mutate(fn: (rs: Prof[]) => Prof[]) {
    setRows(fn);
    setDirty(true);
  }

  const filtered = useMemo(() => rows.filter((r) => {
    const matchQ = !q || [r.nome, r.cpf, r.matricula, r.email].join(" ").toLowerCase().includes(q.toLowerCase());
    const matchC = cargoFilter === "todos" || r.cargo === cargoFilter;
    const matchV = vinculoFilter === "todos" || r.vinculo === vinculoFilter;
    const matchU = unidadeFilter === "todas" || r.unidades.includes(unidadeFilter);
    return matchQ && matchC && matchV && matchU;
  }), [rows, q, cargoFilter, vinculoFilter, unidadeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const discNome = (id: string) => catalogo.find((d) => d.id === id)?.nome ?? id;
  const uniNome = (id: string) => UNIDADES_ESCOLARES.find((u) => u.id === id)?.nome ?? id;

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold flex items-center gap-2"><Users className="h-4 w-4" /> Profissionais e Disciplinas</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Cada profissional pode ser vinculado a várias unidades escolares e a várias disciplinas do catálogo.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditing(emptyProf())}><Plus className="h-4 w-4 mr-1" /> Novo profissional</Button>
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
              <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="pl-8" placeholder="Buscar por nome, CPF, matrícula ou e-mail" />
            </div>
            <div className="w-full md:w-56">
              <Label className="text-xs">Unidade escolar</Label>
              <Select value={unidadeFilter} onValueChange={(v) => { setUnidadeFilter(v); setPage(1); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  {UNIDADES_ESCOLARES.map((u) => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-40">
              <Label className="text-xs">Cargo</Label>
              <Select value={cargoFilter} onValueChange={(v) => { setCargoFilter(v); setPage(1); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {cargoValues.map((c) => <SelectItem key={c} value={c}>{CARGO_LABEL[c]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-40">
              <Label className="text-xs">Vínculo</Label>
              <Select value={vinculoFilter} onValueChange={(v) => { setVinculoFilter(v); setPage(1); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {vinculoValues.map((c) => <SelectItem key={c} value={c}>{VINC_LABEL[c]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="w-28">Matrícula</TableHead>
                <TableHead className="w-28">Cargo</TableHead>
                <TableHead>Unidades escolares</TableHead>
                <TableHead>Disciplinas / Turmas</TableHead>
                <TableHead className="w-20">Status</TableHead>
                <TableHead className="w-24 text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="font-medium">{r.nome}</div>
                    <div className="text-[11px] text-muted-foreground">{r.email}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">{r.cpf}</div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{r.matricula}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{CARGO_LABEL[r.cargo]}</Badge>
                    <div className="text-[10px] text-muted-foreground mt-1">{VINC_LABEL[r.vinculo]}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {r.unidades.map((u) => (
                        <Badge key={u} variant="secondary" className="text-[10px] gap-1">
                          <Building2 className="h-2.5 w-2.5" /> {uniNome(u)}
                        </Badge>
                      ))}
                      {r.unidades.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {r.disciplinas.map((d) => (
                        <Badge key={d} variant="default" className="text-[10px] gap-1">
                          <BookOpen className="h-2.5 w-2.5" /> {discNome(d)}
                        </Badge>
                      ))}
                      {r.turmas.map((t) => <Badge key={t} variant="outline" className="text-[10px] font-mono">{t}</Badge>)}
                      {r.disciplinas.length === 0 && r.turmas.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={r.ativo ? "default" : "secondary"}>{r.ativo ? "Ativo" : "Inativo"}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => mutate((rs) => rs.filter((x) => x.id !== r.id))}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {pageRows.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-6">Nenhum profissional encontrado.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between p-3 border-t text-xs">
            <span className="text-muted-foreground">{filtered.length} profissionais · página {page} de {totalPages}</span>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
              <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><Building2 className="h-4 w-4" /> Cobertura por unidade escolar</CardTitle>
          <CardDescription>Profissionais ativos atrelados a cada unidade.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-3 text-xs">
          {UNIDADES_ESCOLARES.map((u) => {
            const total = rows.filter((r) => r.ativo && r.unidades.includes(u.id)).length;
            return (
              <div key={u.id} className="rounded border p-3">
                <div className="text-[11px] font-medium truncate">{u.nome}</div>
                <div className="text-[10px] text-muted-foreground font-mono">INEP {u.inep} · {u.municipio}</div>
                <div className="text-lg font-semibold mt-1">{total}</div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {editing && (
        <ProfDialog
          prof={editing}
          catalogo={catalogo}
          onClose={() => setEditing(null)}
          onSave={(p) => {
            mutate((rs) => rs.some((x) => x.id === p.id) ? rs.map((x) => x.id === p.id ? p : x) : [p, ...rs]);
            setEditing(null);
            toast.success(`${p.nome} atualizado(a). Clique em Salvar para persistir.`);
          }}
        />
      )}
    </div>
  );
}

function ProfDialog({ prof, catalogo, onClose, onSave }: {
  prof: Prof;
  catalogo: Disciplina[];
  onClose: () => void;
  onSave: (p: Prof) => void;
}) {
  const [form, setForm] = useState<Prof>(prof);
  const [etapaTab, setEtapaTab] = useState<Etapa>("fundamental");

  function toggle<K extends "unidades" | "disciplinas" | "turmas">(key: K, val: string) {
    setForm((f) => ({
      ...f,
      [key]: f[key].includes(val) ? f[key].filter((x) => x !== val) : [...f[key], val],
    }));
  }

  function submit() {
    if (form.nome.trim().length < 3) { toast.error("Nome muito curto."); return; }
    if (!/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(form.cpf)) { toast.error("CPF no formato 000.000.000-00."); return; }
    if (form.matricula.trim().length < 3) { toast.error("Informe a matrícula."); return; }
    if (!/^\S+@\S+\.\S+$/.test(form.email)) { toast.error("E-mail inválido."); return; }
    if (form.unidades.length === 0) { toast.error("Vincule ao menos uma unidade escolar."); return; }
    onSave({ ...form, nome: form.nome.trim(), email: form.email.trim() });
  }

  const disciplinasEtapa = catalogo.filter((d) => d.etapas.includes(etapaTab));

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>{prof.nome ? `Editar · ${prof.nome}` : "Cadastrar profissional"}</DialogTitle>
          <DialogDescription>Vincule múltiplas unidades escolares e múltiplas disciplinas.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label className="text-xs">Nome completo</Label>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
            <div><Label className="text-xs">CPF</Label>
              <Input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} placeholder="000.000.000-00" /></div>
            <div><Label className="text-xs">Matrícula</Label>
              <Input value={form.matricula} onChange={(e) => setForm({ ...form, matricula: e.target.value })} /></div>
            <div className="col-span-2"><Label className="text-xs">E-mail institucional</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div>
              <Label className="text-xs">Cargo</Label>
              <Select value={form.cargo} onValueChange={(v: any) => setForm({ ...form, cargo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{cargoValues.map((c) => <SelectItem key={c} value={c}>{CARGO_LABEL[c]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Vínculo empregatício</Label>
              <Select value={form.vinculo} onValueChange={(v: any) => setForm({ ...form, vinculo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{vinculoValues.map((c) => <SelectItem key={c} value={c}>{VINC_LABEL[c]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs">Unidades escolares ({form.unidades.length} selecionada(s))</Label>
            <div className="grid grid-cols-2 gap-1.5 mt-1">
              {UNIDADES_ESCOLARES.map((u) => {
                const on = form.unidades.includes(u.id);
                return (
                  <button type="button" key={u.id} onClick={() => toggle("unidades", u.id)}
                    className={`text-left px-2.5 py-2 rounded-md text-xs border ${on ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}>
                    <div className="font-medium truncate">{u.nome}</div>
                    <div className={`text-[10px] font-mono ${on ? "opacity-80" : "text-muted-foreground"}`}>INEP {u.inep} · {u.municipio}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Disciplinas ({form.disciplinas.length} selecionada(s))</Label>
              <div className="flex gap-1">
                {(["fundamental", "medio"] as Etapa[]).map((e) => (
                  <button key={e} type="button" onClick={() => setEtapaTab(e)}
                    className={`px-2 py-0.5 rounded text-[11px] border ${etapaTab === e ? "bg-accent" : "text-muted-foreground"}`}>
                    {e === "fundamental" ? "Fundamental" : "Médio"}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {disciplinasEtapa.map((d) => {
                const on = form.disciplinas.includes(d.id);
                return (
                  <button type="button" key={d.id} onClick={() => toggle("disciplinas", d.id)}
                    className={`px-2 py-1 rounded-md text-xs border ${on ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}>
                    {d.nome} <span className="opacity-60 font-mono">{d.codigo}</span>
                  </button>
                );
              })}
              {disciplinasEtapa.length === 0 && <span className="text-xs text-muted-foreground">Nenhuma disciplina ativa para esta etapa.</span>}
            </div>
          </div>

          <div>
            <Label className="text-xs">Turmas vinculadas</Label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {TURMAS.map((t) => {
                const on = form.turmas.includes(t);
                return (
                  <button type="button" key={t} onClick={() => toggle("turmas", t)}
                    className={`px-2 py-1 rounded-md text-xs border font-mono ${on ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}>
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Label className="text-xs">Situação</Label>
            <Select value={form.ativo ? "ativo" : "inativo"} onValueChange={(v) => setForm({ ...form, ativo: v === "ativo" })}>
              <SelectTrigger className="w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit}>Confirmar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
