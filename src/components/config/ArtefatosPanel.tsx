import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getSetting, setSetting } from "@/lib/admin/settings.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package, Plus, Trash2, Cloud, HardDrive, Loader2, Plug, Save, Info } from "lucide-react";
import { simulate } from "./_shared";

type ProviderTipo = "s3" | "minio" | "oci" | "gcs" | "onedrive" | "gdrive" | "ftp" | "sftp";

type Provider = {
  id: string;
  nome: string;
  tipo: ProviderTipo;
  endpoint: string;
  regiao: string;
  keyRef: string;
  usuario?: string;
  porta?: number;
  caminhoBase?: string;
  tenantId?: string;
  driveId?: string;
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

type Persisted = { providers: Provider[]; buckets: Bucket[] };

const SETTING_KEY = "artefatos.repositorios";

const TIPO_LABEL: Record<ProviderTipo, string> = {
  s3: "AWS S3",
  minio: "MinIO",
  oci: "OCI Object Storage",
  gcs: "Google GCS",
  onedrive: "Microsoft OneDrive",
  gdrive: "Google Drive",
  ftp: "FTP",
  sftp: "SFTP",
};

const DEFAULT_STATE: Persisted = {
  providers: [
    { id: "p1", nome: "AWS S3 (SP)", tipo: "s3", endpoint: "s3.sa-east-1.amazonaws.com", regiao: "sa-east-1", keyRef: "AWS_ACCESS_KEY", status: "ok" },
    { id: "p2", nome: "MinIO Local", tipo: "minio", endpoint: "minio.cortex.svc:9000", regiao: "on-prem", keyRef: "MINIO_ROOT_KEY", status: "ok" },
    { id: "p3", nome: "OneDrive Secretaria", tipo: "onedrive", endpoint: "graph.microsoft.com", regiao: "global", keyRef: "ONEDRIVE_CLIENT_SECRET", tenantId: "", driveId: "", status: "pendente" },
    { id: "p4", nome: "Google Drive Pedagógico", tipo: "gdrive", endpoint: "www.googleapis.com/drive/v3", regiao: "global", keyRef: "GDRIVE_SERVICE_ACCOUNT", caminhoBase: "/EduGov", status: "pendente" },
    { id: "p5", nome: "SFTP Compartilhado", tipo: "sftp", endpoint: "sftp.rede.edu.br", regiao: "on-prem", keyRef: "SFTP_PRIVATE_KEY", usuario: "edugov", porta: 22, caminhoBase: "/dados/edu-gov", status: "pendente" },
  ],
  buckets: [
    { id: "b1", providerId: "p1", nome: "dossies-alunos", finalidade: "PDFs governamentais e dossiês", versionamento: true, retencaoDias: 1825, publico: false },
    { id: "b2", providerId: "p2", nome: "provas-imagens", finalidade: "Imagens de provas e redações digitalizadas", versionamento: true, retencaoDias: 730, publico: false },
    { id: "b3", providerId: "p5", nome: "compartilhamento-sftp", finalidade: "Troca de arquivos com secretarias regionais", versionamento: false, retencaoDias: 180, publico: false },
  ],
};

export function ArtefatosPanel() {
  const qc = useQueryClient();
  const get = useServerFn(getSetting);
  const set = useServerFn(setSetting);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "settings", SETTING_KEY],
    queryFn: () => get({ data: { chave: SETTING_KEY } }),
  });

  const [providers, setProviders] = useState<Provider[]>([]);
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [dirty, setDirty] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

  useEffect(() => {
    const persisted = (data as Persisted | null) ?? null;
    if (persisted && Array.isArray(persisted.providers)) {
      setProviders(persisted.providers);
      setBuckets(persisted.buckets ?? []);
    } else {
      setProviders(DEFAULT_STATE.providers);
      setBuckets(DEFAULT_STATE.buckets);
    }
    setDirty(false);
  }, [data]);

  const save = useMutation({
    mutationFn: () => set({ data: { chave: SETTING_KEY, valor: { providers, buckets } } }),
    onSuccess: () => {
      toast.success("Repositórios salvos com persistência de dados.");
      setDirty(false);
      qc.invalidateQueries({ queryKey: ["admin", "settings", SETTING_KEY] });
    },
    onError: (e: any) => toast.error(e.message ?? "Falha ao salvar"),
  });

  function mutateProviders(fn: (ps: Provider[]) => Provider[]) {
    setProviders((ps) => fn(ps));
    setDirty(true);
  }
  function mutateBuckets(fn: (bs: Bucket[]) => Bucket[]) {
    setBuckets((bs) => fn(bs));
    setDirty(true);
  }

  async function testar(id: string) {
    setTesting(id);
    try {
      await simulate(900, undefined, 0.1);
      mutateProviders((ps) => ps.map((p) => (p.id === id ? { ...p, status: "ok" } : p)));
      toast.success("Provider acessível.");
    } catch (e: any) {
      mutateProviders((ps) => ps.map((p) => (p.id === id ? { ...p, status: "erro" } : p)));
      toast.error(e.message);
    } finally { setTesting(null); }
  }

  const totalPorTipo = useMemo(() => {
    const c: Partial<Record<ProviderTipo, number>> = {};
    for (const p of providers) c[p.tipo] = (c[p.tipo] ?? 0) + 1;
    return c;
  }, [providers]);

  if (isLoading) return <div className="text-sm text-muted-foreground">Carregando repositórios…</div>;

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold flex items-center gap-2"><Package className="h-4 w-4" /> Repositórios e Artefatos</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Object storage (S3/MinIO/OCI/GCS), armazenamento em nuvem colaborativo (OneDrive, Google Drive) e compartilhamentos locais via FTP/SFTP. As configurações são persistidas no banco de dados da aplicação.
          </p>
        </div>
        <Button onClick={() => save.mutate()} disabled={!dirty || save.isPending}>
          {save.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
          {dirty ? "Salvar alterações" : "Sem alterações"}
        </Button>
      </header>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs">
          Segredos (chaves de API, senhas, chaves privadas) devem ser cadastrados no cofre e referenciados pelo nome (campo <span className="font-mono">Chave (ref.)</span>). Nenhuma credencial é armazenada em texto claro nesta tela.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-sm flex items-center gap-2"><Cloud className="h-4 w-4" /> Providers de Storage</CardTitle>
            <CardDescription>
              {providers.length} cadastrado(s) — {Object.entries(totalPorTipo).map(([k, v]) => `${TIPO_LABEL[k as ProviderTipo]}: ${v}`).join(" · ") || "nenhum"}
            </CardDescription>
          </div>
          <NovoProvider onAdd={(p) => mutateProviders((ps) => [...ps, p])} />
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Endpoint / Host</TableHead>
                <TableHead>Detalhes</TableHead>
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
                  <TableCell className="font-mono text-xs">
                    {p.endpoint}{p.porta ? `:${p.porta}` : ""}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {p.tipo === "onedrive" && <>Tenant: <span className="font-mono">{p.tenantId || "—"}</span></>}
                    {p.tipo === "gdrive" && <>Base: <span className="font-mono">{p.caminhoBase || "/"}</span></>}
                    {(p.tipo === "ftp" || p.tipo === "sftp") && <>Usuário: <span className="font-mono">{p.usuario || "—"}</span> · <span className="font-mono">{p.caminhoBase || "/"}</span></>}
                    {(p.tipo === "s3" || p.tipo === "minio" || p.tipo === "oci" || p.tipo === "gcs") && <>Região: <span className="font-mono">{p.regiao || "—"}</span></>}
                  </TableCell>
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
                    <Button size="sm" variant="ghost" onClick={() => {
                      mutateProviders((ps) => ps.filter((x) => x.id !== p.id));
                      mutateBuckets((bs) => bs.filter((b) => b.providerId !== p.id));
                    }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {providers.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-6">Nenhum provider cadastrado.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-sm flex items-center gap-2"><HardDrive className="h-4 w-4" /> Buckets / Diretórios</CardTitle>
            <CardDescription>Direcionamento por finalidade, versionamento e retenção. Para OneDrive/Drive/FTP o campo representa a pasta base.</CardDescription>
          </div>
          <NovoBucket providers={providers} onAdd={(b) => mutateBuckets((bs) => [...bs, b])} />
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bucket / Pasta</TableHead>
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
                    <TableCell className="text-xs">{p ? `${p.nome} · ${TIPO_LABEL[p.tipo]}` : "—"}</TableCell>
                    <TableCell className="text-xs">{b.finalidade}</TableCell>
                    <TableCell>
                      <Switch checked={b.versionamento} onCheckedChange={(v) => mutateBuckets((bs) => bs.map((x) => x.id === b.id ? { ...x, versionamento: v } : x))} />
                    </TableCell>
                    <TableCell className="text-xs">{b.retencaoDias}d</TableCell>
                    <TableCell><Badge variant={b.publico ? "destructive" : "outline"}>{b.publico ? "Público" : "Privado"}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => mutateBuckets((bs) => bs.filter((x) => x.id !== b.id))}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {buckets.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-6">Nenhum bucket/pasta cadastrado.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

type NewProviderForm = Omit<Provider, "id" | "status">;

const TIPO_DEFAULTS: Record<ProviderTipo, Partial<NewProviderForm>> = {
  s3:       { endpoint: "s3.sa-east-1.amazonaws.com", regiao: "sa-east-1", keyRef: "AWS_ACCESS_KEY" },
  minio:    { endpoint: "minio.local:9000", regiao: "on-prem", keyRef: "MINIO_ROOT_KEY" },
  oci:      { endpoint: "objectstorage.sa-saopaulo-1.oci.oraclecloud.com", regiao: "sa-saopaulo-1", keyRef: "OCI_API_KEY" },
  gcs:      { endpoint: "storage.googleapis.com", regiao: "southamerica-east1", keyRef: "GCS_SERVICE_ACCOUNT" },
  onedrive: { endpoint: "graph.microsoft.com", regiao: "global", keyRef: "ONEDRIVE_CLIENT_SECRET", tenantId: "", driveId: "" },
  gdrive:   { endpoint: "www.googleapis.com/drive/v3", regiao: "global", keyRef: "GDRIVE_SERVICE_ACCOUNT", caminhoBase: "/EduGov" },
  ftp:      { endpoint: "ftp.exemplo.gov.br", porta: 21, regiao: "on-prem", keyRef: "FTP_PASSWORD", usuario: "", caminhoBase: "/" },
  sftp:     { endpoint: "sftp.exemplo.gov.br", porta: 22, regiao: "on-prem", keyRef: "SFTP_PRIVATE_KEY", usuario: "", caminhoBase: "/" },
};

function NovoProvider({ onAdd }: { onAdd: (p: Provider) => void }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<NewProviderForm>({ nome: "", tipo: "s3", endpoint: "", regiao: "", keyRef: "" });

  function applyTipo(tipo: ProviderTipo) {
    setF((prev) => ({ ...prev, tipo, ...TIPO_DEFAULTS[tipo] } as NewProviderForm));
  }

  const isCloudDrive = f.tipo === "onedrive" || f.tipo === "gdrive";
  const isFtp = f.tipo === "ftp" || f.tipo === "sftp";

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) setF({ nome: "", tipo: "s3", ...TIPO_DEFAULTS.s3 } as NewProviderForm); }}>
      <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Novo provider</Button></DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Cadastrar repositório</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Nome</Label>
              <Input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} placeholder="Ex.: OneDrive Secretaria" />
            </div>
            <div>
              <Label className="text-xs">Tipo</Label>
              <Select value={f.tipo} onValueChange={(v: ProviderTipo) => applyTipo(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="s3">AWS S3</SelectItem>
                  <SelectItem value="minio">MinIO</SelectItem>
                  <SelectItem value="oci">OCI Object Storage</SelectItem>
                  <SelectItem value="gcs">Google GCS</SelectItem>
                  <SelectItem value="onedrive">Microsoft OneDrive</SelectItem>
                  <SelectItem value="gdrive">Google Drive</SelectItem>
                  <SelectItem value="ftp">FTP (compartilhamento local)</SelectItem>
                  <SelectItem value="sftp">SFTP (compartilhamento local)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs">{isFtp ? "Host" : "Endpoint"}</Label>
            <Input value={f.endpoint} onChange={(e) => setF({ ...f, endpoint: e.target.value })} />
          </div>

          {isFtp && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Porta</Label>
                <Input type="number" value={f.porta ?? ""} onChange={(e) => setF({ ...f, porta: Number(e.target.value) })} />
              </div>
              <div>
                <Label className="text-xs">Usuário</Label>
                <Input value={f.usuario ?? ""} onChange={(e) => setF({ ...f, usuario: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Caminho base</Label>
                <Input value={f.caminhoBase ?? ""} onChange={(e) => setF({ ...f, caminhoBase: e.target.value })} placeholder="/dados" />
              </div>
            </div>
          )}

          {f.tipo === "onedrive" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Tenant ID</Label>
                <Input value={f.tenantId ?? ""} onChange={(e) => setF({ ...f, tenantId: e.target.value })} placeholder="00000000-0000-…" />
              </div>
              <div>
                <Label className="text-xs">Drive ID (opcional)</Label>
                <Input value={f.driveId ?? ""} onChange={(e) => setF({ ...f, driveId: e.target.value })} placeholder="b!xxxxxx" />
              </div>
            </div>
          )}

          {f.tipo === "gdrive" && (
            <div>
              <Label className="text-xs">Pasta base</Label>
              <Input value={f.caminhoBase ?? ""} onChange={(e) => setF({ ...f, caminhoBase: e.target.value })} placeholder="/EduGov" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {!isCloudDrive && (
              <div>
                <Label className="text-xs">Região</Label>
                <Input value={f.regiao} onChange={(e) => setF({ ...f, regiao: e.target.value })} />
              </div>
            )}
            <div className={isCloudDrive ? "col-span-2" : ""}>
              <Label className="text-xs">Chave (ref. do secret)</Label>
              <Input value={f.keyRef} onChange={(e) => setF({ ...f, keyRef: e.target.value })} placeholder="NOME_DO_SECRET" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={!f.nome || !f.endpoint || !f.keyRef}
            onClick={async () => {
              await simulate(300);
              onAdd({ ...f, id: crypto.randomUUID(), status: "pendente" });
              setOpen(false);
              toast.success("Provider adicionado. Não esqueça de salvar as alterações.");
            }}
          >
            Cadastrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NovoBucket({ providers, onAdd }: { providers: Provider[]; onAdd: (b: Bucket) => void }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<Omit<Bucket, "id">>({ providerId: providers[0]?.id ?? "", nome: "", finalidade: "", versionamento: true, retencaoDias: 365, publico: false });
  const provider = providers.find((p) => p.id === f.providerId);
  const isFolderProvider = provider && ["onedrive", "gdrive", "ftp", "sftp"].includes(provider.tipo);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline" disabled={providers.length === 0}><Plus className="h-4 w-4 mr-1" /> Novo bucket</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo bucket / pasta</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Provider</Label>
            <Select value={f.providerId} onValueChange={(v) => setF({ ...f, providerId: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{providers.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome} — {TIPO_LABEL[p.tipo]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">{isFolderProvider ? "Caminho da pasta" : "Nome do bucket"}</Label>
            <Input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} placeholder={isFolderProvider ? "/dossies-2026" : "dossies-alunos"} />
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
          <Button
            disabled={!f.providerId || !f.nome}
            onClick={async () => {
              await simulate(300);
              onAdd({ ...f, id: crypto.randomUUID() });
              setOpen(false);
              toast.success("Item adicionado. Salve para persistir.");
            }}
          >
            Adicionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
