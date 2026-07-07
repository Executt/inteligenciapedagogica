import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Cpu, BrainCircuit, Plus, Trash2, Save, Loader2 } from "lucide-react";
import { simulate } from "./_shared";

export type Modelo = {
  id: string;
  nome: string;
  provedor: string;
  endpoint?: string;
  keyRef?: string;
  temperature: number;
  topP: number;
  maxTokens: number;
  contextWindow: number;
  habilitado: boolean;
  categoria: "oss" | "paga";
};

const MOCK_OSS: Modelo[] = [
  { id: "m1", categoria: "oss", nome: "Llama 3.1 70B (local)", provedor: "Ollama", endpoint: "http://ollama.cortex.svc:11434", temperature: 0.3, topP: 0.9, maxTokens: 4096, contextWindow: 32000, habilitado: true },
  { id: "m2", categoria: "oss", nome: "DeepSeek R1 14B", provedor: "Ollama", endpoint: "http://ollama.cortex.svc:11434", temperature: 0.2, topP: 0.9, maxTokens: 8192, contextWindow: 64000, habilitado: true },
  { id: "m3", categoria: "oss", nome: "Qwen 2.5 14B (vLLM)", provedor: "vLLM", endpoint: "http://vllm.cortex.svc:8000", temperature: 0.4, topP: 0.95, maxTokens: 4096, contextWindow: 32000, habilitado: false },
];

const MOCK_PAID: Modelo[] = [
  { id: "p1", categoria: "paga", nome: "GPT-4o", provedor: "OpenAI", keyRef: "OPENAI_API_KEY", temperature: 0.4, topP: 1, maxTokens: 8192, contextWindow: 128000, habilitado: true },
  { id: "p2", categoria: "paga", nome: "Claude 3.5 Sonnet", provedor: "Anthropic", keyRef: "ANTHROPIC_API_KEY", temperature: 0.3, topP: 1, maxTokens: 8192, contextWindow: 200000, habilitado: true },
  { id: "p3", categoria: "paga", nome: "Gemini 2.5 Pro", provedor: "Google", keyRef: "GOOGLE_API_KEY", temperature: 0.5, topP: 0.95, maxTokens: 8192, contextWindow: 1000000, habilitado: true },
];

