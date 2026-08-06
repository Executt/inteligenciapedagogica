import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { busMetrics, resumeStalledEvents, drainEvents } from "@/lib/hub/events.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Activity, RefreshCw, PlayCircle } from "lucide-react";

export function BusMonitor() {
  const qc = useQueryClient();
  const metricsFn = useServerFn(busMetrics);
  const resumeFn = useServerFn(resumeStalledEvents);
  const drainFn = useServerFn(drainEvents);

  const { data: m } = useQuery({ queryKey: ["hub", "bus-metrics"], queryFn: () => metricsFn({}), refetchInterval: 30_000 });

  const retomar = useMutation({
    mutationFn: () => resumeFn({}),
    onSuccess: (r: any) => {
      toast.success(r.retomados ? `${r.retomados} evento(s) devolvido(s) à fila.` : "Nenhum evento parado para retomar.");
      qc.invalidateQueries({ queryKey: ["hub"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao retomar."),
  });

  const consumir = useMutation({
    mutationFn: () => drainFn({ data: { limit: 50 } }),
    onSuccess: (r: any) => {
      toast.success(`${r.processados} evento(s) entregue(s); ${r.semConsumidor} sem consumidor.`);
      qc.invalidateQueries({ queryKey: ["hub"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao consumir."),
  });

  const kpis = [
    { r: "Eventos", v: m?.total ?? 0 },
    { r: "Pendentes", v: m?.pendentes ?? 0 },
    { r: "Atraso máximo", v: `${m?.atraso_maximo_min ?? 0} min` },
    { r: "Latência média", v: `${m?.latencia_media_ms ?? 0} ms` },
    { r: "Entregas", v: m?.entregas_total ?? 0 },
    { r: "Entregas com erro", v: m?.entregas_erro ?? 0 },
  ];

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold flex items-center gap-2">
          <Activity className="h-4 w-4" /> Monitoramento do consumo
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={consumir.isPending} onClick={() => consumir.mutate()}>
            <PlayCircle className="h-4 w-4 mr-1" /> Consumir pendentes
          </Button>
          <Button size="sm" variant="outline" disabled={retomar.isPending} onClick={() => retomar.mutate()}>
            <RefreshCw className="h-4 w-4 mr-1" /> Retomada automática
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {kpis.map((k) => (
          <div key={k.r} className="rounded-md border p-2">
            <div className="text-[11px] text-muted-foreground">{k.r}</div>
            <div className="text-base font-semibold">{k.v}</div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Consumidor</TableHead>
              <TableHead>Evento</TableHead>
              <TableHead>Backlog</TableHead>
              <TableHead>Entregas</TableHead>
              <TableHead>Falhas</TableHead>
              <TableHead>Duração média</TableHead>
              <TableHead>Último consumo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(m?.porAssinatura ?? []).length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-muted-foreground">Nenhuma assinatura registrada.</TableCell></TableRow>
            )}
            {(m?.porAssinatura ?? []).map((s: any) => (
              <TableRow key={s.id}>
                <TableCell><Badge variant={s.ativo ? "default" : "secondary"}>{s.consumidor}</Badge></TableCell>
                <TableCell className="font-mono text-xs">{s.evento}</TableCell>
                <TableCell>
                  {s.backlog > 0 ? <Badge variant="outline">{s.backlog} na fila</Badge> : <span className="text-xs text-muted-foreground">0</span>}
                </TableCell>
                <TableCell className="text-sm">{s.entregas}</TableCell>
                <TableCell className="text-sm">
                  {s.falhas > 0 ? <Badge variant="destructive">{s.falhas}</Badge> : "0"}
                </TableCell>
                <TableCell className="text-sm">{s.duracao_media_ms} ms</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {s.ultimo_consumo ? `${new Date(s.ultimo_consumo).toLocaleString("pt-BR")} (${s.atraso_min} min atrás)` : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
