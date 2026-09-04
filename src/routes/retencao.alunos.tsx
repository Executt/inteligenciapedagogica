import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/retencao/alunos")({
  component: AlunosRisco,
  head: () => ({
    meta: [
      { title: "Alunos em Risco · Retenção Estudantil · Edu-Gov" },
      { name: "description", content: "Lista de alunos em risco de evasão e acompanhamento de intervenções." },
      { property: "og:title", content: "Alunos em Risco · Retenção Estudantil · Edu-Gov" },
      { property: "og:description", content: "Lista de alunos em risco de evasão e acompanhamento de intervenções." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function AlunosRisco() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Alunos em Risco</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Módulo em construção. Em breve este espaço listará os alunos com sinais de evasão,
          prioridade de atendimento e histórico de intervenções.
        </p>
      </CardContent>
    </Card>
  );
}
