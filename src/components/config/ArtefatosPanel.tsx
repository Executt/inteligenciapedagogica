import { useEffect, useMemo, useRef, useState } from "react";
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
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Package, Plus, Trash2, Cloud, HardDrive, Loader2, Plug, Save, Info, Upload, Download,
  RefreshCw, Eye, EyeOff, ShieldCheck, KeyRound, AlertCircle, CheckCircle2, FolderTree, Lock,
  Pause, Play, X, RotateCcw, History, GitBranch,
} from "lucide-react";
import { simulate } from "./_shared";

/* ─────────────── Version / retention policies ─────────────── */

type VersionPolicy = "keep-all" | "keep-latest" | "keep-n";
const VERSION_POLICY_LABEL: Record<VersionPolicy, string> = {
  "keep-all": "Manter todas as versões",
  "keep-latest": "Manter apenas a última",
  "keep-n": "Manter as N últimas",
};

/* ─────────────── Operation history (in-memory + localStorage) ─────────────── */

type OpKind = "upload" | "download" | "sync";
type OpStatus = "ok" | "erro" | "cancelado" | "em_andamento" | "pausado";
type HistoryEntry = {
  id: string;
  kind: OpKind;
  providerId: string;
  providerNome: string;
  arquivo: string;
  usuario: string;
  duracaoMs: number;
  status: OpStatus;
  detalhe?: string;
  policy?: VersionPolicy;
  keepN?: number;
  at: string;
};

const HISTORY_KEY = "edugov.artefatos.history";
const HISTORY_MAX = 200;

function loadHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
  } catch { return []; }
}
function saveHistory(items: HistoryEntry[]) {
  try { window.localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, HISTORY_MAX))); } catch {}
}

type ProviderTipo = "s3" | "minio" | "oci" | "gcs" | "onedrive" | "gdrive" | "ftp" | "sftp";

type CredentialMode = "secret_manager" | "encrypted_inline";

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
  credentialMode: CredentialMode;
  credentialHash?: string;     // sha-like preview, never the raw value
  credentialUpdatedAt?: string;
  lastError?: { code: string; message: string; at: string; latencyMs?: number } | null;
};

type Bucket = {
  id: string;
  providerId: string;
  nome: string;
  finalidade: string;
  versionamento: boolean;
  retencaoDias: number;
  publico: boolean;
  sincronizado?: boolean;
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
    { id: "p1", nome: "AWS S3 (SP)", tipo: "s3", endpoint: "s3.sa-east-1.amazonaws.com", regiao: "sa-east-1", keyRef: "AWS_ACCESS_KEY", status: "ok", credentialMode: "secret_manager", credentialUpdatedAt: "2026-05-12T10:22:00Z", credentialHash: "sha256:9f2c…a41e" },
    { id: "p2", nome: "MinIO Local", tipo: "minio", endpoint: "minio.cortex.svc:9000", regiao: "on-prem", keyRef: "MINIO_ROOT_KEY", status: "ok", credentialMode: "secret_manager", credentialUpdatedAt: "2026-06-01T09:00:00Z", credentialHash: "sha256:1e77…bb03" },
    { id: "p3", nome: "OneDrive Secretaria", tipo: "onedrive", endpoint: "graph.microsoft.com", regiao: "global", keyRef: "ONEDRIVE_CLIENT_SECRET", tenantId: "", driveId: "", status: "pendente", credentialMode: "secret_manager" },
    { id: "p4", nome: "Google Drive Pedagógico", tipo: "gdrive", endpoint: "www.googleapis.com/drive/v3", regiao: "global", keyRef: "GDRIVE_SERVICE_ACCOUNT", caminhoBase: "/EduGov", status: "pendente", credentialMode: "secret_manager" },
    { id: "p5", nome: "SFTP Compartilhado", tipo: "sftp", endpoint: "sftp.rede.edu.br", regiao: "on-prem", keyRef: "SFTP_PRIVATE_KEY", usuario: "edugov", porta: 22, caminhoBase: "/dados/edu-gov", status: "pendente", credentialMode: "secret_manager" },
  ],
  buckets: [
    { id: "b1", providerId: "p1", nome: "dossies-alunos", finalidade: "PDFs governamentais e dossiês", versionamento: true, retencaoDias: 1825, publico: false, sincronizado: true },
    { id: "b2", providerId: "p2", nome: "provas-imagens", finalidade: "Imagens de provas e redações digitalizadas", versionamento: true, retencaoDias: 730, publico: false, sincronizado: true },
    { id: "b3", providerId: "p5", nome: "/compartilhamento-sftp", finalidade: "Troca de arquivos com secretarias regionais", versionamento: false, retencaoDias: 180, publico: false, sincronizado: true },
  ],
};

/** Sanitiza providers antes de persistir — nunca envia segredo em texto claro. */
function sanitizeForPersist(providers: Provider[]): Provider[] {
  return providers.map((p) => ({
    ...p,
    // apenas metadados; nunca o valor bruto
    credentialHash: p.credentialHash,
    credentialUpdatedAt: p.credentialUpdatedAt,
    lastError: p.lastError ?? null,
  }));
}

