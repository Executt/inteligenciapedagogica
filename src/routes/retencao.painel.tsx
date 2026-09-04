import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/retencao/painel")({
  component: PainelRetencao,
  head: () => ({
    meta: [
      { title: "Painel de Indicadores · Retenção Estudantil · Edu-Gov" },
      { name: "description", content: "Indicadores consolidados de retenção e evasão escolar." },
      { property: "og:title", content: "Painel de Indicadores · Retenção Estudantil · Edu-Gov" },
      { property: "og:description", content: "Indicadores consolidados de retenção e evasão escolar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function PainelRetencao() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Painel de Indicadores</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Módulo em construção. Em breve este espaço exibirá taxas de evasão, retenção e
          comparação por escola, turno e série.
        </p>
      </CardContent>
    </Card>
  );
}