export function ModelosIAPanel({ categoria }: { categoria: "oss" | "paga" }) {
  const [modelos, setModelos] = useState<Modelo[]>(categoria === "oss" ? MOCK_OSS : MOCK_PAID);
  const [saving, setSaving] = useState<string | null>(null);

  async function salvar(m: Modelo) {
    setSaving(m.id);
    await simulate(700);
    setSaving(null);
    toast.success(`Parâmetros de "${m.nome}" salvos.`);
  }

  const Icon = categoria === "oss" ? Cpu : BrainCircuit;

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold flex items-center gap-2"><Icon className="h-4 w-4" /> {categoria === "oss" ? "IA Open Source" : "IA Pagas"}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {categoria === "oss" ? "Modelos locais para dados sensíveis (LGPD)." : "Provedores externos para dados anonimizados/não sensíveis."}
          </p>
        </div>
        <NovoModelo categoria={categoria} onAdd={(m) => setModelos((ms) => [...ms, m])} />
      </header>

      <Accordion type="multiple" defaultValue={modelos.map((m) => m.id).slice(0, 1)}>
        {modelos.map((m) => (
          <AccordionItem key={m.id} value={m.id}>
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3 flex-1 pr-3">
                <Badge variant="outline">{m.provedor}</Badge>
                <span className="font-medium text-sm">{m.nome}</span>
                <span className="text-xs text-muted-foreground ml-auto">ctx {(m.contextWindow / 1000).toFixed(0)}k · tok {m.maxTokens}</span>
                <Badge variant={m.habilitado ? "default" : "secondary"} className="ml-2">{m.habilitado ? "Ativo" : "Inativo"}</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <Card>
                <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-3">
                    <div><Label className="text-xs">Nome</Label><Input value={m.nome} onChange={(e) => setModelos((ms) => ms.map((x) => x.id === m.id ? { ...x, nome: e.target.value } : x))} /></div>
                    <div><Label className="text-xs">Provedor</Label><Input value={m.provedor} onChange={(e) => setModelos((ms) => ms.map((x) => x.id === m.id ? { ...x, provedor: e.target.value } : x))} /></div>
                    {categoria === "oss" ? (
                      <div><Label className="text-xs">Endpoint</Label><Input value={m.endpoint ?? ""} onChange={(e) => setModelos((ms) => ms.map((x) => x.id === m.id ? { ...x, endpoint: e.target.value } : x))} /></div>
                    ) : (
                      <div><Label className="text-xs">Chave (ref. secret)</Label><Input value={m.keyRef ?? ""} onChange={(e) => setModelos((ms) => ms.map((x) => x.id === m.id ? { ...x, keyRef: e.target.value } : x))} /></div>
                    )}
                    <div className="flex items-center gap-2 pt-1">
                      <Switch checked={m.habilitado} onCheckedChange={(v) => setModelos((ms) => ms.map((x) => x.id === m.id ? { ...x, habilitado: v } : x))} />
                      <span className="text-xs">Habilitado no roteamento</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <SliderField label="Temperature" value={m.temperature} min={0} max={2} step={0.05}
                      onChange={(v) => setModelos((ms) => ms.map((x) => x.id === m.id ? { ...x, temperature: v } : x))} />
                    <SliderField label="Top P" value={m.topP} min={0} max={1} step={0.05}
                      onChange={(v) => setModelos((ms) => ms.map((x) => x.id === m.id ? { ...x, topP: v } : x))} />
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label className="text-xs">Max Tokens</Label><Input type="number" value={m.maxTokens} onChange={(e) => setModelos((ms) => ms.map((x) => x.id === m.id ? { ...x, maxTokens: Number(e.target.value) } : x))} /></div>
                      <div><Label className="text-xs">Context Window</Label><Input type="number" value={m.contextWindow} onChange={(e) => setModelos((ms) => ms.map((x) => x.id === m.id ? { ...x, contextWindow: Number(e.target.value) } : x))} /></div>
                    </div>
                  </div>

                  <div className="md:col-span-2 flex items-center justify-end gap-2 pt-2 border-t">
                    <Button variant="ghost" size="sm" onClick={() => setModelos((ms) => ms.filter((x) => x.id !== m.id))}>
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Remover
                    </Button>
                    <Button size="sm" onClick={() => salvar(m)} disabled={saving === m.id}>
                      {saving === m.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                      Salvar parâmetros
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

function SliderField({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1"><Label className="text-xs">{label}</Label><span className="font-mono text-muted-foreground">{value.toFixed(2)}</span></div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v)} />
    </div>
  );
}

function NovoModelo({ categoria, onAdd }: { categoria: "oss" | "paga"; onAdd: (m: Modelo) => void }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ nome: "", provedor: categoria === "oss" ? "Ollama" : "OpenAI", ref: "" });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Novo modelo</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Cadastrar modelo</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label className="text-xs">Nome</Label><Input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} placeholder="ex.: Llama 3.1 70B" /></div>
          <div>
            <Label className="text-xs">Provedor</Label>
            {categoria === "oss" ? (
              <Select value={f.provedor} onValueChange={(v) => setF({ ...f, provedor: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ollama">Ollama</SelectItem>
                  <SelectItem value="vLLM">vLLM</SelectItem>
                  <SelectItem value="TGI">TGI</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Select value={f.provedor} onValueChange={(v) => setF({ ...f, provedor: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="OpenAI">OpenAI</SelectItem>
                  <SelectItem value="Anthropic">Anthropic</SelectItem>
                  <SelectItem value="Google">Google</SelectItem>
                  <SelectItem value="Mistral">Mistral</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
          <div><Label className="text-xs">{categoria === "oss" ? "Endpoint" : "Chave (ref. secret)"}</Label><Input value={f.ref} onChange={(e) => setF({ ...f, ref: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button onClick={async () => {
            await simulate(400);
            onAdd({
              id: crypto.randomUUID(), categoria, nome: f.nome || "Novo modelo", provedor: f.provedor,
              endpoint: categoria === "oss" ? f.ref : undefined, keyRef: categoria === "paga" ? f.ref : undefined,
              temperature: 0.3, topP: 0.95, maxTokens: 4096, contextWindow: 32000, habilitado: true,
            });
            setOpen(false); toast.success("Modelo cadastrado.");
          }}>Cadastrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