/** Gera um hash-preview curto para exibir "impressão digital" do segredo sem revelá-lo. */
function fingerprint(raw: string): string {
  let h = 0;
  for (let i = 0; i < raw.length; i++) h = (h * 31 + raw.charCodeAt(i)) >>> 0;
  const hex = h.toString(16).padStart(8, "0");
  return `sha256:${hex.slice(0, 4)}…${hex.slice(-4)}`;
}

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
  const [testResult, setTestResult] = useState<Record<string, { ok: boolean; latencyMs: number; message: string; code?: string; at: string }>>({});

  const [uploadFor, setUploadFor] = useState<Provider | null>(null);
  const [downloadFor, setDownloadFor] = useState<Provider | null>(null);
  const [syncFor, setSyncFor] = useState<Provider | null>(null);
  const [credFor, setCredFor] = useState<Provider | null>(null);

  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());
  const pushHistory = (entry: Omit<HistoryEntry, "id" | "at" | "usuario">) => {
    setHistory((prev) => {
      const next: HistoryEntry[] = [
        {
          ...entry,
          id: crypto.randomUUID(),
          at: new Date().toISOString(),
          usuario: "admin@edu-gov",
        },
        ...prev,
      ].slice(0, HISTORY_MAX);
      saveHistory(next);
      return next;
    });
  };

  useEffect(() => {
    const persisted = (data as Persisted | null) ?? null;
    if (persisted && Array.isArray(persisted.providers)) {
      setProviders(persisted.providers.map((p) => ({ ...p, credentialMode: p.credentialMode ?? ("secret_manager" as CredentialMode) })));
      setBuckets(persisted.buckets ?? []);
    } else {
      setProviders(DEFAULT_STATE.providers);
      setBuckets(DEFAULT_STATE.buckets);
    }
    setDirty(false);
  }, [data]);

  const save = useMutation({
    mutationFn: () => set({ data: { chave: SETTING_KEY, valor: { providers: sanitizeForPersist(providers), buckets } } }),
    onSuccess: () => {
      toast.success("Repositórios salvos. Segredos permanecem apenas no cofre.");
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
    const started = performance.now();
    const provider = providers.find((p) => p.id === id);
    try {
      // Simulação: providers sem credencial cadastrada falham com erro específico.
      if (!provider?.credentialHash && provider?.credentialMode === "encrypted_inline") {
        throw Object.assign(new Error("Credencial ausente ou não cifrada localmente."), { code: "E_CRED_MISSING" });
      }
      await simulate(700 + Math.random() * 500, undefined, 0.15);
      const latency = Math.round(performance.now() - started);
      mutateProviders((ps) => ps.map((p) => (p.id === id ? { ...p, status: "ok", lastError: null } : p)));
      setTestResult((r) => ({ ...r, [id]: { ok: true, latencyMs: latency, message: "Handshake OK · autenticação validada · permissões suficientes.", at: new Date().toISOString() } }));
      toast.success(`${provider?.nome ?? "Provider"} acessível (${latency} ms).`);
    } catch (e: any) {
      const latency = Math.round(performance.now() - started);
      const code = e.code ?? (provider?.tipo === "sftp" ? "E_SSH_AUTH" : provider?.tipo === "onedrive" ? "E_MSAL_401" : "E_CONN_REFUSED");
      const msg = e.message ?? "Falha desconhecida ao conectar.";
      const err = { code, message: msg, at: new Date().toISOString(), latencyMs: latency };
      mutateProviders((ps) => ps.map((p) => (p.id === id ? { ...p, status: "erro", lastError: err } : p)));
      setTestResult((r) => ({ ...r, [id]: { ok: false, latencyMs: latency, message: msg, code, at: new Date().toISOString() } }));
      toast.error(`${provider?.nome ?? "Provider"}: ${code} — ${msg}`);
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
            Object storage (S3/MinIO/OCI/GCS), armazenamento em nuvem colaborativo (OneDrive, Google Drive) e compartilhamentos locais via FTP/SFTP. Metadados persistem em <span className="font-mono">app_settings</span>; segredos permanecem no cofre.
          </p>
        </div>
        <Button onClick={() => save.mutate()} disabled={!dirty || save.isPending}>
          {save.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
          {dirty ? "Salvar alterações" : "Sem alterações"}
        </Button>
      </header>

      <Alert>
        <ShieldCheck className="h-4 w-4" />
        <AlertDescription className="text-xs">
          Credenciais nunca são armazenadas em texto claro em <span className="font-mono">app_settings</span>. Escolha entre <b>Secret Manager</b> (referência por nome — recomendado) ou <b>Cifrado local</b> (KMS envelope encryption). A UI exibe apenas <span className="font-mono">fingerprint</span> e metadados.
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
                <TableHead>Credencial</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right w-[320px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {providers.map((p) => {
                const r = testResult[p.id];
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      <div>{p.nome}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {p.tipo === "onedrive" && <>Tenant <span className="font-mono">{p.tenantId || "—"}</span></>}
                        {p.tipo === "gdrive" && <>Base <span className="font-mono">{p.caminhoBase || "/"}</span></>}
                        {(p.tipo === "ftp" || p.tipo === "sftp") && <>Usuário <span className="font-mono">{p.usuario || "—"}</span> · <span className="font-mono">{p.caminhoBase || "/"}</span></>}
                        {(p.tipo === "s3" || p.tipo === "minio" || p.tipo === "oci" || p.tipo === "gcs") && <>Região <span className="font-mono">{p.regiao || "—"}</span></>}
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline">{TIPO_LABEL[p.tipo]}</Badge></TableCell>
                    <TableCell className="font-mono text-xs">
                      {p.endpoint}{p.porta ? `:${p.porta}` : ""}
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="flex items-center gap-1.5">
                        {p.credentialMode === "secret_manager"
                          ? <KeyRound className="h-3 w-3 text-primary" />
                          : <Lock className="h-3 w-3 text-primary" />}
                        <span className="font-mono">{p.keyRef}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {p.credentialHash
                          ? <>fp: <span className="font-mono">{p.credentialHash}</span></>
                          : <span className="italic">sem valor</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <Badge variant={p.status === "ok" ? "default" : p.status === "erro" ? "destructive" : "secondary"} className="w-fit">
                          {p.status === "ok" ? "Ativo" : p.status === "erro" ? "Falha" : "Pendente"}
                        </Badge>
                        {r && (
                          <span className={`text-[10px] ${r.ok ? "text-muted-foreground" : "text-destructive"}`}>
                            {r.ok ? `${r.latencyMs}ms · handshake OK` : `${r.code} · ${r.latencyMs}ms`}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1 flex-wrap">
                        <Button size="sm" variant="outline" onClick={() => testar(p.id)} disabled={testing === p.id}>
                          {testing === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plug className="h-3.5 w-3.5" />}
                          <span className="ml-1">Testar</span>
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setCredFor(p)}>
                          <KeyRound className="h-3.5 w-3.5" /><span className="ml-1">Credencial</span>
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setSyncFor(p)}>
                          <RefreshCw className="h-3.5 w-3.5" /><span className="ml-1">Sincronizar</span>
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setUploadFor(p)}>
                          <Upload className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setDownloadFor(p)}>
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => {
                          mutateProviders((ps) => ps.filter((x) => x.id !== p.id));
                          mutateBuckets((bs) => bs.filter((b) => b.providerId !== p.id));
                        }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      {p.lastError && (
                        <div className="mt-1 text-[10px] text-destructive text-right flex items-center gap-1 justify-end">
                          <AlertCircle className="h-3 w-3" /> {p.lastError.code}: {p.lastError.message}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {providers.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-6">Nenhum provider cadastrado.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-sm flex items-center gap-2"><HardDrive className="h-4 w-4" /> Buckets / Pastas selecionadas</CardTitle>
            <CardDescription>Apenas itens marcados aqui são utilizáveis pelos módulos do Edu-Gov. Use "Sincronizar" para descobrir novos.</CardDescription>
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
                    <TableCell className="font-mono text-xs">
                      {b.nome}
                      {b.sincronizado && <Badge variant="outline" className="ml-2 text-[9px]">sync</Badge>}
                    </TableCell>
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

      {uploadFor && <UploadDialog provider={uploadFor} buckets={buckets.filter((b) => b.providerId === uploadFor.id)} onClose={() => setUploadFor(null)} onHistory={pushHistory} />}
      {downloadFor && <DownloadDialog provider={downloadFor} buckets={buckets.filter((b) => b.providerId === downloadFor.id)} onClose={() => setDownloadFor(null)} onHistory={pushHistory} />}
      {syncFor && (
        <SyncDialog
          provider={syncFor}
          existentes={buckets.filter((b) => b.providerId === syncFor.id).map((b) => b.nome)}
          onClose={() => setSyncFor(null)}
          onSelect={(items) => {
            mutateBuckets((bs) => [
              ...bs,
              ...items.map((nome) => ({
                id: crypto.randomUUID(),
                providerId: syncFor.id,
                nome,
                finalidade: "Sincronizado automaticamente",
                versionamento: false,
                retencaoDias: 365,
                publico: false,
                sincronizado: true,
              })),
            ]);
            toast.success(`${items.length} item(ns) adicionados a partir de ${syncFor.nome}.`);
            pushHistory({
              kind: "sync",
              providerId: syncFor.id,
              providerNome: syncFor.nome,
              arquivo: `${items.length} recurso(s) importados`,
              duracaoMs: 0,
              status: "ok",
              detalhe: items.join(", "),
            });
            setSyncFor(null);
          }}
        />
      )}
      {credFor && (
        <CredentialDialog
          provider={credFor}
          onClose={() => setCredFor(null)}
          onSave={(update) => {
            mutateProviders((ps) => ps.map((p) => p.id === credFor.id ? { ...p, ...update } : p));
            toast.success("Credencial atualizada. Salve para persistir os metadados.");
            setCredFor(null);
          }}
        />
      )}

      <HistoryCard history={history} onClear={() => { setHistory([]); saveHistory([]); }} />
    </div>
  );
}

/* ─────────────── History card ─────────────── */

function HistoryCard({ history, onClear }: { history: HistoryEntry[]; onClear: () => void }) {
  const [kind, setKind] = useState<"all" | OpKind>("all");
  const filtered = kind === "all" ? history : history.filter((h) => h.kind === kind);

  return (
    <Card>
      <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-sm flex items-center gap-2"><History className="h-4 w-4" /> Histórico de operações</CardTitle>
          <CardDescription>Uploads, downloads e sincronizações — {history.length} evento(s) registrado(s) localmente.</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Select value={kind} onValueChange={(v: "all" | OpKind) => setKind(v)}>
            <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="upload">Uploads</SelectItem>
              <SelectItem value="download">Downloads</SelectItem>
              <SelectItem value="sync">Sincronizações</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="ghost" onClick={onClear} disabled={history.length === 0}>Limpar</Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-40">Quando</TableHead>
              <TableHead className="w-24">Tipo</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Arquivo / recurso</TableHead>
              <TableHead className="w-24">Duração</TableHead>
              <TableHead className="w-32">Política</TableHead>
              <TableHead className="w-28">Usuário</TableHead>
              <TableHead className="w-24 text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((h) => (
              <TableRow key={h.id}>
                <TableCell className="text-xs">{new Date(h.at).toLocaleString("pt-BR")}</TableCell>
                <TableCell><Badge variant="outline" className="capitalize">{h.kind}</Badge></TableCell>
                <TableCell className="text-xs">{h.providerNome}</TableCell>
                <TableCell className="text-xs font-mono truncate max-w-[260px]" title={h.arquivo}>{h.arquivo}</TableCell>
                <TableCell className="text-xs">{h.duracaoMs > 0 ? `${(h.duracaoMs / 1000).toFixed(1)}s` : "—"}</TableCell>
                <TableCell className="text-[11px]">
                  {h.policy ? (h.policy === "keep-n" ? `Últimas ${h.keepN ?? 5}` : VERSION_POLICY_LABEL[h.policy]) : "—"}
                </TableCell>
                <TableCell className="text-xs">{h.usuario}</TableCell>
                <TableCell className="text-right">
                  <Badge variant={h.status === "ok" ? "default" : h.status === "erro" ? "destructive" : "secondary"} className="text-[10px]">
                    {h.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center text-xs text-muted-foreground py-6">Nenhuma operação registrada.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/* ─────────────── Credential dialog ─────────────── */

function CredentialDialog({ provider, onClose, onSave }: {
  provider: Provider;
  onClose: () => void;
  onSave: (update: Partial<Provider>) => void;
}) {
  const [mode, setMode] = useState<CredentialMode>(provider.credentialMode);
  const [keyRef, setKeyRef] = useState(provider.keyRef);
  const [raw, setRaw] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  const isSecretManager = mode === "secret_manager";

  async function submit() {
    setSaving(true);
    try {
      await simulate(600);
      const update: Partial<Provider> = {
        credentialMode: mode,
        keyRef,
        credentialUpdatedAt: new Date().toISOString(),
      };
      if (raw) update.credentialHash = fingerprint(raw);
      onSave(update);
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao salvar credencial.");
    } finally { setSaving(false); }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><KeyRound className="h-4 w-4" /> Credencial · {provider.nome}</DialogTitle>
          <DialogDescription>
            O valor bruto é usado apenas para gerar o fingerprint local e nunca é persistido em <span className="font-mono">app_settings</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Modo de armazenamento</Label>
            <Select value={mode} onValueChange={(v: CredentialMode) => setMode(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="secret_manager">Secret Manager (referência) — recomendado</SelectItem>
                <SelectItem value="encrypted_inline">Cifrado local (KMS envelope)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">{isSecretManager ? "Nome da secret" : "Alias interno"}</Label>
            <Input value={keyRef} onChange={(e) => setKeyRef(e.target.value)} placeholder="EX_PROVIDER_SECRET" className="font-mono" />
          </div>

          <div>
            <Label className="text-xs flex items-center justify-between">
              <span>{isSecretManager ? "Valor (opcional — provisiona no cofre)" : "Valor (será cifrado com KMS)"}</span>
              <button type="button" onClick={() => setShow((s) => !s)} className="text-[11px] text-muted-foreground flex items-center gap-1">
                {show ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                {show ? "Ocultar" : "Mostrar"}
              </button>
            </Label>
            <Input type={show ? "text" : "password"} value={raw} onChange={(e) => setRaw(e.target.value)} placeholder="••••••••••" autoComplete="off" />
            {raw && (
              <div className="text-[10px] text-muted-foreground mt-1">
                Fingerprint preview: <span className="font-mono">{fingerprint(raw)}</span>
              </div>
            )}
          </div>

          {provider.credentialHash && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Fingerprint atual: <span className="font-mono">{provider.credentialHash}</span>{" "}
                · atualizada em {provider.credentialUpdatedAt ? new Date(provider.credentialUpdatedAt).toLocaleString("pt-BR") : "—"}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={saving || !keyRef}>
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Salvar credencial
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────── Upload dialog ─────────────── */

type UploadJob = {
  id: string;
  nome: string;
  tamanho: number;
  progresso: number;
  status: "aguardando" | "enviando" | "pausado" | "cancelado" | "ok" | "erro";
  erro?: string;
  startedAt: number;
  finishedAt?: number;
  policy: VersionPolicy;
  keepN: number;
  willFail?: boolean;
};

function UploadDialog({
  provider,
  buckets,
  onClose,
  onHistory,
}: {
  provider: Provider;
  buckets: Bucket[];
  onClose: () => void;
  onHistory: (entry: Omit<HistoryEntry, "id" | "at" | "usuario">) => void;
}) {
  const [target, setTarget] = useState(buckets[0]?.id ?? "");
  const [policy, setPolicy] = useState<VersionPolicy>("keep-all");
  const [keepN, setKeepN] = useState(5);
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const timers = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  function stopTimer(id: string) {
    const t = timers.current[id];
    if (t) { clearInterval(t); delete timers.current[id]; }
  }

  function enqueue(files: FileList | null) {
    if (!files) return;
    const items: UploadJob[] = Array.from(files).map((f) => ({
      id: crypto.randomUUID(),
      nome: f.name,
      tamanho: f.size,
      progresso: 0,
      status: "aguardando",
      startedAt: Date.now(),
      policy,
      keepN,
    }));
    setJobs((prev) => [...items, ...prev]);
    items.forEach((j) => runUpload(j.id));
  }

  function runUpload(id: string) {
    stopTimer(id);
    setJobs((prev) => prev.map((j) => j.id === id ? { ...j, status: "enviando", startedAt: j.startedAt || Date.now() } : j));
    const willFail = Math.random() < 0.12;
    timers.current[id] = setInterval(() => {
      setJobs((prev) => prev.map((j) => {
        if (j.id !== id) return j;
        if (j.status !== "enviando") return j;
        const inc = 6 + Math.random() * 12;
        const next = Math.min(100, j.progresso + inc);
        if (next >= 100) {
          stopTimer(id);
          const finishedAt = Date.now();
          if (willFail) {
            const erro = provider.tipo === "sftp" ? "SSH_DISCONNECT: broken pipe" : "HTTP 507 Insufficient Storage";
            toast.error(`Falha ao enviar ${j.nome}.`);
            onHistory({
              kind: "upload", providerId: provider.id, providerNome: provider.nome,
              arquivo: j.nome, duracaoMs: finishedAt - j.startedAt, status: "erro",
              detalhe: erro, policy: j.policy, keepN: j.keepN,
            });
            return { ...j, status: "erro", progresso: 100, erro, finishedAt };
          }
          toast.success(`${j.nome} enviado para ${provider.nome}.`);
          onHistory({
            kind: "upload", providerId: provider.id, providerNome: provider.nome,
            arquivo: j.nome, duracaoMs: finishedAt - j.startedAt, status: "ok",
            detalhe: `${(j.tamanho / 1024).toFixed(0)} KB`, policy: j.policy, keepN: j.keepN,
          });
          return { ...j, status: "ok", progresso: 100, finishedAt };
        }
        return { ...j, progresso: next };
      }));
    }, 220);
  }

  function pause(id: string) {
    stopTimer(id);
    setJobs((prev) => prev.map((j) => j.id === id ? { ...j, status: "pausado" } : j));
    toast.message("Upload pausado");
  }
  function resume(id: string) {
    setJobs((prev) => prev.map((j) => j.id === id ? { ...j, status: "enviando" } : j));
    runUpload(id);
  }
  function cancel(id: string) {
    stopTimer(id);
    setJobs((prev) => prev.map((j) => {
      if (j.id !== id) return j;
      const finishedAt = Date.now();
      onHistory({
        kind: "upload", providerId: provider.id, providerNome: provider.nome,
        arquivo: j.nome, duracaoMs: finishedAt - j.startedAt, status: "cancelado",
        policy: j.policy, keepN: j.keepN,
      });
      return { ...j, status: "cancelado", finishedAt };
    }));
    toast.warning("Upload cancelado");
  }
  function retry(id: string) {
    setJobs((prev) => prev.map((j) => j.id === id ? { ...j, status: "enviando", progresso: 0, erro: undefined, startedAt: Date.now() } : j));
    runUpload(id);
  }

  useEffect(() => () => { Object.keys(timers.current).forEach(stopTimer); }, []);

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Upload className="h-4 w-4" /> Upload · {provider.nome}</DialogTitle>
          <DialogDescription>Envio direto para {TIPO_LABEL[provider.tipo]}. Configure versionamento e retenção antes de enviar.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <Label className="text-xs">Destino</Label>
              <Select value={target} onValueChange={setTarget}>
                <SelectTrigger><SelectValue placeholder="Bucket/pasta" /></SelectTrigger>
                <SelectContent>
                  {buckets.map((b) => <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>)}
                  {buckets.length === 0 && <div className="px-2 py-1.5 text-xs text-muted-foreground">Nenhum bucket sincronizado.</div>}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-1">
              <Label className="text-xs flex items-center gap-1"><GitBranch className="h-3 w-3" /> Política de versão</Label>
              <Select value={policy} onValueChange={(v: VersionPolicy) => setPolicy(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="keep-all">Manter todas as versões</SelectItem>
                  <SelectItem value="keep-latest">Manter apenas a última</SelectItem>
                  <SelectItem value="keep-n">Manter as N últimas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-1">
              <Label className="text-xs">N (quando aplicável)</Label>
              <Input type="number" min={1} max={100} value={keepN} onChange={(e) => setKeepN(Math.max(1, Number(e.target.value) || 1))} disabled={policy !== "keep-n"} />
            </div>
          </div>

          <Alert className="py-2">
            <Info className="h-3.5 w-3.5" />
            <AlertDescription className="text-[11px]">
              Aplicada no destino: <b>{VERSION_POLICY_LABEL[policy]}{policy === "keep-n" ? ` (${keepN})` : ""}</b>. Uploads em andamento podem ser <b>pausados</b>, <b>cancelados</b> ou <b>retomados</b>; falhas oferecem <b>reenvio</b>.
            </AlertDescription>
          </Alert>

          <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => enqueue(e.target.files)} />
          <Button variant="outline" onClick={() => inputRef.current?.click()} disabled={!target}>
            <Upload className="h-4 w-4 mr-1" /> Selecionar arquivos
          </Button>

          <div className="max-h-72 overflow-auto divide-y">
            {jobs.map((j) => (
              <div key={j.id} className="py-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium truncate">{j.nome}</span>
                  <span className="text-muted-foreground">{(j.tamanho / 1024).toFixed(0)} KB</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Progress value={j.progresso} className="h-1.5 flex-1" />
                  <span className="text-[10px] w-10 text-right">{Math.round(j.progresso)}%</span>
                  {j.status === "ok" && <CheckCircle2 className="h-3.5 w-3.5 text-success" />}
                  {j.status === "erro" && <AlertCircle className="h-3.5 w-3.5 text-destructive" />}
                  {j.status === "enviando" && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
                  {j.status === "pausado" && <Pause className="h-3.5 w-3.5 text-muted-foreground" />}
                  {j.status === "cancelado" && <X className="h-3.5 w-3.5 text-muted-foreground" />}
                </div>
                <div className="flex items-center justify-between mt-1">
                  <div className="text-[10px] text-muted-foreground">
                    {VERSION_POLICY_LABEL[j.policy]}{j.policy === "keep-n" ? ` · N=${j.keepN}` : ""}
                    {j.erro && <span className="text-destructive ml-2">· {j.erro}</span>}
                  </div>
                  <div className="flex items-center gap-1">
                    {j.status === "enviando" && (
                      <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => pause(j.id)}>
                        <Pause className="h-3 w-3" />
                      </Button>
                    )}
                    {j.status === "pausado" && (
                      <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => resume(j.id)}>
                        <Play className="h-3 w-3" />
                      </Button>
                    )}
                    {(j.status === "enviando" || j.status === "pausado") && (
                      <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => cancel(j.id)}>
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                    {(j.status === "erro" || j.status === "cancelado") && (
                      <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => retry(j.id)}>
                        <RotateCcw className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {jobs.length === 0 && <div className="text-xs text-muted-foreground py-6 text-center">Nenhum envio ainda.</div>}
          </div>
        </div>

        <DialogFooter><Button variant="ghost" onClick={onClose}>Fechar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────── Download dialog ─────────────── */

type RemoteFile = { nome: string; tamanho: number; versoes?: number };
type DownloadJob = {
  progresso: number;
  status: "em_andamento" | "pausado" | "cancelado" | "ok" | "erro";
  startedAt: number;
  erro?: string;
};

function DownloadDialog({
  provider,
  buckets,
  onClose,
  onHistory,
}: {
  provider: Provider;
  buckets: Bucket[];
  onClose: () => void;
  onHistory: (entry: Omit<HistoryEntry, "id" | "at" | "usuario">) => void;
}) {
  const [target, setTarget] = useState(buckets[0]?.id ?? "");
  const [files, setFiles] = useState<RemoteFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [policy, setPolicy] = useState<VersionPolicy>("keep-latest");
  const [keepN, setKeepN] = useState(3);
  const [versaoSel, setVersaoSel] = useState<Record<string, string>>({});
  const [jobs, setJobs] = useState<Record<string, DownloadJob>>({});
  const timers = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  function stopTimer(name: string) {
    const t = timers.current[name];
    if (t) { clearInterval(t); delete timers.current[name]; }
  }

  /** Versões que a política de retenção permite baixar para o arquivo. */
  function versoesPermitidas(f: RemoteFile): { value: string; label: string }[] {
    const total = f.versoes ?? 1;
    const nums = Array.from({ length: total }, (_, i) => total - i); // mais recente primeiro
    if (policy === "keep-latest") {
      return [{ value: `v${total}`, label: `v${total} (última)` }];
    }
    const permitidas = policy === "keep-n" ? nums.slice(0, keepN) : nums;
    return [
      { value: "todas", label: `Todas as permitidas (${permitidas.length})` },
      ...permitidas.map((n) => ({ value: `v${n}`, label: n === total ? `v${n} (última)` : `v${n}` })),
    ];
  }

  function versaoDe(f: RemoteFile): string {
    const opts = versoesPermitidas(f);
    const atual = versaoSel[f.nome];
    return atual && opts.some((o) => o.value === atual) ? atual : opts[0]!.value;
  }

  async function listar() {
    if (!target) return;
    setLoading(true);
    try {
      await simulate(700, undefined, 0.08);
      const bucket = buckets.find((b) => b.id === target)!;
      setFiles([
        { nome: `${bucket.nome}/dossies/aluno_1024.pdf`, tamanho: 842_112, versoes: 4 },
        { nome: `${bucket.nome}/dossies/aluno_1025.pdf`, tamanho: 993_812, versoes: 2 },
        { nome: `${bucket.nome}/relatorios/consolidado_2026Q1.xlsx`, tamanho: 214_555, versoes: 7 },
        { nome: `${bucket.nome}/media/prova_matematica.jpg`, tamanho: 1_245_998, versoes: 1 },
      ]);
    } catch (e: any) {
      toast.error(`Não foi possível listar: ${e.message}`);
    } finally { setLoading(false); }
  }

  function baixar(f: RemoteFile) {
    stopTimer(f.nome);
    const willFail = Math.random() < 0.1;
    const startedAt = Date.now();
    setJobs((s) => ({ ...s, [f.nome]: { progresso: 0, status: "em_andamento", startedAt } }));
    timers.current[f.nome] = setInterval(() => {
      setJobs((s) => {
        const cur = s[f.nome];
        if (!cur || cur.status !== "em_andamento") return s;
        const next = Math.min(100, cur.progresso + 8 + Math.random() * 14);
        if (next >= 100) {
          stopTimer(f.nome);
          const finishedAt = Date.now();
          if (willFail) {
            toast.error(`Falha ao baixar ${f.nome} — 403 Forbidden`);
            onHistory({
              kind: "download", providerId: provider.id, providerNome: provider.nome,
              arquivo: f.nome, duracaoMs: finishedAt - startedAt, status: "erro",
              detalhe: "403 Forbidden", policy, keepN,
            });
            return { ...s, [f.nome]: { ...cur, progresso: 100, status: "erro", erro: "403 Forbidden" } };
          }
          const versao = versaoDe(f);
          toast.success(`Download concluído: ${f.nome} · ${versao === "todas" ? "todas as versões permitidas" : versao}`);
          onHistory({
            kind: "download", providerId: provider.id, providerNome: provider.nome,
            arquivo: `${f.nome}@${versao}`, duracaoMs: finishedAt - startedAt, status: "ok",
            detalhe: `${(f.tamanho / 1024).toFixed(0)} KB · ${f.versoes ?? 1} versão(ões) no provider · baixado: ${versao}`,
            policy, keepN,
          });
          return { ...s, [f.nome]: { ...cur, progresso: 100, status: "ok" } };
        }
        return { ...s, [f.nome]: { ...cur, progresso: next } };
      });
    }, 200);
  }

  function pause(name: string) {
    stopTimer(name);
    setJobs((s) => s[name] ? { ...s, [name]: { ...s[name], status: "pausado" } } : s);
  }
  function resume(name: string) {
    setJobs((s) => s[name] ? { ...s, [name]: { ...s[name], status: "em_andamento" } } : s);
    const f = files.find((x) => x.nome === name); if (f) baixar(f);
  }
  function cancel(name: string) {
    stopTimer(name);
    setJobs((s) => {
      const cur = s[name]; if (!cur) return s;
      onHistory({
        kind: "download", providerId: provider.id, providerNome: provider.nome,
        arquivo: name, duracaoMs: Date.now() - cur.startedAt, status: "cancelado", policy, keepN,
      });
      return { ...s, [name]: { ...cur, status: "cancelado" } };
    });
  }
  function retry(name: string) {
    const f = files.find((x) => x.nome === name); if (f) baixar(f);
  }

  useEffect(() => () => { Object.keys(timers.current).forEach(stopTimer); }, []);

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Download className="h-4 w-4" /> Download · {provider.nome}</DialogTitle>
          <DialogDescription>Escolha a política de versões que será considerada ao trazer arquivos para o Edu-Gov.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-2 items-end">
            <div className="col-span-2">
              <Label className="text-xs">Bucket / pasta</Label>
              <Select value={target} onValueChange={setTarget}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{buckets.map((b) => <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs flex items-center gap-1"><GitBranch className="h-3 w-3" /> Versões</Label>
              <Select value={policy} onValueChange={(v: VersionPolicy) => setPolicy(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="keep-latest">Apenas a última</SelectItem>
                  <SelectItem value="keep-all">Todas as versões</SelectItem>
                  <SelectItem value="keep-n">Últimas N</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">N</Label>
              <Input type="number" min={1} max={100} value={keepN} onChange={(e) => setKeepN(Math.max(1, Number(e.target.value) || 1))} disabled={policy !== "keep-n"} />
            </div>
          </div>

          <Button variant="outline" onClick={listar} disabled={!target || loading} size="sm">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ml-1">Listar arquivos</span>
          </Button>

          <div className="max-h-72 overflow-auto divide-y">
            {files.map((f) => {
              const job = jobs[f.nome];
              const p = job?.progresso ?? 0;
              return (
                <div key={f.nome} className="py-2">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-mono truncate">{f.nome}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {(f.tamanho / 1024).toFixed(0)} KB · {f.versoes ?? 1} versão(ões)
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {(!job || job.status === "ok" || job.status === "erro" || job.status === "cancelado") && (
                        <Button size="sm" variant="outline" onClick={() => baixar(f)}>
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {job?.status === "em_andamento" && (
                        <>
                          <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => pause(f.nome)}><Pause className="h-3.5 w-3.5" /></Button>
                          <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => cancel(f.nome)}><X className="h-3.5 w-3.5" /></Button>
                        </>
                      )}
                      {job?.status === "pausado" && (
                        <>
                          <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => resume(f.nome)}><Play className="h-3.5 w-3.5" /></Button>
                          <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => cancel(f.nome)}><X className="h-3.5 w-3.5" /></Button>
                        </>
                      )}
                      {(job?.status === "erro" || job?.status === "cancelado") && (
                        <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => retry(f.nome)}><RotateCcw className="h-3.5 w-3.5" /></Button>
                      )}
                    </div>
                  </div>
                  {job && (
                    <div className="flex items-center gap-2 mt-1">
                      <Progress value={p} className="h-1.5 flex-1" />
                      <span className="text-[10px] w-10 text-right">{Math.round(p)}%</span>
                      {job.status === "ok" && <CheckCircle2 className="h-3.5 w-3.5 text-success" />}
                      {job.status === "erro" && <AlertCircle className="h-3.5 w-3.5 text-destructive" />}
                      {job.status === "em_andamento" && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
                      {job.status === "pausado" && <Pause className="h-3.5 w-3.5 text-muted-foreground" />}
                      {job.status === "cancelado" && <X className="h-3.5 w-3.5 text-muted-foreground" />}
                    </div>
                  )}
                  {job?.erro && <div className="text-[10px] text-destructive mt-0.5">{job.erro}</div>}
                </div>
              );
            })}
            {files.length === 0 && <div className="text-xs text-muted-foreground py-6 text-center">Clique em "Listar arquivos" para descobrir arquivos.</div>}
          </div>
        </div>

        <DialogFooter><Button variant="ghost" onClick={onClose}>Fechar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


/* ─────────────── Sync dialog ─────────────── */

function SyncDialog({ provider, existentes, onClose, onSelect }: {
  provider: Provider; existentes: string[]; onClose: () => void; onSelect: (items: string[]) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [remoto, setRemoto] = useState<string[]>([]);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [erro, setErro] = useState<string | null>(null);

  async function descobrir() {
    setLoading(true); setErro(null);
    try {
      await simulate(900, undefined, 0.12);
      const base: Record<ProviderTipo, string[]> = {
        s3:       ["dossies-alunos", "provas-imagens", "backups", "logs-app", "exports-inep"],
        minio:    ["provas-imagens", "cache-ocr", "sandbox"],
        oci:      ["gov-arquivos", "gov-backups"],
        gcs:      ["dossies-alunos-gcs", "analytics-raw"],
        onedrive: ["/Documentos EduGov", "/Secretaria/2026", "/Compartilhado/Coordenacao", "/Diretoria/Atas"],
        gdrive:   ["/EduGov/Alunos", "/EduGov/Boletins", "/EduGov/Formacao", "/EduGov/RH"],
        ftp:      ["/incoming", "/outgoing", "/arquivos-gov"],
        sftp:     ["/dados/edu-gov", "/dados/coord", "/dados/backup"],
      };
      setRemoto(base[provider.tipo]);
    } catch (e: any) {
      setErro(e.message ?? "Falha ao listar recursos remotos.");
      toast.error(`Sincronização falhou: ${e.message}`);
    } finally { setLoading(false); }
  }

  useEffect(() => { descobrir(); /* eslint-disable-next-line */ }, []);

  function toggle(n: string) {
    setSel((s) => { const n2 = new Set(s); n2.has(n) ? n2.delete(n) : n2.add(n); return n2; });
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FolderTree className="h-4 w-4" /> Sincronizar · {provider.nome}</DialogTitle>
          <DialogDescription>Escolha quais pastas/buckets ficarão disponíveis para os módulos do Edu-Gov.</DialogDescription>
        </DialogHeader>

        {erro && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription className="text-xs">{erro}</AlertDescription></Alert>}

        <div className="space-y-2 max-h-72 overflow-auto">
          {loading && <div className="text-xs text-muted-foreground py-6 text-center"><Loader2 className="h-4 w-4 mr-1 animate-spin inline" /> Descobrindo recursos…</div>}
          {!loading && remoto.map((n) => {
            const jaExiste = existentes.includes(n);
            return (
              <label key={n} className={`flex items-center gap-2 px-2 py-1.5 rounded border text-sm ${jaExiste ? "opacity-50" : "hover:bg-accent cursor-pointer"}`}>
                <Checkbox disabled={jaExiste} checked={sel.has(n)} onCheckedChange={() => toggle(n)} />
                <span className="font-mono text-xs flex-1">{n}</span>
                {jaExiste && <Badge variant="outline" className="text-[9px]">já usado</Badge>}
              </label>
            );
          })}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={descobrir} disabled={loading}><RefreshCw className="h-4 w-4 mr-1" /> Atualizar</Button>
          <Button onClick={() => onSelect(Array.from(sel))} disabled={sel.size === 0}>Usar selecionados ({sel.size})</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────── Novo provider ─────────────── */

type NewProviderForm = Omit<Provider, "id" | "status" | "credentialHash" | "credentialUpdatedAt" | "lastError">;

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
  const [f, setF] = useState<NewProviderForm>({ nome: "", tipo: "s3", endpoint: "", regiao: "", keyRef: "", credentialMode: "secret_manager" });

  function applyTipo(tipo: ProviderTipo) {
    setF((prev) => ({ ...prev, tipo, ...TIPO_DEFAULTS[tipo] } as NewProviderForm));
  }

  const isCloudDrive = f.tipo === "onedrive" || f.tipo === "gdrive";
  const isFtp = f.tipo === "ftp" || f.tipo === "sftp";

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) setF({ nome: "", tipo: "s3", credentialMode: "secret_manager", ...TIPO_DEFAULTS.s3 } as NewProviderForm); }}>
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
              <Label className="text-xs">Modo de credencial</Label>
              <Select value={f.credentialMode} onValueChange={(v: CredentialMode) => setF({ ...f, credentialMode: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="secret_manager">Secret Manager (recomendado)</SelectItem>
                  <SelectItem value="encrypted_inline">Cifrado local (KMS)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs">{f.credentialMode === "secret_manager" ? "Nome da secret" : "Alias interno"}</Label>
            <Input value={f.keyRef} onChange={(e) => setF({ ...f, keyRef: e.target.value })} placeholder="NOME_DO_SECRET" className="font-mono" />
            <div className="text-[10px] text-muted-foreground mt-1">Depois de cadastrar, use "Credencial" para vincular o valor com segurança.</div>
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={!f.nome || !f.endpoint || !f.keyRef}
            onClick={async () => {
              await simulate(300);
              onAdd({ ...f, id: crypto.randomUUID(), status: "pendente" } as Provider);
              setOpen(false);
              toast.success("Provider adicionado. Configure a credencial e salve.");
            }}
          >
            Cadastrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────── Novo bucket ─────────────── */

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
