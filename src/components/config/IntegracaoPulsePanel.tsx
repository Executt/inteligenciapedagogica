import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listPulseEvents,
  getPulseIngestStatus,
  rotatePulseToken,
  revokePulseToken,
  setPulseSecurity,
} from "@/lib/admin/pulse.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Activity, Webhook, Copy, RefreshCw, ShieldCheck, CheckCircle2, AlertCircle, KeyRound, RotateCcw, Ban, Fingerprint, Loader2,
} from "lucide-react";

export function IntegracaoPulsePanel() {
  const qc = useQueryClient();
  const listFn = useServerFn(listPulseEvents);
  const statusFn = useServerFn(getPulseIngestStatus);
  const rotateFn = useServerFn(rotatePulseToken);
  const revokeFn = useServerFn(revokePulseToken);
  const securityFn = useServerFn(setPulseSecurity);

  const [filter, setFilter] = useState("");
  const [novoToken, setNovoToken] = useState<string | null>(null);
  const [confirmRotate, setConfirmRotate] = useState(false);

  const status = useQuery({
    queryKey: ["admin", "pulse", "status"],
    queryFn: () => statusFn({ data: undefined as any }),
  });

  const events = useQuery({
    queryKey: ["admin", "pulse", "events", filter],
    queryFn: () => listFn({ data: { limit: 100, event_type: filter || undefined } }),
    refetchInterval: 15000,
  });

  const rotate = useMutation({
    mutationFn: () => rotateFn({ data: undefined as any }),
    onSuccess: (r: any) => {
      setNovoToken(r.token);
      setConfirmRotate(false);
      qc.invalidateQueries({ queryKey: ["admin", "pulse", "status"] });
      toast.success("Token rotacionado. Copie agora — ele não será exibido novamente.");
    },
    onError: (e: any) => toast.error(e.message ?? "Falha ao rotacionar token"),
  });

  const revoke = useMutation({
    mutationFn: () => revokeFn({ data: undefined as any }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "pulse", "status"] });
      toast.success("Token revogado.");
    },
    onError: (e: any) => toast.error(e.message ?? "Falha ao revogar token"),
  });

  const saveSecurity = useMutation({
    mutationFn: (v: { require_signature: boolean; skew_seconds: number; allow_env_token: boolean }) =>
      securityFn({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "pulse", "status"] });
      toast.success("Política de segurança atualizada.");
    },
    onError: (e: any) => toast.error(e.message ?? "Falha ao salvar política"),
  });

  const endpoint = useMemo(() => {
    if (typeof window === "undefined") return "/api/public/pulse/ingest";
    return `${window.location.origin}/api/public/pulse/ingest`;
  }, []);

  const [skew, setSkew] = useState<number | null>(null);
  const skewValue = skew ?? status.data?.skewSeconds ?? 300;

  const curlSample = `TS=$(date +%s); NONCE=$(uuidgen); BODY='{"event_type":"aluno.frequencia","external_id":"a-1024","payload":{"presenca":0.92}}'
SIG=$(printf '%s' "$TS.$NONCE.$BODY" | openssl dgst -sha256 -hmac "$PULSE_TOKEN" -hex | awk '{print $2}')
curl -X POST '${endpoint}' \\
  -H "authorization: Bearer $PULSE_TOKEN" \\
  -H "content-type: application/json" \\
  -H "x-pulse-timestamp: $TS" -H "x-pulse-nonce: $NONCE" -H "x-pulse-signature: $SIG" \\
  -d "$BODY"`;

  function copy(txt: string, label: string) {
    navigator.clipboard.writeText(txt).then(
      () => toast.success(`${label} copiado`),
      () => toast.error("Não foi possível copiar"),
    );
  }

  const configured = status.data?.configured;

  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Webhook className="h-4 w-4" /> Integração — Pedagogica Pulse
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Endpoint público autenticado por token para que o aplicativo{" "}
          <a href="https://pedagogica-pulse.lovable.app" target="_blank" rel="noreferrer" className="underline">
            pedagogica-pulse
          </a>{" "}
          envie eventos para o Edu-Gov. Apenas o hash do token é armazenado — o valor em claro aparece uma única vez.
        </p>
      </header>

      {configured === false && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Nenhum token de ingestão ativo. Gere um token abaixo — o endpoint responderá 503 até então.
          </AlertDescription>
        </Alert>
      )}

      {configured && (
        <Alert>
          <ShieldCheck className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Endpoint ativo. Cada requisição valida o header <span className="font-mono">Authorization: Bearer …</span>
            {status.data?.requireSignature ? " e a assinatura HMAC com proteção anti-replay." : " e, quando enviada, a assinatura HMAC."}
          </AlertDescription>
        </Alert>
      )}

      {/* ── Token ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><KeyRound className="h-4 w-4" /> Token de ingestão</CardTitle>
          <CardDescription>Rotação segura: gera um novo segredo, invalida o anterior e registra a ação na auditoria.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-3 text-xs">
            <Field label="Prefixo" value={status.data?.tokenPrefix ?? "— nenhum token gerado"} mono />
            <Field
              label="Última rotação"
              value={status.data?.rotatedAt ? new Date(status.data.rotatedAt).toLocaleString("pt-BR") : "—"}
            />
            <Field label="Nonces ativos (anti-replay)" value={String(status.data?.noncesAtivos ?? "…")} />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setConfirmRotate(true)} disabled={rotate.isPending}>
              {rotate.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5 mr-1" />}
              {status.data?.tokenPrefix ? "Rotacionar token" : "Gerar token"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => revoke.mutate()}
              disabled={!status.data?.tokenPrefix || revoke.isPending}
            >
              <Ban className="h-3.5 w-3.5 mr-1" /> Revogar
            </Button>
          </div>
          {status.data?.envConfigured && (
            <p className="text-[11px] text-muted-foreground">
              Existe também um token legado no cofre de segredos (<span className="font-mono">PULSE_INGEST_TOKEN</span>).
              Desative-o abaixo depois de migrar o Pulse para o novo token.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Segurança ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><Fingerprint className="h-4 w-4" /> Assinatura e anti-replay</CardTitle>
          <CardDescription>
            Assinatura: <span className="font-mono">HMAC-SHA256(token, `timestamp.nonce.body`)</span> enviada em{" "}
            <span className="font-mono">x-pulse-signature</span>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded border p-3">
            <div>
              <div className="text-sm font-medium">Exigir assinatura em todas as chamadas</div>
              <div className="text-[11px] text-muted-foreground">Requisições sem assinatura válida são recusadas com 401.</div>
            </div>
            <Switch
              checked={status.data?.requireSignature ?? false}
              onCheckedChange={(v) =>
                saveSecurity.mutate({
                  require_signature: v,
                  skew_seconds: skewValue,
                  allow_env_token: status.data?.allowEnvToken ?? true,
                })
              }
            />
          </div>
          <div className="flex items-center justify-between rounded border p-3">
            <div>
              <div className="text-sm font-medium">Aceitar token legado do cofre</div>
              <div className="text-[11px] text-muted-foreground">Permite o valor de PULSE_INGEST_TOKEN durante a transição.</div>
            </div>
            <Switch
              checked={status.data?.allowEnvToken ?? true}
              onCheckedChange={(v) =>
                saveSecurity.mutate({
                  require_signature: status.data?.requireSignature ?? false,
                  skew_seconds: skewValue,
                  allow_env_token: v,
                })
              }
            />
          </div>
          <div className="flex items-end gap-3">
            <div className="w-48">
              <Label className="text-xs">Janela de tolerância (segundos)</Label>
              <Input
                type="number"
                min={30}
                max={3600}
                value={skewValue}
                onChange={(e) => setSkew(Math.max(30, Math.min(3600, Number(e.target.value) || 300)))}
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                saveSecurity.mutate({
                  require_signature: status.data?.requireSignature ?? false,
                  skew_seconds: skewValue,
                  allow_env_token: status.data?.allowEnvToken ?? true,
                })
              }
              disabled={saveSecurity.isPending}
            >
              Salvar janela
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Endpoint público</CardTitle>
          <CardDescription>Método POST · Bearer + HMAC · corpo JSON</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">URL</Label>
            <div className="flex gap-2">
              <Input readOnly value={endpoint} className="font-mono text-xs" />
              <Button variant="outline" size="sm" onClick={() => copy(endpoint, "Endpoint")}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <div>
            <Label className="text-xs">Exemplo de chamada assinada</Label>
            <pre className="rounded border bg-muted/40 p-3 text-[11px] leading-relaxed overflow-auto whitespace-pre-wrap font-mono">
{curlSample}
            </pre>
            <div className="flex justify-end mt-1">
              <Button size="sm" variant="ghost" onClick={() => copy(curlSample, "Exemplo curl")}>
                <Copy className="h-3.5 w-3.5 mr-1" /> Copiar exemplo
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <Field label="event_type" value="Obrigatório · ex.: aluno.frequencia" />
            <Field label="external_id" value="Opcional · id no Pulse" />
            <Field label="payload" value="JSON livre com os dados" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4" /> Eventos recebidos
            </CardTitle>
            <CardDescription>
              Total persistido: {status.data?.total ?? "…"} · atualiza a cada 15s
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Input
              placeholder="filtrar por event_type"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="h-8 w-56 text-xs"
            />
            <Button size="sm" variant="outline" onClick={() => events.refetch()}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-40">Recebido em</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>External ID</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Payload</TableHead>
                <TableHead className="w-20 text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(events.data ?? []).map((e: any) => (
                <TableRow key={e.id}>
                  <TableCell className="text-xs">{new Date(e.received_at).toLocaleString("pt-BR")}</TableCell>
                  <TableCell><Badge variant="outline">{e.event_type}</Badge></TableCell>
                  <TableCell className="font-mono text-[11px]">{e.external_id ?? "—"}</TableCell>
                  <TableCell className="text-xs">
                    {e.ip ?? "—"}
                    <div className="text-[10px] text-muted-foreground truncate max-w-[180px]">{e.user_agent ?? ""}</div>
                  </TableCell>
                  <TableCell>
                    <pre className="text-[10px] font-mono max-w-[280px] max-h-16 overflow-auto">
                      {JSON.stringify(e.payload, null, 0)}
                    </pre>
                  </TableCell>
                  <TableCell className="text-right">
                    {e.processed ? <CheckCircle2 className="h-3.5 w-3.5 text-success inline" /> : <Badge variant="secondary" className="text-[10px]">novo</Badge>}
                  </TableCell>
                </TableRow>
              ))}
              {events.data && events.data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-6">
                    Nenhum evento recebido ainda.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Confirmação de rotação */}
      <Dialog open={confirmRotate} onOpenChange={setConfirmRotate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rotacionar token de ingestão?</DialogTitle>
            <DialogDescription>
              O token atual deixa de funcionar imediatamente. O Pulse precisará ser reconfigurado com o novo valor.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRotate(false)}>Cancelar</Button>
            <Button onClick={() => rotate.mutate()} disabled={rotate.isPending}>Confirmar rotação</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Token gerado — exibido uma única vez */}
      <Dialog open={Boolean(novoToken)} onOpenChange={(v) => !v && setNovoToken(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo token gerado</DialogTitle>
            <DialogDescription>
              Copie e guarde agora. A plataforma armazena apenas o hash — este valor não poderá ser exibido novamente.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Input readOnly value={novoToken ?? ""} className="font-mono text-xs" />
            <Button variant="outline" size="sm" onClick={() => novoToken && copy(novoToken, "Token")}>
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setNovoToken(null)}>Já copiei</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded border p-2">
      <div className="font-mono text-[11px] text-primary">{label}</div>
      <div className={`text-[11px] text-muted-foreground ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}
