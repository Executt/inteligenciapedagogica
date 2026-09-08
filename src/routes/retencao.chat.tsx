import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Send, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { conversasRetencao, respostasRapidas } from "@/lib/retencao-data";

export const Route = createFileRoute("/retencao/chat")({
  component: ChatRapido,
  head: () => ({
    meta: [
      { title: "Chat Rápido · Retenção Estudantil · Edu-Gov" },
      { name: "description", content: "Canal rápido de comunicação com responsáveis e equipe pedagógica no acompanhamento de retenção." },
      { property: "og:title", content: "Chat Rápido · Retenção Estudantil · Edu-Gov" },
      { property: "og:description", content: "Canal rápido de comunicação com responsáveis e equipe pedagógica no acompanhamento de retenção." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Mensagem = { id: string; de: "escola" | "responsavel"; texto: string; horario: string };

function ChatRapido() {
  const [ativa, setAtiva] = useState(conversasRetencao[0].id);
  const [extras, setExtras] = useState<Record<string, Mensagem[]>>({});
  const [texto, setTexto] = useState("");

  const conversa = useMemo(
    () => conversasRetencao.find((c) => c.id === ativa)!,
    [ativa],
  );
  const mensagens = [...conversa.mensagens, ...(extras[conversa.id] ?? [])];

  function enviar() {
    const valor = texto.trim();
    if (!valor) return;
    const horario = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    setExtras((prev) => ({
      ...prev,
      [conversa.id]: [...(prev[conversa.id] ?? []), { id: `n${Date.now()}`, de: "escola", texto: valor, horario }],
    }));
    setTexto("");
    toast.success(`Mensagem enviada para ${conversa.responsavel} via ${conversa.canal}.`);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] gap-6">
      <Card className="h-fit">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" aria-hidden="true" /> Conversas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2">
          <ul className="space-y-1" role="list">
            {conversasRetencao.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setAtiva(c.id)}
                  aria-current={c.id === ativa ? "true" : undefined}
                  className={cn(
                    "w-full text-left rounded-sm px-3 py-2 border-l-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    c.id === ativa
                      ? "bg-accent border-primary"
                      : "border-transparent hover:bg-accent/60",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate">{c.responsavel}</span>
                    <span className="text-[11px] text-muted-foreground shrink-0">{c.horario}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">{c.aluno}</div>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">{c.canal}</Badge>
                    {c.naoLidas > 0 && (
                      <Badge variant="destructive" className="text-[10px]">{c.naoLidas} nova(s)</Badge>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="min-w-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{conversa.responsavel}</CardTitle>
          <p className="text-xs text-muted-foreground">{conversa.aluno} · canal {conversa.canal}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1" aria-live="polite">
            {mensagens.map((m) => (
              <div key={m.id} className={cn("flex", m.de === "escola" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[75%] rounded-md px-3 py-2 text-sm",
                    m.de === "escola"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground",
                  )}
                >
                  <p className="whitespace-pre-wrap">{m.texto}</p>
                  <div className={cn("mt-1 text-[10px]", m.de === "escola" ? "text-primary-foreground/70" : "text-muted-foreground")}>
                    {m.de === "escola" ? "Equipe escolar" : conversa.responsavel} · {m.horario}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {respostasRapidas.map((r) => (
              <Button key={r} type="button" variant="secondary" size="sm" onClick={() => setTexto(r)}>
                {r}
              </Button>
            ))}
          </div>

          <div className="space-y-2">
            <label htmlFor="mensagem-chat" className="text-sm font-medium">Mensagem</label>
            <Textarea
              id="mensagem-chat"
              rows={3}
              placeholder="Escreva a mensagem para o responsável..."
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
            />
            <div className="flex justify-end">
              <Button type="button" onClick={enviar} disabled={!texto.trim()}>
                <Send className="h-4 w-4" aria-hidden="true" />
                Enviar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
