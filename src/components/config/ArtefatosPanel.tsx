import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package, Plus, Trash2, Cloud, HardDrive, Loader2, Plug } from "lucide-react";
import { simulate } from "./_shared";

type Provider = {
  id: string;
  nome: string;
  tipo: "s3" | "minio" | "oci" | "gcs";
  endpoint: string;
  regiao: string;
  keyRef: string;
  status: "ok" | "erro" | "pendente";
};

type Bucket = {
  id: string;
  providerId: string;
  nome: string;
  finalidade: string;
  versionamento: boolean;
  retencaoDias: number;
  publico: boolean;
};

const MOCK_PROVIDERS: Provider[] = [
  { id: "p1", nome: "AWS S3 (SP)", tipo: "s3", endpoint: "s3.sa-east-1.amazonaws.com", regiao: "sa-east-1", keyRef: "AWS_ACCESS_KEY", status: "ok" },
  { id: "p2", nome: "MinIO Local", tipo: "minio", endpoint: "minio.cortex.svc:9000", regiao: "on-prem", keyRef: "MINIO_ROOT_KEY", status: "ok" },
  { id: "p3", nome: "OCI Object Storage", tipo: "oci", endpoint: "objectstorage.sa-saopaulo-1.oci.customer-oci.com", regiao: "sa-saopaulo-1", keyRef: "OCI_API_KEY", status: "pendente" },
];

const MOCK_BUCKETS: Bucket[] = [
  { id: "b1", providerId: "p1", nome: "dossies-alunos", finalidade: "PDFs governamentais e dossiês", versionamento: true, retencaoDias: 1825, publico: false },
  { id: "b2", providerId: "p2", nome: "provas-imagens", finalidade: "Imagens de provas e redações digitalizadas", versionamento: true, retencaoDias: 730, publico: false },
  { id: "b3", providerId: "p1", nome: "artefatos-cortex", finalidade: "Modelos, tokenizers e binários do Córtex", versionamento: true, retencaoDias: 365, publico: false },
];

const TIPO_LABEL: Record<Provider["tipo"], string> = { s3: "AWS S3", minio: "MinIO", oci: "OCI Object Storage", gcs: "Google GCS" };

