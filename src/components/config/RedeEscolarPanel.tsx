import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { listEscolas, updateEscola, getRedeResumo } from "@/lib/core/escolas.functions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Pencil, School } from "lucide-react";

const TIPO_LABEL: Record<string, string> = {
  EM: "Escola Municipal",
  CEIM: "CEIM / Educação Infantil",
  JIM: "Jardim de Infância",
  CRECHE: "Creche",
  CASA_DA_CRIANCA: "Casa da Criança",
  CIEC: "CIEC",
  CAIC: "CAIC",
  CEM: "Centro Municipal",
  CEPT: "Centro Técnico e Profissional",
  CENTRO_EDUCACIONAL: "Centro Educacional",
  EJA_IDOSOS: "EJA — Idosos",
  EM_INDIGENA: "Escola Indígena",
  MUNICIPALIZADA: "Municipalizada",
  INSTITUTO: "Instituto conveniado",
  OUTRO: "Outro",
};

const ETAPA_LABEL: Record<string, string> = {
  infantil: "Educação Infantil",
  fundamental: "Ensino Fundamental",
  eja: "EJA",
  tecnico: "Técnico/Profissional",
};

export function RedeEscolarPanel() {
  const list = useServerFn(listEscolas);
  const resumoFn = useServerFn(getRedeResumo);
  const [busca, setBusca] = useState("");
  const [tipo, setTipo] = useState("todos");
  const [editando, setEditando] = useState<any | null>(null);

  const { data: escolas = [], isLoading } = useQuery({
    queryKey: ["core", "escolas"],
    queryFn: () => list({}),
  });
  const { data: resumo } = useQuery({ queryKey: ["core", "rede-resumo"], queryFn: () => resumoFn({}) });

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return (escolas as any[]).filter(
      (e) =>
        (tipo === "todos" || e.tipo_unidade === tipo) &&
        (!q || e.nome.toLowerCase().includes(q) || (e.bairro ?? "").toLowerCase().includes(q)),
    );
  }, [escolas, busca, tipo]);

  const tipos = useMemo(
    () => Array.from(new Set((escolas as any[]).map((e) => e.tipo_unidade))).sort(),
    [escolas],
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <School className="h-4 w-4" /> Rede Escolar — Dados Mestres
        </h2>
        <p className="text-sm text-muted-foreground">
          Fonte única de verdade das unidades da Secretaria. Importado da lista oficial da rede municipal.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="text-[11px] uppercase text-muted-foreground">Unidades</div>
          <div className="text-2xl font-semibold">{resumo?.total ?? "—"}</div>
        </Card>
        <Card className="p-3">
          <div className="text-[11px] uppercase text-muted-foreground">Ativas</div>
          <div className="text-2xl font-semibold">{resumo?.ativas ?? "—"}</div>
        </Card>
        <Card className="p-3">
          <div className="text-[11px] uppercase text-muted-foreground">Tipos de unidade</div>
          <div className="text-2xl font-semibold">{resumo?.porTipo.length ?? "—"}</div>
        </Card>
        <Card className="p-3">
          <div className="text-[11px] uppercase text-muted-foreground">Bairros atendidos</div>
          <div className="text-2xl font-semibold">{resumo?.porBairro.length ?? "—"}</div>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou bairro…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={tipo} onValueChange={setTipo}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            {tipos.map((t) => (
              <SelectItem key={t} value={t}>{TIPO_LABEL[t] ?? t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="text-xs text-muted-foreground">{filtradas.length} unidade(s)</div>
      </div>

      <div className="rounded-md border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Unidade</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Etapa</TableHead>
              <TableHead>Bairro</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-sm text-muted-foreground">Carregando…</TableCell></TableRow>
            )}
            {!isLoading && filtradas.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-sm text-muted-foreground">Nenhuma unidade encontrada.</TableCell></TableRow>
            )}
            {filtradas.map((e) => (
              <TableRow key={e.id}>
                <TableCell>
                  <div className="font-medium">{e.nome}</div>
                  <div className="text-xs text-muted-foreground">{e.endereco}</div>
                </TableCell>
                <TableCell className="text-xs">{TIPO_LABEL[e.tipo_unidade] ?? e.tipo_unidade}</TableCell>
                <TableCell className="text-xs">{ETAPA_LABEL[e.etapa_predominante] ?? e.etapa_predominante}</TableCell>
                <TableCell className="text-xs">{e.bairro ?? "—"}</TableCell>
                <TableCell>
                  {e.situacao === "ativa" ? (
                    <Badge variant="outline" className="border-emerald-600 text-emerald-700">Ativa</Badge>
                  ) : (
                    <Badge variant="outline" className="border-destructive text-destructive">Inativa</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => setEditando(e)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <EditarEscolaDialog escola={editando} onClose={() => setEditando(null)} />
    </div>
  );
}

function EditarEscolaDialog({ escola, onClose }: { escola: any | null; onClose: () => void }) {
  const qc = useQueryClient();
  const update = useServerFn(updateEscola);
  const [form, setForm] = useState({ inep: "", telefone: "", email: "", diretor: "", situacao: "ativa" });
  const [carregado, setCarregado] = useState<string | null>(null);

  if (escola && carregado !== escola.id) {
    setCarregado(escola.id);
    setForm({
      inep: escola.inep ?? "",
      telefone: escola.telefone ?? "",
      email: escola.email ?? "",
      diretor: escola.diretor ?? "",
      situacao: escola.situacao ?? "ativa",
    });
  }

  const m = useMutation({
    mutationFn: () =>
      update({
        data: {
          id: escola.id,
          inep: form.inep || null,
          telefone: form.telefone || null,
          email: form.email || null,
          diretor: form.diretor || null,
          situacao: form.situacao as "ativa" | "inativa",
        },
      }),
    onSuccess: () => {
      toast.success("Unidade atualizada.");
      qc.invalidateQueries({ queryKey: ["core"] });
      onClose();
    },
    onError: (err: any) => toast.error(err.message ?? "Falha ao atualizar."),
  });

  return (
    <Dialog open={Boolean(escola)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="text-base">{escola?.nome}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Código INEP</Label>
            <Input value={form.inep} onChange={(e) => setForm({ ...form, inep: e.target.value })} className="mt-1" />
          </div>
          <div>
            <Label>Diretor(a)</Label>
            <Input value={form.diretor} onChange={(e) => setForm({ ...form, diretor: e.target.value })} className="mt-1" />
          </div>
          <div>
            <Label>Telefone</Label>
            <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} className="mt-1" />
          </div>
          <div>
            <Label>E-mail</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1" />
          </div>
          <div>
            <Label>Situação</Label>
            <Select value={form.situacao} onValueChange={(v) => setForm({ ...form, situacao: v })}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ativa">Ativa</SelectItem>
                <SelectItem value="inativa">Inativa</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => m.mutate()} disabled={m.isPending}>
            {m.isPending ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
