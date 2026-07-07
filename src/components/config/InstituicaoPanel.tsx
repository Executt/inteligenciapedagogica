import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building2, Upload, Save, Loader2, Plus, Trash2, Calendar } from "lucide-react";
import { simulate } from "./_shared";

const schema = z.object({
  nome: z.string().min(3, "Informe o nome"),
  cnpj: z.string().regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, "Formato: 00.000.000/0000-00"),
  inep: z.string().regex(/^\d{8}$/, "Código INEP tem 8 dígitos"),
  cep: z.string().min(8),
  logradouro: z.string().min(3),
  cidade: z.string().min(2),
  uf: z.string().length(2, "UF com 2 letras"),
  telefone: z.string().min(8),
  email: z.string().email(),
  anoLetivo: z.coerce.number().min(2020).max(2099),
  divisao: z.enum(["bimestre", "trimestre", "semestre"]),
  diasLetivos: z.coerce.number().min(180).max(220),
});
type Form = z.infer<typeof schema>;

type Feriado = { id: string; data: string; descricao: string };

const MOCK_FERIADOS: Feriado[] = [
  { id: "f1", data: "2026-02-16", descricao: "Carnaval (recesso)" },
  { id: "f2", data: "2026-04-03", descricao: "Sexta-feira Santa" },
  { id: "f3", data: "2026-04-21", descricao: "Tiradentes" },
  { id: "f4", data: "2026-09-07", descricao: "Independência" },
  { id: "f5", data: "2026-11-15", descricao: "Proclamação da República" },
];

