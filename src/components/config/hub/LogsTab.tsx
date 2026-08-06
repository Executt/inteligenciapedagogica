import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { listConnectors, listConnectorLogs } from "@/lib/hub/connectors.functions";
import { listSyncRuns } from "@/lib/hub/sync.functions";
import { ERROR_CATEGORIES, categorizeError } from "@/lib/hub/mapping";
import { exportCSV, exportPDF, type ExportColumn } from "@/lib/hub/export";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, FileDown, Printer, ScrollText } from "lucide-react";

type Linha = {
  id: string;
  fonte: "log" | "sincronizacao";
  connector_id: string;
  operacao: string;
  status: string;
  duracao_ms: number | null;
  mensagem: string;
  categoria: string;
  created_at: string;
};

export function LogsTab() {
  const connsFn = useServerFn(listConnectors);
  const logsFn = useServerFn(listConnectorLogs);
  const runsFn = useServerFn(listSyncRuns);

  const [conector, setConector] = useState("todos");
  const [status, setStatus] = useState("todos");
  const [categoria, setCategoria] = useState("todas");
  const [busca, setBusca] = useState("");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");

  const { data: conectores = [] } = useQuery({ queryKey: ["hub", "connectors"], queryFn: () => connsFn({}) });
  const { data: logs = [] } = useQuery({ queryKey: ["hub", "logs"], queryFn: () => logsFn({ data: {} }) });
  const { data: runs = [] } = useQuery({ queryKey: ["hub", "runs"], queryFn: () => runsFn({ data: {} }) });

  const nomeConector = useMemo(
    () => Object.fromEntries((conectores as any[]).map((c) => [c.id, c.nome])),
    [conectores],
  );

  const linhas = useMemo<Linha[]>(() => {
    const a: Linha[] = (logs as any[]).map((l) => ({
      id: l.id,
      fonte: "log",
      connector_id: l.connector_id,
      operacao: l.operacao,
      status: l.status,
      duracao_ms: l.duracao_ms,
      mensagem: l.mensagem ?? "",
      categoria: l.status === "erro" ? categorizeError(l.mensagem) : "—",
      created_at: l.created_at,
    }));
    const b: Linha[] = (runs as any[]).map((r) => ({
      id: r.id,
      fonte: "sincronizacao",
      connector_id: r.connector_id,
      operacao: `sync ${r.gatilho} · ${r.registros_validos}/${r.registros_lidos} ok`,
      status: r.status,
      duracao_ms: r.duracao_ms,
      mensagem: r.mensagem ?? "",
      categoria: r.categoria_erro ?? (r.status === "erro" ? categorizeError(r.mensagem) : "—"),
      created_at: r.created_at,
    }));
    return [...a, ...b].sort((x, y) => +new Date(y.created_at) - +new Date(x.created_at));
  }, [logs, runs]);

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const desde = de ? new Date(`${de}T00:00:00`).getTime() : null;
    const limite = ate ? new Date(`${ate}T23:59:59`).getTime() : null;
    return linhas.filter((l) => {
      if (conector !== "todos" && l.connector_id !== conector) return false;
      if (status !== "todos" && l.status !== status) return false;
      if (categoria !== "todas" && l.categoria !== categoria) return false;
      const t = +new Date(l.created_at);
      if (desde && t < desde) return false;
      if (limite && t > limite) return false;
      if (termo) {
        const alvo = `${nomeConector[l.connector_id] ?? ""} ${l.operacao} ${l.mensagem} ${l.status}`.toLowerCase();
        if (!alvo.includes(termo)) return false;
      }
      return true;
    });
  }, [linhas, conector, status, categoria, busca, de, ate, nomeConector]);

  const porCategoria = useMemo(
    () =>
      ERROR_CATEGORIES.map((c) => ({ ...c, qtd: filtradas.filter((l) => l.status === "erro" && l.categoria === c.id).length }))
        .filter((c) => c.qtd > 0),
    [filtradas],
  );

  const colunas: Array<ExportColumn<Linha>> = [
    { id: "data", rotulo: "Data", valor: (l) => new Date(l.created_at).toLocaleString("pt-BR") },
    { id: "conector", rotulo: "Conector", valor: (l) => nomeConector[l.connector_id] ?? "—" },
    { id: "fonte", rotulo: "Fonte", valor: (l) => l.fonte },
    { id: "operacao", rotulo: "Operação", valor: (l) => l.operacao },
    { id: "status", rotulo: "Status", valor: (l) => l.status },
    { id: "categoria", rotulo: "Categoria do erro", valor: (l) => ERROR_CATEGORIES.find((c) => c.id === l.categoria)?.rotulo ?? l.categoria },
    { id: "duracao", rotulo: "Duração (ms)", valor: (l) => l.duracao_ms ?? "" },
    { id: "mensagem", rotulo: "Mensagem", valor: (l) => l.mensagem },
  ];

  const resumo = `${filtradas.length} registro(s) · ${filtradas.filter((l) => l.status === "erro").length} erro(s)`;

  return (
    <div className="space-y-4">
      <div className="flex items-end flex-wrap gap-3">
        <div className="flex-1 min-w-56">
          <Label className="text-xs">Buscar</Label>
          <div className="relative">
            <Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" />
            <Input className="pl-8" value={busca} onChange={(e) => setBusca(e.target.value)}
              placeholder="conector, operação, mensagem…" />
          </div>
        </div>
        <div className="min-w-48">
          <Label className="text-xs">Conector</Label>
          <Select value={conector} onValueChange={setConector}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {(conectores as any[]).map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-36">
          <Label className="text-xs">Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["todos", "sucesso", "aviso", "erro"].map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-48">
          <Label className="text-xs">Categoria do erro</Label>
          <Select value={categoria} onValueChange={setCategoria}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              {ERROR_CATEGORIES.map((c) => <SelectItem key={c.id} value={c.id}>{c.rotulo}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">De</Label>
          <Input type="date" value={de} onChange={(e) => setDe(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Até</Label>
          <Input type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline"><ScrollText className="h-3 w-3 mr-1" />{filtradas.length} registro(s)</Badge>
          {porCategoria.map((c) => <Badge key={c.id} variant="destructive">{c.rotulo}: {c.qtd}</Badge>)}
          {porCategoria.length === 0 && <span className="text-xs text-muted-foreground">Nenhum erro no período filtrado.</span>}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={!filtradas.length}
            onClick={() => { exportCSV("integration-hub-logs", colunas, filtradas); toast.success("CSV exportado."); }}>
            <FileDown className="h-4 w-4 mr-1" /> CSV
          </Button>
          <Button size="sm" variant="outline" disabled={!filtradas.length}
            onClick={() => {
              try { exportPDF("Integration Hub — logs e histórico", colunas, filtradas, resumo); }
              catch (e: any) { toast.error(e?.message ?? "Falha ao gerar PDF."); }
            }}>
            <Printer className="h-4 w-4 mr-1" /> PDF
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Conector</TableHead>
              <TableHead>Operação</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Duração</TableHead>
              <TableHead>Mensagem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtradas.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-muted-foreground">Nenhum registro para os filtros aplicados.</TableCell></TableRow>
            )}
            {filtradas.slice(0, 300).map((l) => (
              <TableRow key={`${l.fonte}-${l.id}`}>
                <TableCell className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString("pt-BR")}</TableCell>
                <TableCell className="text-sm">{nomeConector[l.connector_id] ?? "—"}</TableCell>
                <TableCell className="text-xs">{l.operacao}</TableCell>
                <TableCell>
                  <Badge variant={l.status === "erro" ? "destructive" : l.status === "aviso" ? "outline" : "default"} className="capitalize">
                    {l.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs">{ERROR_CATEGORIES.find((c) => c.id === l.categoria)?.rotulo ?? "—"}</TableCell>
                <TableCell className="text-sm">{l.duracao_ms ?? "—"} ms</TableCell>
                <TableCell className="text-xs max-w-[320px] truncate" title={l.mensagem}>{l.mensagem}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
