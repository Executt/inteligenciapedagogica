import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listPulseEvents, getPulseIngestStatus } from "@/lib/admin/pulse.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Activity, Webhook, Copy, RefreshCw, ShieldCheck, CheckCircle2, AlertCircle } from "lucide-react";

export function IntegracaoPulsePanel() {
  const listFn = useServerFn(listPulseEvents);
  const statusFn = useServerFn(getPulseIngestStatus);
  const [filter, setFilter] = useState("");

  const status = useQuery({
    queryKey: ["admin", "pulse", "status"],
    queryFn: () => statusFn({ data: undefined as any }),
  });

  const events = useQuery({
    queryKey: ["admin", "pulse", "events", filter],
    queryFn: () => listFn({ data: { limit: 100, event_type: filter || undefined } }),
    refetchInterval: 15000,
  });

  const endpoint = useMemo(() => {
    if (typeof window === "undefined") return "/api/public/pulse/ingest";
    return `${window.location.origin}/api/public/pulse/ingest`;
  }, []);

  const curlSample = `curl -X POST '${endpoint}' \\
  -H 'authorization: Bearer <PULSE_INGEST_TOKEN>' \\
  -H 'content-type: application/json' \\
  -d '{"event_type":"aluno.frequencia","external_id":"a-1024","payload":{"nome":"Ana","presenca":0.92}}'`;

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
          envie eventos para o Edu-Gov. O token vive no cofre de segredos como{" "}
          <span className="font-mono">PULSE_INGEST_TOKEN</span> e nunca é exibido aqui.
        </p>
      </header>

      {configured === false && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Token <span className="font-mono">PULSE_INGEST_TOKEN</span> não está configurado no servidor.
            O endpoint responderá 503 até que ele seja provisionado.
          </AlertDescription>
        </Alert>
      )}

      {configured && (
        <Alert>
          <ShieldCheck className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Endpoint pronto. Compartilhe apenas o valor do token com o operador do Pulse — a plataforma valida o
            header <span className="font-mono">Authorization: Bearer …</span> em cada requisição.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Endpoint público</CardTitle>
          <CardDescription>Método POST · autenticação Bearer · corpo JSON</CardDescription>
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
            <Label className="text-xs">Exemplo de chamada</Label>
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
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border p-2">
      <div className="font-mono text-[11px] text-primary">{label}</div>
      <div className="text-[11px] text-muted-foreground">{value}</div>
    </div>
  );
}
