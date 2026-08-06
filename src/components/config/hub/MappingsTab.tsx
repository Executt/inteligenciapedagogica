import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { listConnectors } from "@/lib/hub/connectors.functions";
import { listMappings, saveMapping, deleteMapping, previewMapping } from "@/lib/hub/mappings.functions";
import { AGGREGATE_LABEL, SYNC_AGGREGATES, TARGET_FIELDS, TRANSFORMS } from "@/lib/hub/mapping";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Wand2, ShieldCheck, Copy } from "lucide-react";

export function MappingsTab() {
  const qc = useQueryClient();
  const connsFn = useServerFn(listConnectors);
  const mapsFn = useServerFn(listMappings);
  const saveFn = useServerFn(saveMapping);
  const delFn = useServerFn(deleteMapping);
  const previewFn = useServerFn(previewMapping);

  const { data: conectores = [] } = useQuery({ queryKey: ["hub", "connectors"], queryFn: () => connsFn({}) });
  const [connectorId, setConnectorId] = useState<string>("");
  const [agregado, setAgregado] = useState<string>("student");
  const conectorAtual = connectorId || (conectores as any[])[0]?.id || "";

  const { data: mappings = [] } = useQuery({
    queryKey: ["hub", "mappings", conectorAtual],
    queryFn: () => mapsFn({ data: { connector_id: conectorAtual } }),
    enabled: !!conectorAtual,
  });

  const doAgregado = useMemo(
    () => (mappings as any[]).filter((m) => m.agregado === agregado).sort((a, b) => a.ordem - b.ordem),
    [mappings, agregado],
  );

  const [novo, setNovo] = useState<any>({
    campo_origem: "", campo_destino: "", transformacao: "nenhuma", obrigatorio: false,
    validacao: "", chave_deduplicacao: false, valor_padrao: "", ordem: 0,
  });
  const [amostra, setAmostra] = useState("");
  const [previa, setPrevia] = useState<any | null>(null);

  const salvar = useMutation({
    mutationFn: (p: any) => saveFn({ data: { ...p, connector_id: conectorAtual, agregado } }),
    onSuccess: () => {
      toast.success("Regra de mapeamento salva.");
      setNovo({ campo_origem: "", campo_destino: "", transformacao: "nenhuma", obrigatorio: false, validacao: "", chave_deduplicacao: false, valor_padrao: "", ordem: doAgregado.length });
      qc.invalidateQueries({ queryKey: ["hub", "mappings"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao salvar regra."),
  });

  const excluir = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Regra removida."); qc.invalidateQueries({ queryKey: ["hub", "mappings"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao remover."),
  });

  const testar = useMutation({
    mutationFn: () => previewFn({ data: { connector_id: conectorAtual, agregado: agregado as any, amostra_json: amostra || null, limite: 10 } }),
    onSuccess: (r: any) => { setPrevia(r); toast.success(`Prévia gerada a partir da ${r.fonte}.`); },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao gerar prévia."),
  });

  if (!(conectores as any[]).length) {
    return <p className="text-sm text-muted-foreground">Cadastre um conector antes de definir regras de mapeamento.</p>;
  }

  const campos = TARGET_FIELDS[agregado as keyof typeof TARGET_FIELDS];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Regras de mapeamento e transformação por conector para os agregados aluno, escola e nota, com validações
        e detecção de duplicidades por chave de negócio.
      </p>

      <div className="flex flex-wrap gap-3">
        <div className="min-w-64">
          <Label className="text-xs">Conector</Label>
          <Select value={conectorAtual} onValueChange={setConnectorId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(conectores as any[]).map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-56">
          <Label className="text-xs">Agregado</Label>
          <Select value={agregado} onValueChange={(v) => { setAgregado(v); setPrevia(null); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {SYNC_AGGREGATES.map((a) => <SelectItem key={a} value={a}>{AGGREGATE_LABEL[a]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Campo de origem</TableHead>
              <TableHead>Campo interno</TableHead>
              <TableHead>Transformação</TableHead>
              <TableHead>Obrigatório</TableHead>
              <TableHead>Validação</TableHead>
              <TableHead>Chave dup.</TableHead>
              <TableHead className="text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {doAgregado.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-muted-foreground">Nenhuma regra para este agregado.</TableCell></TableRow>
            )}
            {doAgregado.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="font-mono text-xs">{m.campo_origem}</TableCell>
                <TableCell className="text-sm">{m.campo_destino}</TableCell>
                <TableCell className="text-sm">{TRANSFORMS.find((t) => t.id === m.transformacao)?.rotulo ?? m.transformacao}</TableCell>
                <TableCell>{m.obrigatorio ? <Badge>sim</Badge> : <span className="text-xs text-muted-foreground">não</span>}</TableCell>
                <TableCell className="font-mono text-xs max-w-[180px] truncate">{m.validacao || "—"}</TableCell>
                <TableCell>{m.chave_deduplicacao ? <Badge variant="secondary"><ShieldCheck className="h-3 w-3 mr-1" />chave</Badge> : "—"}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => excluir.mutate(m.id)}><Trash2 className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Card className="p-4 space-y-3">
        <div className="text-sm font-semibold">Nova regra</div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <Label>Campo de origem</Label>
            <Input value={novo.campo_origem} placeholder="aluno.matricula"
              onChange={(e) => setNovo({ ...novo, campo_origem: e.target.value })} />
          </div>
          <div>
            <Label>Campo interno</Label>
            <Select value={novo.campo_destino} onValueChange={(v) => setNovo({ ...novo, campo_destino: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {campos.map((c) => <SelectItem key={c.id} value={c.id}>{c.rotulo}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Transformação</Label>
            <Select value={novo.transformacao} onValueChange={(v) => setNovo({ ...novo, transformacao: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TRANSFORMS.map((t) => <SelectItem key={t.id} value={t.id}>{t.rotulo}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Validação (expressão regular)</Label>
            <Input value={novo.validacao} placeholder="^\\d{6,12}$"
              onChange={(e) => setNovo({ ...novo, validacao: e.target.value })} />
          </div>
          <div>
            <Label>Valor padrão</Label>
            <Input value={novo.valor_padrao} onChange={(e) => setNovo({ ...novo, valor_padrao: e.target.value })} />
          </div>
          <div className="flex items-end gap-4">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={novo.obrigatorio} onCheckedChange={(v) => setNovo({ ...novo, obrigatorio: v })} /> Obrigatório
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={novo.chave_deduplicacao} onCheckedChange={(v) => setNovo({ ...novo, chave_deduplicacao: v })} /> Chave
            </label>
          </div>
        </div>
        <Button size="sm" disabled={salvar.isPending} onClick={() => {
          if (!novo.campo_origem || !novo.campo_destino) return toast.error("Informe origem e campo interno.");
          salvar.mutate({ ...novo, ordem: doAgregado.length });
        }}><Plus className="h-4 w-4 mr-1" /> Adicionar regra</Button>
      </Card>

      <Card className="p-4 space-y-3">
        <div className="text-sm font-semibold flex items-center gap-2"><Wand2 className="h-4 w-4" /> Pré-visualizar transformação</div>
        <p className="text-xs text-muted-foreground">
          Cole uma amostra JSON do sistema de origem ou deixe em branco para extrair diretamente do conector.
        </p>
        <Textarea rows={4} className="font-mono text-xs" value={amostra} onChange={(e) => setAmostra(e.target.value)}
          placeholder='[{"matricula":"00123","nome":"maria da silva","nasc":"12/03/2014"}]' />
        <Button size="sm" variant="outline" disabled={testar.isPending} onClick={() => testar.mutate()}>
          {testar.isPending ? "Processando…" : "Gerar prévia"}
        </Button>

        {previa && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge>{previa.validos} válido(s)</Badge>
              <Badge variant="destructive">{previa.rejeitados} rejeitado(s)</Badge>
              <Badge variant="secondary">{previa.duplicados} duplicado(s)</Badge>
              {Object.entries(previa.errosPorCampo as Record<string, number>).map(([campo, qtd]) => (
                <Badge key={campo} variant="outline">{campo}: {qtd} erro(s)</Badge>
              ))}
            </div>
            <div className="max-h-72 overflow-auto rounded-md border divide-y">
              {previa.linhas.map((l: any) => (
                <div key={l.indice} className="p-2 text-xs space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">#{l.indice + 1}</span>
                    {l.duplicado && <Badge variant="secondary">duplicado</Badge>}
                    {l.erros.length > 0 && <Badge variant="destructive">{l.erros.length} erro(s)</Badge>}
                    <Button variant="ghost" size="icon" className="h-6 w-6"
                      onClick={() => { navigator.clipboard.writeText(JSON.stringify(l.registro, null, 2)); toast.success("Registro copiado."); }}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <pre className="font-mono whitespace-pre-wrap">{JSON.stringify(l.registro)}</pre>
                  {l.erros.length > 0 && <div className="text-destructive">{l.erros.join(" · ")}</div>}
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