export function ArtefatosPanel() {
  const [providers, setProviders] = useState<Provider[]>(MOCK_PROVIDERS);
  const [buckets, setBuckets] = useState<Bucket[]>(MOCK_BUCKETS);
  const [testing, setTesting] = useState<string | null>(null);

  async function testar(id: string) {
    setTesting(id);
    try {
      await simulate(900, undefined, 0.1);
      setProviders((ps) => ps.map((p) => (p.id === id ? { ...p, status: "ok" } : p)));
      toast.success("Provider acessível.");
    } catch (e: any) {
      setProviders((ps) => ps.map((p) => (p.id === id ? { ...p, status: "erro" } : p)));
      toast.error(e.message);
    } finally { setTesting(null); }
  }

  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-base font-semibold flex items-center gap-2"><Package className="h-4 w-4" /> Repositórios e Artefatos</h2>
        <p className="text-sm text-muted-foreground mt-1">Providers de storage e buckets virtuais direcionados por finalidade.</p>
      </header>

      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-sm flex items-center gap-2"><Cloud className="h-4 w-4" /> Providers de Storage</CardTitle>
            <CardDescription>Cadastre múltiplos provedores (nuvem e on-premise).</CardDescription>
          </div>
          <NovoProvider onAdd={(p) => setProviders((ps) => [...ps, p])} />
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Endpoint</TableHead>
                <TableHead>Região</TableHead>
                <TableHead>Chave (ref.)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {providers.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.nome}</TableCell>
                  <TableCell><Badge variant="outline">{TIPO_LABEL[p.tipo]}</Badge></TableCell>
                  <TableCell className="font-mono text-xs">{p.endpoint}</TableCell>
                  <TableCell className="text-xs">{p.regiao}</TableCell>
                  <TableCell className="font-mono text-xs">{p.keyRef}</TableCell>
                  <TableCell>
                    <Badge variant={p.status === "ok" ? "default" : p.status === "erro" ? "destructive" : "secondary"}>
                      {p.status === "ok" ? "Ativo" : p.status === "erro" ? "Falha" : "Pendente"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="sm" variant="outline" onClick={() => testar(p.id)} disabled={testing === p.id}>
                      {testing === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plug className="h-3.5 w-3.5" />}
                      <span className="ml-1">Testar</span>
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setProviders((ps) => ps.filter((x) => x.id !== p.id)); setBuckets((bs) => bs.filter((b) => b.providerId !== p.id)); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-sm flex items-center gap-2"><HardDrive className="h-4 w-4" /> Buckets / Artefatos</CardTitle>
            <CardDescription>Direcionamento por finalidade, versionamento e retenção.</CardDescription>
          </div>
          <NovoBucket providers={providers} onAdd={(b) => setBuckets((bs) => [...bs, b])} />
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bucket</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Finalidade</TableHead>
                <TableHead className="w-28">Versionamento</TableHead>
                <TableHead className="w-24">Retenção</TableHead>
                <TableHead className="w-24">Acesso</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {buckets.map((b) => {
                const p = providers.find((x) => x.id === b.providerId);
                return (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono text-xs">{b.nome}</TableCell>
                    <TableCell className="text-xs">{p?.nome ?? "—"}</TableCell>
                    <TableCell className="text-xs">{b.finalidade}</TableCell>
                    <TableCell>
                      <Switch checked={b.versionamento} onCheckedChange={(v) => setBuckets((bs) => bs.map((x) => x.id === b.id ? { ...x, versionamento: v } : x))} />
                    </TableCell>
                    <TableCell className="text-xs">{b.retencaoDias}d</TableCell>
                    <TableCell><Badge variant={b.publico ? "destructive" : "outline"}>{b.publico ? "Público" : "Privado"}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => setBuckets((bs) => bs.filter((x) => x.id !== b.id))}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function NovoProvider({ onAdd }: { onAdd: (p: Provider) => void }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<Omit<Provider, "id" | "status">>({ nome: "", tipo: "s3", endpoint: "", regiao: "", keyRef: "" });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Novo provider</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Cadastrar provider</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label className="text-xs">Nome</Label><Input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} /></div>
          <div>
            <Label className="text-xs">Tipo</Label>
            <Select value={f.tipo} onValueChange={(v: any) => setF({ ...f, tipo: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="s3">AWS S3</SelectItem>
                <SelectItem value="minio">MinIO</SelectItem>
                <SelectItem value="oci">OCI</SelectItem>
                <SelectItem value="gcs">GCS</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">Endpoint</Label><Input value={f.endpoint} onChange={(e) => setF({ ...f, endpoint: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Região</Label><Input value={f.regiao} onChange={(e) => setF({ ...f, regiao: e.target.value })} /></div>
            <div><Label className="text-xs">Chave (ref. secret)</Label><Input value={f.keyRef} onChange={(e) => setF({ ...f, keyRef: e.target.value })} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={async () => { await simulate(400); onAdd({ ...f, id: crypto.randomUUID(), status: "pendente" }); setOpen(false); toast.success("Provider cadastrado."); }}>Cadastrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NovoBucket({ providers, onAdd }: { providers: Provider[]; onAdd: (b: Bucket) => void }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<Omit<Bucket, "id">>({ providerId: providers[0]?.id ?? "", nome: "", finalidade: "", versionamento: true, retencaoDias: 365, publico: false });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-1" /> Novo bucket</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo bucket virtual</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label className="text-xs">Nome do bucket</Label><Input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} placeholder="dossies-alunos" /></div>
          <div>
            <Label className="text-xs">Provider</Label>
            <Select value={f.providerId} onValueChange={(v) => setF({ ...f, providerId: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{providers.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">Finalidade</Label><Input value={f.finalidade} onChange={(e) => setF({ ...f, finalidade: e.target.value })} placeholder="PDFs governamentais" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Retenção (dias)</Label><Input type="number" value={f.retencaoDias} onChange={(e) => setF({ ...f, retencaoDias: Number(e.target.value) })} /></div>
            <div className="flex items-end gap-4">
              <div className="flex items-center gap-2"><Switch checked={f.versionamento} onCheckedChange={(v) => setF({ ...f, versionamento: v })} /><span className="text-xs">Versionar</span></div>
              <div className="flex items-center gap-2"><Switch checked={f.publico} onCheckedChange={(v) => setF({ ...f, publico: v })} /><span className="text-xs">Público</span></div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={async () => { await simulate(400); onAdd({ ...f, id: crypto.randomUUID() }); setOpen(false); toast.success("Bucket criado."); }}>Criar bucket</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
