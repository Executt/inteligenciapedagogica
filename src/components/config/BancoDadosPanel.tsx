import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Database, Loader2, Plug, Trash2, Plus } from "lucide-react";
import { simulate } from "./_shared";

const connSchema = z.object({
  nome: z.string().min(2, "Informe um nome"),
  uri: z.string().min(10, "URI inválida"),
  poolMax: z.coerce.number().min(1).max(500),
  ssl: z.boolean().default(true),
});
type ConnForm = z.infer<typeof connSchema>;

type Conn = ConnForm & { id: string; tipo: "relacional" | "vetorial"; status: "ok" | "erro" | "pendente" };

const MOCK: Conn[] = [
  { id: "r1", tipo: "relacional", nome: "Postgres Primário", uri: "postgres://app@db.edu-gov.sa-east-1:5432/edugov", poolMax: 120, ssl: true, status: "ok" },
  { id: "r2", tipo: "relacional", nome: "Réplica Leitura BI", uri: "postgres://ro@db-replica.edu-gov:5432/edugov", poolMax: 60, ssl: true, status: "ok" },
  { id: "v1", tipo: "vetorial", nome: "pgvector — Dossiês", uri: "postgres://app@db.edu-gov:5432/edugov?schema=vec", poolMax: 40, ssl: true, status: "ok" },
  { id: "v2", tipo: "vetorial", nome: "Qdrant — Provas", uri: "https://qdrant.cortex.svc:6333", poolMax: 20, ssl: true, status: "pendente" },
];

export function BancoDadosPanel() {
  const [conns, setConns] = useState<Conn[]>(MOCK);
  const [tipo, setTipo] = useState<"relacional" | "vetorial">("relacional");
  const [testing, setTesting] = useState<string | null>(null);

  const filtered = conns.filter((c) => c.tipo === tipo);

  const form = useForm<ConnForm>({
    resolver: zodResolver(connSchema),
    defaultValues: { nome: "", uri: "", poolMax: 50, ssl: true },
  });

  const onAdd = form.handleSubmit(async (values) => {
    await simulate(500);
    setConns((c) => [...c, { ...values, id: crypto.randomUUID(), tipo, status: "pendente" }]);
    form.reset({ nome: "", uri: "", poolMax: 50, ssl: true });
    toast.success("Conexão cadastrada.");
  });

  async function testar(id: string) {
    setTesting(id);
    try {
      await simulate(1100, undefined, 0.15);
      setConns((cs) => cs.map((c) => (c.id === id ? { ...c, status: "ok" } : c)));
      toast.success("Conexão estabelecida.");
    } catch (e: any) {
      setConns((cs) => cs.map((c) => (c.id === id ? { ...c, status: "erro" } : c)));
      toast.error(e.message ?? "Falha ao testar");
    } finally {
      setTesting(null);
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-base font-semibold flex items-center gap-2"><Database className="h-4 w-4" /> Banco de Dados</h2>
        <p className="text-sm text-muted-foreground mt-1">Conexões relacionais e vetoriais utilizadas pela plataforma. Credenciais reais permanecem no cofre.</p>
      </header>

      <Tabs value={tipo} onValueChange={(v) => setTipo(v as any)}>
        <TabsList>
          <TabsTrigger value="relacional">Relacional</TabsTrigger>
          <TabsTrigger value="vetorial">Vetorial</TabsTrigger>
        </TabsList>

        <TabsContent value={tipo} className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Nova conexão {tipo}</CardTitle>
              <CardDescription>URI, pool e SSL. Teste após salvar.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={onAdd} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                <div className="md:col-span-1">
                  <Label className="text-xs">Nome</Label>
                  <Input {...form.register("nome")} placeholder="Postgres Primário" />
                  {form.formState.errors.nome && <p className="text-[11px] text-destructive mt-1">{form.formState.errors.nome.message}</p>}
                </div>
                <div className="md:col-span-2">
                  <Label className="text-xs">URI de conexão</Label>
                  <Input {...form.register("uri")} placeholder={tipo === "vetorial" ? "https://qdrant.svc:6333" : "postgres://user@host:5432/db"} />
                  {form.formState.errors.uri && <p className="text-[11px] text-destructive mt-1">{form.formState.errors.uri.message}</p>}
                </div>
                <div>
                  <Label className="text-xs">Pool máx.</Label>
                  <Input type="number" {...form.register("poolMax")} />
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.watch("ssl")} onCheckedChange={(v) => form.setValue("ssl", v)} />
                  <span className="text-xs">SSL/TLS</span>
                </div>
                <div className="md:col-span-4 flex justify-end">
                  <Button type="submit" size="sm"><Plus className="h-4 w-4 mr-1" /> Adicionar conexão</Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Conexões cadastradas</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>URI</TableHead>
                    <TableHead className="w-20">Pool</TableHead>
                    <TableHead className="w-20">SSL</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                    <TableHead className="w-48 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.nome}</TableCell>
                      <TableCell className="font-mono text-xs truncate max-w-[280px]" title={c.uri}>{c.uri}</TableCell>
                      <TableCell>{c.poolMax}</TableCell>
                      <TableCell>{c.ssl ? "Sim" : "Não"}</TableCell>
                      <TableCell>
                        <Badge variant={c.status === "ok" ? "default" : c.status === "erro" ? "destructive" : "secondary"}>
                          {c.status === "ok" ? "Ativa" : c.status === "erro" ? "Falha" : "Pendente"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button size="sm" variant="outline" onClick={() => testar(c.id)} disabled={testing === c.id}>
                          {testing === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plug className="h-3.5 w-3.5" />}
                          <span className="ml-1">Testar</span>
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setConns((cs) => cs.filter((x) => x.id !== c.id))}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-6">Nenhuma conexão {tipo}.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
