import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { fetchEscolas, fetchTurmas, fetchAlunos } from "@/lib/api";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/entidades")({ component: Entidades });

const escolaSchema = z.object({
  nome: z.string().min(3, "Mínimo 3 caracteres").max(120),
  codigoInep: z.string().regex(/^\d{8}$/, "INEP deve conter 8 dígitos"),
  municipio: z.string().min(2).max(80),
});
const turmaSchema = z.object({
  nome: z.string().min(1).max(20),
  ano: z.string().min(1).max(20),
  turno: z.enum(["Manhã", "Tarde", "Noite"]),
});
const alunoSchema = z.object({
  nome: z.string().min(3).max(120),
  matricula: z.string().regex(/^\d{6,12}$/, "6 a 12 dígitos"),
  responsavel: z.string().min(3).max(120),
});

function Entidades() {
  return (
    <AppShell>
      <div className="p-8 max-w-[1400px] mx-auto">
        <PageHeader title="Gestão de Entidades" subtitle="Cadastro e manutenção de escolas, turmas e alunos da rede." />
        <Tabs defaultValue="escolas">
          <TabsList>
            <TabsTrigger value="escolas">Escolas</TabsTrigger>
            <TabsTrigger value="turmas">Turmas</TabsTrigger>
            <TabsTrigger value="alunos">Alunos</TabsTrigger>
          </TabsList>
          <TabsContent value="escolas" className="mt-4"><EscolasTab /></TabsContent>
          <TabsContent value="turmas" className="mt-4"><TurmasTab /></TabsContent>
          <TabsContent value="alunos" className="mt-4"><AlunosTab /></TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

function EscolasTab() {
  const { data = [] } = useQuery({ queryKey: ["escolas"], queryFn: fetchEscolas });
  const form = useForm<z.infer<typeof escolaSchema>>({ resolver: zodResolver(escolaSchema), defaultValues: { nome: "", codigoInep: "", municipio: "" } });

  return (
    <div className="grid grid-cols-3 gap-4">
      <Card className="col-span-2">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Escolas cadastradas ({data.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Nome</TableHead><TableHead>INEP</TableHead><TableHead>Município</TableHead>
              <TableHead className="text-right">Alunos</TableHead><TableHead className="text-right">Turmas</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {data.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.nome}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{e.codigoInep}</TableCell>
                  <TableCell>{e.municipio}</TableCell>
                  <TableCell className="text-right">{e.totalAlunos}</TableCell>
                  <TableCell className="text-right">{e.totalTurmas}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Nova Escola</CardTitle></CardHeader>
        <CardContent>
          <form
            className="space-y-3"
            onSubmit={form.handleSubmit((v) => { toast.success(`Escola "${v.nome}" cadastrada`); form.reset(); })}
          >
            <Field label="Nome" error={form.formState.errors.nome?.message}>
              <Input {...form.register("nome")} placeholder="EMEF ..." />
            </Field>
            <Field label="Código INEP" error={form.formState.errors.codigoInep?.message}>
              <Input {...form.register("codigoInep")} placeholder="35123456" />
            </Field>
            <Field label="Município" error={form.formState.errors.municipio?.message}>
              <Input {...form.register("municipio")} placeholder="São Paulo - SP" />
            </Field>
            <Button type="submit" className="w-full"><Plus className="h-4 w-4" /> Cadastrar</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function TurmasTab() {
  const { data = [] } = useQuery({ queryKey: ["turmas"], queryFn: () => fetchTurmas() });
  const form = useForm<z.infer<typeof turmaSchema>>({ resolver: zodResolver(turmaSchema), defaultValues: { nome: "", ano: "", turno: "Manhã" } });
  return (
    <div className="grid grid-cols-3 gap-4">
      <Card className="col-span-2">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Turmas ({data.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Turma</TableHead><TableHead>Ano</TableHead><TableHead>Turno</TableHead>
              <TableHead className="text-right">Alunos</TableHead><TableHead className="text-right">Média</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {data.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.nome}</TableCell>
                  <TableCell>{t.ano}</TableCell>
                  <TableCell><Badge variant="outline">{t.turno}</Badge></TableCell>
                  <TableCell className="text-right">{t.totalAlunos}</TableCell>
                  <TableCell className="text-right font-mono">{t.mediaGeral.toFixed(1)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Nova Turma</CardTitle></CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={form.handleSubmit((v) => { toast.success(`Turma ${v.nome} criada`); form.reset(); })}>
            <Field label="Nome" error={form.formState.errors.nome?.message}><Input {...form.register("nome")} placeholder="5º A" /></Field>
            <Field label="Ano" error={form.formState.errors.ano?.message}><Input {...form.register("ano")} placeholder="5º ano" /></Field>
            <Field label="Turno">
              <select {...form.register("turno")} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                <option>Manhã</option><option>Tarde</option><option>Noite</option>
              </select>
            </Field>
            <Button type="submit" className="w-full"><Plus className="h-4 w-4" /> Cadastrar</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function AlunosTab() {
  const { data = [] } = useQuery({ queryKey: ["alunos"], queryFn: () => fetchAlunos() });
  const form = useForm<z.infer<typeof alunoSchema>>({ resolver: zodResolver(alunoSchema), defaultValues: { nome: "", matricula: "", responsavel: "" } });
  return (
    <div className="grid grid-cols-3 gap-4">
      <Card className="col-span-2">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Alunos ({data.length})</CardTitle></CardHeader>
        <CardContent className="max-h-[560px] overflow-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Nome</TableHead><TableHead>Matrícula</TableHead><TableHead>Responsável</TableHead>
              <TableHead className="text-right">Média</TableHead><TableHead>Risco</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {data.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.nome}</TableCell>
                  <TableCell className="font-mono text-xs">{a.matricula}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{a.responsavel}</TableCell>
                  <TableCell className="text-right font-mono">{a.mediaGeral}</TableCell>
                  <TableCell>
                    <Badge variant={a.risco === "alto" ? "destructive" : a.risco === "medio" ? "secondary" : "outline"}>
                      {a.risco}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Novo Aluno</CardTitle></CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={form.handleSubmit((v) => { toast.success(`Aluno ${v.nome} cadastrado`); form.reset(); })}>
            <Field label="Nome completo" error={form.formState.errors.nome?.message}><Input {...form.register("nome")} /></Field>
            <Field label="Matrícula" error={form.formState.errors.matricula?.message}><Input {...form.register("matricula")} placeholder="202500001" /></Field>
            <Field label="Responsável" error={form.formState.errors.responsavel?.message}><Input {...form.register("responsavel")} /></Field>
            <Button type="submit" className="w-full"><Plus className="h-4 w-4" /> Cadastrar</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
