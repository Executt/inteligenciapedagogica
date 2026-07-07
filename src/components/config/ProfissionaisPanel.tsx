import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Plus, Search, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { simulate } from "./_shared";

const DISCIPLINAS = ["Matemática", "Português", "Ciências", "História", "Geografia", "Ed. Física", "Artes", "Inglês", "Física", "Química", "Biologia"];
const TURMAS = ["6A", "6B", "7A", "7B", "8A", "8B", "9A", "9B", "1EM-A", "1EM-B", "2EM-A", "3EM-A"];

const cargoValues = ["professor", "coordenacao", "direcao", "secretaria", "apoio"] as const;
const vinculoValues = ["concursado", "estatutario", "terceirizado", "contrato"] as const;

const schema = z.object({
  nome: z.string().min(3, "Nome muito curto"),
  cpf: z.string().regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, "CPF: 000.000.000-00"),
  matricula: z.string().min(3, "Informe a matrícula"),
  email: z.string().email("E-mail inválido"),
  cargo: z.enum(cargoValues),
  vinculo: z.enum(vinculoValues),
  disciplinas: z.array(z.string()).default([]),
  turmas: z.array(z.string()).default([]),
});
type Form = z.infer<typeof schema>;

type Prof = Form & { id: string; ativo: boolean };

const CARGO_LABEL: Record<typeof cargoValues[number], string> = {
  professor: "Professor(a)", coordenacao: "Coordenação", direcao: "Direção", secretaria: "Secretaria", apoio: "Apoio",
};
const VINC_LABEL: Record<typeof vinculoValues[number], string> = {
  concursado: "Concursado", estatutario: "Estatutário", terceirizado: "Terceirizado", contrato: "Contrato",
};

const MOCK: Prof[] = [
  { id: "1", nome: "Ana Paula Ribeiro", cpf: "123.456.789-01", matricula: "SP-104521", email: "ana.ribeiro@edu.sp.gov.br", cargo: "professor", vinculo: "concursado", disciplinas: ["Matemática"], turmas: ["9A", "9B"], ativo: true },
  { id: "2", nome: "Carlos Menezes", cpf: "234.567.890-12", matricula: "SP-110988", email: "carlos.menezes@edu.sp.gov.br", cargo: "professor", vinculo: "estatutario", disciplinas: ["Português"], turmas: ["7A", "7B", "8A"], ativo: true },
  { id: "3", nome: "Débora Nunes", cpf: "345.678.901-23", matricula: "SP-201044", email: "debora.nunes@edu.sp.gov.br", cargo: "coordenacao", vinculo: "concursado", disciplinas: [], turmas: [], ativo: true },
  { id: "4", nome: "Eduardo Silveira", cpf: "456.789.012-34", matricula: "SP-330211", email: "eduardo.silveira@edu.sp.gov.br", cargo: "professor", vinculo: "terceirizado", disciplinas: ["Física", "Química"], turmas: ["2EM-A", "3EM-A"], ativo: true },
  { id: "5", nome: "Fernanda Costa", cpf: "567.890.123-45", matricula: "SP-330555", email: "fernanda.costa@edu.sp.gov.br", cargo: "professor", vinculo: "concursado", disciplinas: ["História", "Geografia"], turmas: ["6A", "6B"], ativo: false },
  { id: "6", nome: "Gustavo Lopes", cpf: "678.901.234-56", matricula: "SP-401800", email: "gustavo.lopes@edu.sp.gov.br", cargo: "professor", vinculo: "contrato", disciplinas: ["Ed. Física"], turmas: ["6A", "6B", "7A", "7B"], ativo: true },
  { id: "7", nome: "Helena Martins", cpf: "789.012.345-67", matricula: "SP-402990", email: "helena.martins@edu.sp.gov.br", cargo: "professor", vinculo: "estatutario", disciplinas: ["Biologia"], turmas: ["1EM-A", "1EM-B"], ativo: true },
  { id: "8", nome: "Igor Ramos", cpf: "890.123.456-78", matricula: "SP-503311", email: "igor.ramos@edu.sp.gov.br", cargo: "apoio", vinculo: "terceirizado", disciplinas: [], turmas: [], ativo: true },
  { id: "9", nome: "Juliana Prado", cpf: "901.234.567-89", matricula: "SP-503455", email: "juliana.prado@edu.sp.gov.br", cargo: "professor", vinculo: "concursado", disciplinas: ["Inglês", "Artes"], turmas: ["8A", "8B"], ativo: true },
  { id: "10", nome: "Luciano Vargas", cpf: "012.345.678-90", matricula: "SP-600100", email: "luciano.vargas@edu.sp.gov.br", cargo: "direcao", vinculo: "concursado", disciplinas: [], turmas: [], ativo: true },
  { id: "11", nome: "Márcia Tavares", cpf: "111.222.333-44", matricula: "SP-600233", email: "marcia.tavares@edu.sp.gov.br", cargo: "secretaria", vinculo: "estatutario", disciplinas: [], turmas: [], ativo: true },
  { id: "12", nome: "Nilton Barcelos", cpf: "222.333.444-55", matricula: "SP-701001", email: "nilton.barcelos@edu.sp.gov.br", cargo: "professor", vinculo: "contrato", disciplinas: ["Ciências"], turmas: ["6A", "7A"], ativo: true },
];

const PAGE_SIZE = 8;

