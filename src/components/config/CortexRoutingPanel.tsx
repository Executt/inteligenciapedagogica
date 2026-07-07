import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sparkles, Plus, Trash2, ArrowRight, Loader2, Save } from "lucide-react";
import { simulate } from "./_shared";

type Condicao = "contem_pii" | "ocr_complexo" | "multimodal" | "sumarizacao" | "codigo" | "generico";
type Destino = "local" | "paga";

type Regra = {
  id: string;
  prioridade: number;
  condicao: Condicao;
  operador: "SE" | "SE_NAO";
  destino: Destino;
  modelo: string;
  ativa: boolean;
};

const COND_LABEL: Record<Condicao, string> = {
  contem_pii: "Contém PII (dados sensíveis)",
  ocr_complexo: "OCR complexo (documento escaneado)",
  multimodal: "Entrada multimodal (imagem/PDF)",
  sumarizacao: "Tarefa de sumarização",
  codigo: "Geração de código",
  generico: "Fallback genérico",
};

const MOCK_REGRAS: Regra[] = [
  { id: "r1", prioridade: 1, condicao: "contem_pii", operador: "SE", destino: "local", modelo: "Llama 3.1 70B (local)", ativa: true },
  { id: "r2", prioridade: 2, condicao: "ocr_complexo", operador: "SE", destino: "paga", modelo: "Gemini 2.5 Pro", ativa: true },
  { id: "r3", prioridade: 3, condicao: "multimodal", operador: "SE", destino: "paga", modelo: "GPT-4o", ativa: true },
  { id: "r4", prioridade: 4, condicao: "sumarizacao", operador: "SE", destino: "local", modelo: "DeepSeek R1 14B", ativa: true },
  { id: "r5", prioridade: 99, condicao: "generico", operador: "SE", destino: "paga", modelo: "Claude 3.5 Sonnet", ativa: true },
];

const MODELOS_DISPONIVEIS = ["Llama 3.1 70B (local)", "DeepSeek R1 14B", "Qwen 2.5 14B (vLLM)", "GPT-4o", "Claude 3.5 Sonnet", "Gemini 2.5 Pro"];

export function CortexRoutingPanel() {
  const [regras, setRegras] = useState<Regra[]>(MOCK_REGRAS);
  const [saving, setSaving] = useState(false);
  const [nova, setNova] = useState<Omit<Regra, "id">>({ prioridade: 10, condicao: "generico", operador: "SE", destino: "local", modelo: MODELOS_DISPONIVEIS[0], ativa: true });

  const sorted = [...regras].sort((a, b) => a.prioridade - b.prioridade);

  async function salvar() {
    setSaving(true);
    await simulate(900);
    setSaving(false);
    toast.success("Tabela de roteamento publicada no Córtex.");
  }

  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-base font-semibold flex items-center gap-2"><Sparkles className="h-4 w-4" /> Roteamento do Córtex</h2>
        <p className="text-sm text-muted-foreground mt-1">Tabela de decisão que direciona cada requisição ao modelo apropriado, priorizando LGPD.</p>
      </header>

      <Card className="border-amber-500/40 bg-amber-500/5">
        <CardContent className="py-3 text-xs flex items-center gap-2">
          <Badge variant="destructive">LGPD</Badge>
          <span>Regras com condição <strong>Contém PII</strong> devem sempre ter destino <strong>Modelos Locais</strong>. Alterações são auditadas.</span>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Nova regra</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
            <div>
              <Label className="text-xs">Prioridade</Label>
              <Input type="number" value={nova.prioridade} onChange={(e) => setNova({ ...nova, prioridade: Number(e.target.value) })} />
            </div>
            <div>
              <Label className="text-xs">Operador</Label>
              <Select value={nova.operador} onValueChange={(v: any) => setNova({ ...nova, operador: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SE">SE</SelectItem>
                  <SelectItem value="SE_NAO">SE NÃO</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs">Condição</Label>
              <Select value={nova.condicao} onValueChange={(v: any) => setNova({ ...nova, condicao: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(COND_LABEL) as Condicao[]).map((k) => <SelectItem key={k} value={k}>{COND_LABEL[k]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Destino</Label>
              <Select value={nova.destino} onValueChange={(v: any) => setNova({ ...nova, destino: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="local">Local (OSS)</SelectItem>
                  <SelectItem value="paga">Paga (externa)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Modelo</Label>
              <Select value={nova.modelo} onValueChange={(v) => setNova({ ...nova, modelo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MODELOS_DISPONIVEIS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="md:col-span-6 flex justify-end">
              <Button size="sm" onClick={() => {
                if (nova.condicao === "contem_pii" && nova.destino !== "local") {
                  toast.error("Regras com PII devem ir para modelos locais (LGPD)."); return;
                }
                setRegras((rs) => [...rs, { ...nova, id: crypto.randomUUID() }]);
                toast.success("Regra adicionada.");
              }}><Plus className="h-4 w-4 mr-1" /> Adicionar regra</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
          <div><CardTitle className="text-sm">Tabela de decisão</CardTitle><CardDescription>Avaliada em ordem de prioridade (menor primeiro).</CardDescription></div>
          <Button size="sm" onClick={salvar} disabled={saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
            Publicar roteamento
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Prio</TableHead>
                <TableHead>Regra</TableHead>
                <TableHead className="w-40">Destino</TableHead>
                <TableHead className="w-56">Modelo</TableHead>
                <TableHead className="w-20">Ativa</TableHead>
                <TableHead className="w-16 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono">{r.prioridade}</TableCell>
                  <TableCell className="text-sm">
                    <span className="text-muted-foreground mr-1">{r.operador}</span>
                    <span>{COND_LABEL[r.condicao]}</span>
                    <ArrowRight className="h-3 w-3 inline mx-2 text-muted-foreground" />
                  </TableCell>
                  <TableCell>
                    <Badge variant={r.destino === "local" ? "default" : "outline"}>{r.destino === "local" ? "Local (OSS)" : "Paga (externa)"}</Badge>
                  </TableCell>
                  <TableCell className="text-sm font-mono">{r.modelo}</TableCell>
                  <TableCell><Switch checked={r.ativa} onCheckedChange={(v) => setRegras((rs) => rs.map((x) => x.id === r.id ? { ...x, ativa: v } : x))} /></TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => setRegras((rs) => rs.filter((x) => x.id !== r.id))}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
