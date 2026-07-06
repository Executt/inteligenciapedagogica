import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAuditLogs } from "@/lib/admin/audit.functions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, Search } from "lucide-react";

const COLOR_BY_ACAO: Record<string, string> = {
  "auth.login": "border-emerald-600 text-emerald-700",
  "auth.login_failed": "border-destructive text-destructive",
  "auth.password_change": "border-blue-600 text-blue-700",
  "user.create": "border-blue-600 text-blue-700",
  "user.deactivate": "border-destructive text-destructive",
  "user.activate": "border-emerald-600 text-emerald-700",
  "user.role_change": "border-yellow-600 text-yellow-700",
  "role.grant": "border-yellow-600 text-yellow-700",
  "role.revoke": "border-yellow-600 text-yellow-700",
  "settings.update": "border-purple-600 text-purple-700",
};

export function AuditPanel() {
  const list = useServerFn(listAuditLogs);
  const [busca, setBusca] = useState("");
  const [desde, setDesde] = useState("");
  const [ate, setAte] = useState("");

  const { data = [], isFetching, refetch } = useQuery({
    queryKey: ["admin", "audit", busca, desde, ate],
    queryFn: () => list({ data: { busca: busca || undefined, desde: desde || undefined, ate: ate || undefined, limit: 300 } }),
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_180px_auto] gap-3 items-end">
        <div>
          <Label className="text-xs">Buscar por ação, e-mail, entidade</Label>
          <div className="relative mt-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="auth.login, superadmin@…" className="pl-9" />
          </div>
        </div>
        <div>
          <Label className="text-xs">De</Label>
          <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">Até</Label>
          <Input type="date" value={ate} onChange={(e) => setAte(e.target.value)} className="mt-1" />
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      <div className="rounded-md border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[170px]">Quando</TableHead>
              <TableHead>Ação</TableHead>
              <TableHead>Ator</TableHead>
              <TableHead>Entidade</TableHead>
              <TableHead>IP</TableHead>
              <TableHead>Detalhes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                {isFetching ? "Carregando…" : "Nenhum evento encontrado."}
              </TableCell></TableRow>
            )}
            {data.map((row: any) => (
              <TableRow key={row.id}>
                <TableCell className="text-xs whitespace-nowrap">{new Date(row.created_at).toLocaleString("pt-BR")}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={COLOR_BY_ACAO[row.acao] ?? ""}>{row.acao}</Badge>
                </TableCell>
                <TableCell className="text-xs">{row.actor_email ?? row.actor_id?.slice(0, 8) ?? "sistema"}</TableCell>
                <TableCell className="text-xs">{row.entidade ?? "—"}</TableCell>
                <TableCell className="text-xs font-mono">{row.ip ?? "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                  {row.metadados && Object.keys(row.metadados).length > 0 ? JSON.stringify(row.metadados) : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