export function ProfissionaisPanel() {
  const [rows, setRows] = useState<Prof[]>(MOCK);
  const [q, setQ] = useState("");
  const [cargoFilter, setCargoFilter] = useState<string>("todos");
  const [vinculoFilter, setVinculoFilter] = useState<string>("todos");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => rows.filter((r) => {
    const matchQ = !q || [r.nome, r.cpf, r.matricula, r.email].join(" ").toLowerCase().includes(q.toLowerCase());
    const matchC = cargoFilter === "todos" || r.cargo === cargoFilter;
    const matchV = vinculoFilter === "todos" || r.vinculo === vinculoFilter;
    return matchQ && matchC && matchV;
  }), [rows, q, cargoFilter, vinculoFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold flex items-center gap-2"><Users className="h-4 w-4" /> Profissionais e Disciplinas</h2>
          <p className="text-sm text-muted-foreground mt-1">Corpo docente, coordenação e equipe de apoio da unidade.</p>
        </div>
        <NovoProfissionalDialog onAdd={(p) => setRows((r) => [p, ...r])} />
      </header>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row gap-3 md:items-end">
            <div className="flex-1 relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="pl-8" placeholder="Buscar por nome, CPF, matrícula ou e-mail" />
            </div>
            <div className="w-full md:w-48">
              <Label className="text-xs">Cargo</Label>
              <Select value={cargoFilter} onValueChange={(v) => { setCargoFilter(v); setPage(1); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {cargoValues.map((c) => <SelectItem key={c} value={c}>{CARGO_LABEL[c]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-48">
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
                <TableHead className="w-32">CPF</TableHead>
                <TableHead className="w-28">Matrícula</TableHead>
                <TableHead className="w-32">Cargo</TableHead>
                <TableHead className="w-32">Vínculo</TableHead>
                <TableHead>Disciplinas / Turmas</TableHead>
                <TableHead className="w-20">Status</TableHead>
                <TableHead className="w-16 text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="font-medium">{r.nome}</div>
                    <div className="text-[11px] text-muted-foreground">{r.email}</div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{r.cpf}</TableCell>
                  <TableCell className="font-mono text-xs">{r.matricula}</TableCell>
                  <TableCell><Badge variant="outline">{CARGO_LABEL[r.cargo]}</Badge></TableCell>
                  <TableCell>
                    <Badge variant={r.vinculo === "concursado" || r.vinculo === "estatutario" ? "default" : "secondary"}>
                      {VINC_LABEL[r.vinculo]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {r.disciplinas.map((d) => <Badge key={d} variant="secondary" className="text-[10px]">{d}</Badge>)}
                      {r.turmas.map((t) => <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>)}
                      {r.disciplinas.length === 0 && r.turmas.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={r.ativo ? "default" : "secondary"}>{r.ativo ? "Ativo" : "Inativo"}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => setRows((rs) => rs.filter((x) => x.id !== r.id))}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {pageRows.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-xs text-muted-foreground py-6">Nenhum profissional encontrado.</TableCell></TableRow>
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
    </div>
  );
}

function NovoProfissionalDialog({ onAdd }: { onAdd: (p: Prof) => void }) {
  const [open, setOpen] = useState(false);
  const form = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { nome: "", cpf: "", matricula: "", email: "", cargo: "professor", vinculo: "concursado", disciplinas: [], turmas: [] },
  });
  const disciplinas = form.watch("disciplinas");
  const turmas = form.watch("turmas");

  const submit = form.handleSubmit(async (v) => {
    await simulate(600);
    onAdd({ ...v, id: crypto.randomUUID(), ativo: true });
    toast.success(`${v.nome} cadastrado(a).`);
    form.reset();
    setOpen(false);
  });

  function toggle(arr: string[], key: "disciplinas" | "turmas", val: string) {
    const next = arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
    form.setValue(key, next, { shouldValidate: true });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Novo profissional</Button></DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Cadastrar profissional</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label className="text-xs">Nome completo</Label><Input {...form.register("nome")} />
              {form.formState.errors.nome && <p className="text-[11px] text-destructive mt-1">{form.formState.errors.nome.message}</p>}</div>
            <div><Label className="text-xs">CPF</Label><Input {...form.register("cpf")} placeholder="000.000.000-00" />
              {form.formState.errors.cpf && <p className="text-[11px] text-destructive mt-1">{form.formState.errors.cpf.message}</p>}</div>
            <div><Label className="text-xs">Matrícula</Label><Input {...form.register("matricula")} />
              {form.formState.errors.matricula && <p className="text-[11px] text-destructive mt-1">{form.formState.errors.matricula.message}</p>}</div>
            <div className="col-span-2"><Label className="text-xs">E-mail</Label><Input type="email" {...form.register("email")} />
              {form.formState.errors.email && <p className="text-[11px] text-destructive mt-1">{form.formState.errors.email.message}</p>}</div>
            <div>
              <Label className="text-xs">Cargo</Label>
              <Select value={form.watch("cargo")} onValueChange={(v: any) => form.setValue("cargo", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{cargoValues.map((c) => <SelectItem key={c} value={c}>{CARGO_LABEL[c]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Vínculo empregatício</Label>
              <Select value={form.watch("vinculo")} onValueChange={(v: any) => form.setValue("vinculo", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{vinculoValues.map((c) => <SelectItem key={c} value={c}>{VINC_LABEL[c]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs">Disciplinas</Label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {DISCIPLINAS.map((d) => (
                <button type="button" key={d} onClick={() => toggle(disciplinas, "disciplinas", d)}
                  className={`px-2 py-1 rounded-md text-xs border ${disciplinas.includes(d) ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}>
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs">Turmas vinculadas</Label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {TURMAS.map((t) => (
                <button type="button" key={t} onClick={() => toggle(turmas, "turmas", t)}
                  className={`px-2 py-1 rounded-md text-xs border font-mono ${turmas.includes(t) ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={form.formState.isSubmitting}>Cadastrar profissional</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
