import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bot, Save, Loader2 } from "lucide-react";
import { simulate } from "./_shared";

const BASES = ["dossies-alunos", "bncc-completa", "provas-imagens", "planos-de-aula", "legislacao-mec"];
const MODELOS = ["Llama 3.1 70B (local)", "DeepSeek R1 14B", "GPT-4o", "Claude 3.5 Sonnet", "Gemini 2.5 Pro"];
const ICONES = ["🤖", "🦉", "📚", "✨", "🎓"];

export function AssistentePanel() {
  const [f, setF] = useState({
    nome: "Athena",
    icone: "🦉",
    modelo: "Claude 3.5 Sonnet",
    baseRag: "planos-de-aula",
    baseSecundaria: "bncc-completa",
    tomVoz: "professor" as "professor" | "coach" | "coordenacao",
    citarFontes: true,
    permitirCodigo: false,
    ativo: true,
    systemPrompt:
`Você é a Athena, copiloto pedagógico do professor da rede pública Edu-Gov.
Regras:
1. Sempre alinhar respostas à BNCC e ao currículo estadual vigente.
2. Nunca revelar dados sensíveis de alunos (PII). Utilize apenas dados agregados.
3. Ofereça sugestões de plano de aula, atividades diferenciadas e intervenções pedagógicas.
4. Ao citar documentos, indique nome do arquivo e página quando disponível.
5. Priorize a base de conhecimento indicada; se insuficiente, sinalize a lacuna.`,
  });
  const [saving, setSaving] = useState(false);

  async function salvar() {
    setSaving(true);
    await simulate(1000);
    setSaving(false);
    toast.success("Assistente publicado no widget do professor.");
  }

  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-base font-semibold flex items-center gap-2"><Bot className="h-4 w-4" /> Assistente Virtual do Educador</h2>
        <p className="text-sm text-muted-foreground mt-1">Copiloto de IA embarcado no portal do professor. Configura persona, modelo, RAG e comportamento.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3"><CardTitle className="text-sm">Persona e widget</CardTitle><CardDescription>Aparência exibida ao professor.</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/40 border">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-3xl">{f.icone}</div>
              <div>
                <div className="font-semibold">{f.nome}</div>
                <div className="text-xs text-muted-foreground">{f.modelo}</div>
                <Badge className="mt-1" variant={f.ativo ? "default" : "secondary"}>{f.ativo ? "Ativo" : "Inativo"}</Badge>
              </div>
            </div>
            <div><Label className="text-xs">Nome</Label><Input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} /></div>
            <div>
              <Label className="text-xs">Ícone</Label>
              <div className="flex gap-2 mt-1">
                {ICONES.map((i) => (
                  <button key={i} onClick={() => setF({ ...f, icone: i })} className={`h-10 w-10 rounded-md border text-xl ${f.icone === i ? "border-primary bg-primary/10" : "hover:bg-accent"}`}>{i}</button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1"><Switch checked={f.ativo} onCheckedChange={(v) => setF({ ...f, ativo: v })} /><span className="text-xs">Assistente ativo</span></div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-3"><CardTitle className="text-sm">Modelo, RAG e comportamento</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Modelo</Label>
                <Select value={f.modelo} onValueChange={(v) => setF({ ...f, modelo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MODELOS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Tom de voz</Label>
                <Select value={f.tomVoz} onValueChange={(v: any) => setF({ ...f, tomVoz: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professor">Formal — Professor</SelectItem>
                    <SelectItem value="coach">Motivacional — Coach</SelectItem>
                    <SelectItem value="coordenacao">Direto — Coordenação</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Base RAG prioritária</Label>
                <Select value={f.baseRag} onValueChange={(v) => setF({ ...f, baseRag: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{BASES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Base secundária</Label>
                <Select value={f.baseSecundaria} onValueChange={(v) => setF({ ...f, baseSecundaria: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{BASES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex items-center gap-2"><Switch checked={f.citarFontes} onCheckedChange={(v) => setF({ ...f, citarFontes: v })} /><span className="text-xs">Citar fontes</span></div>
              <div className="flex items-center gap-2"><Switch checked={f.permitirCodigo} onCheckedChange={(v) => setF({ ...f, permitirCodigo: v })} /><span className="text-xs">Permitir geração de código</span></div>
            </div>

            <div>
              <Label className="text-xs">System Prompt</Label>
              <Textarea rows={10} className="font-mono text-xs mt-1" value={f.systemPrompt} onChange={(e) => setF({ ...f, systemPrompt: e.target.value })} />
              <p className="text-[11px] text-muted-foreground mt-1">Prompt injetado antes de toda conversa do professor com o assistente.</p>
            </div>

            <div className="flex justify-end">
              <Button size="sm" onClick={salvar} disabled={saving}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                Publicar assistente
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