export function InstituicaoPanel() {
  const [logo, setLogo] = useState<string | null>(null);
  const [feriados, setFeriados] = useState<Feriado[]>(MOCK_FERIADOS);
  const [novoFeriado, setNovoFeriado] = useState({ data: "", descricao: "" });
  const [saving, setSaving] = useState(false);

  const form = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      nome: "EE Prof. Anísio Teixeira",
      cnpj: "12.345.678/0001-90",
      inep: "35012345",
      cep: "01310-100",
      logradouro: "Av. Paulista, 1000 — Bela Vista",
      cidade: "São Paulo",
      uf: "SP",
      telefone: "(11) 3333-4444",
      email: "secretaria@ee-anisio.sp.gov.br",
      anoLetivo: 2026,
      divisao: "bimestre",
      diasLetivos: 200,
    },
  });

  const onSubmit = form.handleSubmit(async () => {
    setSaving(true);
    await simulate(900);
    setSaving(false);
    toast.success("Dados da instituição atualizados.");
  });

  function handleLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setLogo(url);
    toast.success("Logomarca carregada.");
  }

  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-base font-semibold flex items-center gap-2"><Building2 className="h-4 w-4" /> Instituição Escolar</h2>
        <p className="text-sm text-muted-foreground mt-1">Metadados oficiais da unidade, identidade visual e calendário letivo.</p>
      </header>

      <form onSubmit={onSubmit} className="space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3"><CardTitle className="text-sm">Identidade visual</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="aspect-square rounded-lg border-2 border-dashed flex items-center justify-center bg-muted/30 overflow-hidden">
                {logo ? <img src={logo} alt="Logomarca" className="object-contain w-full h-full" /> : (
                  <div className="text-center text-xs text-muted-foreground p-4">
                    <Building2 className="h-10 w-10 mx-auto mb-2 opacity-40" />
                    Nenhuma logomarca carregada
                  </div>
                )}
              </div>
              <label className="block">
                <input type="file" accept="image/*" className="hidden" onChange={handleLogo} />
                <Button type="button" variant="outline" size="sm" className="w-full" asChild>
                  <span><Upload className="h-3.5 w-3.5 mr-1" /> Carregar logomarca</span>
                </Button>
              </label>
              <p className="text-[11px] text-muted-foreground">PNG/SVG transparente, mín. 512×512px.</p>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="pb-3"><CardTitle className="text-sm">Dados oficiais</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2"><Label className="text-xs">Nome da instituição</Label><Input {...form.register("nome")} />
                {form.formState.errors.nome && <p className="text-[11px] text-destructive mt-1">{form.formState.errors.nome.message}</p>}</div>
              <div><Label className="text-xs">CNPJ</Label><Input {...form.register("cnpj")} />
                {form.formState.errors.cnpj && <p className="text-[11px] text-destructive mt-1">{form.formState.errors.cnpj.message}</p>}</div>
              <div><Label className="text-xs">Código INEP</Label><Input {...form.register("inep")} />
                {form.formState.errors.inep && <p className="text-[11px] text-destructive mt-1">{form.formState.errors.inep.message}</p>}</div>
              <div className="md:col-span-2"><Label className="text-xs">Endereço</Label><Input {...form.register("logradouro")} /></div>
              <div><Label className="text-xs">CEP</Label><Input {...form.register("cep")} /></div>
              <div><Label className="text-xs">Cidade</Label><Input {...form.register("cidade")} /></div>
              <div><Label className="text-xs">UF</Label><Input maxLength={2} {...form.register("uf")} className="uppercase" /></div>
              <div><Label className="text-xs">Telefone</Label><Input {...form.register("telefone")} /></div>
              <div className="md:col-span-2"><Label className="text-xs">E-mail institucional</Label><Input type="email" {...form.register("email")} />
                {form.formState.errors.email && <p className="text-[11px] text-destructive mt-1">{form.formState.errors.email.message}</p>}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><Calendar className="h-4 w-4" /> Calendário letivo</CardTitle>
            <CardDescription>Configuração do ano vigente, divisão pedagógica e feriados/recessos.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div><Label className="text-xs">Ano letivo</Label><Input type="number" {...form.register("anoLetivo")} /></div>
              <div>
                <Label className="text-xs">Divisão</Label>
                <Select value={form.watch("divisao")} onValueChange={(v: any) => form.setValue("divisao", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bimestre">Bimestral (4)</SelectItem>
                    <SelectItem value="trimestre">Trimestral (3)</SelectItem>
                    <SelectItem value="semestre">Semestral (2)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Dias letivos</Label><Input type="number" {...form.register("diasLetivos")} /></div>
            </div>

            <div className="border rounded-lg">
              <div className="p-3 flex items-end gap-2 border-b bg-muted/30">
                <div className="flex-1"><Label className="text-xs">Data</Label><Input type="date" value={novoFeriado.data} onChange={(e) => setNovoFeriado({ ...novoFeriado, data: e.target.value })} /></div>
                <div className="flex-[2]"><Label className="text-xs">Descrição</Label><Input value={novoFeriado.descricao} onChange={(e) => setNovoFeriado({ ...novoFeriado, descricao: e.target.value })} placeholder="Feriado / recesso" /></div>
                <Button type="button" size="sm" onClick={() => {
                  if (!novoFeriado.data || !novoFeriado.descricao) return;
                  setFeriados((fs) => [...fs, { id: crypto.randomUUID(), ...novoFeriado }]);
                  setNovoFeriado({ data: "", descricao: "" });
                }}><Plus className="h-3.5 w-3.5 mr-1" /> Adicionar</Button>
              </div>
              <Table>
                <TableHeader><TableRow><TableHead className="w-32">Data</TableHead><TableHead>Descrição</TableHead><TableHead className="w-20 text-right">Ação</TableHead></TableRow></TableHeader>
                <TableBody>
                  {feriados.sort((a, b) => a.data.localeCompare(b.data)).map((f) => (
                    <TableRow key={f.id}>
                      <TableCell className="font-mono text-xs">{new Date(f.data).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell>{f.descricao}</TableCell>
                      <TableCell className="text-right"><Button type="button" size="sm" variant="ghost" onClick={() => setFeriados((fs) => fs.filter((x) => x.id !== f.id))}><Trash2 className="h-3.5 w-3.5" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
            Salvar instituição
          </Button>
        </div>
      </form>
    </div>
  );
}
