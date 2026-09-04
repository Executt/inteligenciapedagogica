import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/retencao")({
  component: RetencaoLayout,
  head: () => ({
    meta: [
      { title: "Retenção Estudantil · Edu-Gov" },
      { name: "description", content: "Portal de retenção estudantil: indicadores, alunos em risco e registro de intervenções." },
      { property: "og:title", content: "Retenção Estudantil · Edu-Gov" },
      { property: "og:description", content: "Portal de retenção estudantil: indicadores, alunos em risco e registro de intervenções." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const tabs = [
  { to: "/retencao/painel", label: "Painel de Indicadores" },
  { to: "/retencao/alunos", label: "Alunos em Risco" },
  { to: "/retencao/registrar", label: "Registrar Intervenção" },
  { to: "/retencao/chat", label: "Chat Rápido" },
];

function RetencaoLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate({ from: "/retencao" });

  return (
    <AppShell>
      <div className="p-8 max-w-[1400px] mx-auto">
        <PageHeader
          title="Retenção Estudantil"
          subtitle="Acompanhamento de indicadores e intervenções para reduzir a evasão escolar."
        />
        <Tabs value={pathname}>
          <TabsList className="mb-6">
            {tabs.map((t) => (
              <TabsTrigger
                key={t.to}
                value={t.to}
                onClick={() => navigate({ to: t.to })}
              >
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <Outlet />
        </Tabs>
      </div>
    </AppShell>
  );
}
