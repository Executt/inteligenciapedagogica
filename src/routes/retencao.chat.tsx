import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/retencao/chat")({
  component: ChatRapido,
  head: () => ({
    meta: [
      { title: "Chat Rápido · Retenção Estudantil · Edu-Gov" },
      { name: "description", content: "Canal rápido de comunicação com responsáveis e equipe pedagógica." },
      { property: "og:title", content: "Chat Rápido · Retenção Estudantil · Edu-Gov" },
      { property: "og:description", content: "Canal rápido de comunicação com responsáveis e equipe pedagógica." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function ChatRapido() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Chat Rápido</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Módulo em construção. Em breve este espaço permitirá o envio de mensagens rápidas
          para responsáveis e equipe escolar integrada ao registro de retenção.
        </p>
      </CardContent>
    </Card>
  );
}
