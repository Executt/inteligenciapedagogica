import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { UsersPanel } from "@/components/config/UsersPanel";
import { AuditPanel } from "@/components/config/AuditPanel";
import { SettingsForm } from "@/components/config/SettingsForm";
import { SETTING_DEFS } from "@/components/config/settings-defs";
import { BancoDadosPanel } from "@/components/config/BancoDadosPanel";
import { ArtefatosPanel } from "@/components/config/ArtefatosPanel";
import { ModelosIAPanel } from "@/components/config/ModelosIAPanel";
import { CortexRoutingPanel } from "@/components/config/CortexRoutingPanel";
import { AssistentePanel } from "@/components/config/AssistentePanel";
import { InstituicaoPanel } from "@/components/config/InstituicaoPanel";
import { ProfissionaisPanel } from "@/components/config/ProfissionaisPanel";
import { ComunicacaoPanel } from "@/components/config/ComunicacaoPanel";
import { IntegracaoPulsePanel } from "@/components/config/IntegracaoPulsePanel";
import {
  Users, ScrollText, BrainCircuit, Cpu, Database, Package, Sparkles, Mail, MessageSquare, Phone, BookOpen,
  Building2, Bot, GraduationCap, Webhook,
} from "lucide-react";

type TabDef = { id: string; label: string; icon: any; group: string };

const TABS: TabDef[] = [
  { id: "usuarios", label: "Usuários", icon: Users, group: "Administração" },
  { id: "auditoria", label: "Auditoria", icon: ScrollText, group: "Administração" },

  { id: "instituicao", label: "Instituição Escolar", icon: Building2, group: "Gestão Institucional" },
  { id: "profissionais", label: "Profissionais & Disciplinas", icon: GraduationCap, group: "Gestão Institucional" },

  { id: "cortex", label: "Roteamento do Córtex", icon: Sparkles, group: "Orquestração de IA" },
  { id: "ia-oss", label: "Modelos Open Source", icon: Cpu, group: "Orquestração de IA" },
  { id: "ia-pagas", label: "Modelos Pagos", icon: BrainCircuit, group: "Orquestração de IA" },
  { id: "assistente", label: "Assistente do Educador", icon: Bot, group: "Orquestração de IA" },
  { id: "bases", label: "Bases de Conhecimento", icon: BookOpen, group: "Orquestração de IA" },

  { id: "banco", label: "Banco de Dados", icon: Database, group: "Infraestrutura" },
  { id: "artefatos", label: "Repositórios & Artefatos", icon: Package, group: "Infraestrutura" },
  { id: "pulse", label: "Integração Pulse", icon: Webhook, group: "Infraestrutura" },

  { id: "smtp", label: "SMTP", icon: Mail, group: "Comunicação" },
  { id: "sms", label: "SMS", icon: MessageSquare, group: "Comunicação" },
  { id: "whatsapp", label: "WhatsApp", icon: Phone, group: "Comunicação" },
];

const TAB_IDS = TABS.map((t) => t.id) as [string, ...string[]];
const searchSchema = z.object({ tab: z.enum(TAB_IDS).optional() });

export const Route = createFileRoute("/_authenticated/configuracoes")({
  validateSearch: (s) => searchSchema.parse(s),
  beforeLoad: async () => {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) throw redirect({ to: "/auth" });
    const uid = session.session.user.id;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: uid, _role: "admin" });
    if (!isAdmin) throw redirect({ to: "/" });
  },
  head: () => ({
    meta: [
      { title: "Configurações · Edu-Córtex" },
      { name: "description", content: "Gestão institucional, orquestração de IA e infraestrutura da plataforma Edu-Gov." },
    ],
  }),
  component: ConfiguracoesPage,
});

function ConfiguracoesPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const active = search.tab ?? "usuarios";

  const grouped = TABS.reduce<Record<string, TabDef[]>>((acc, t) => {
    (acc[t.group] ??= []).push(t);
    return acc;
  }, {});

  return (
    <AppShell>
      <div className="p-6">
        <PageHeader title="Configurações do sistema" subtitle="Gestão institucional, orquestração de IA, infraestrutura e comunicação." />

        <div className="flex gap-6">
          <nav className="w-64 shrink-0 space-y-4">
            {Object.entries(grouped).map(([group, items]) => (
              <div key={group}>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold px-2 mb-1">{group}</div>
                <div className="space-y-0.5">
                  {items.map((t) => {
                    const Icon = t.icon;
                    const isActive = t.id === active;
                    return (
                      <button
                        key={t.id}
                        onClick={() => navigate({ to: "/configuracoes", search: { tab: t.id } })}
                        className={cn(
                          "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left transition-colors",
                          isActive ? "bg-primary text-primary-foreground" : "hover:bg-accent",
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <Card className="flex-1 p-6 min-w-0">
            {active === "usuarios" && <UsersPanel />}
            {active === "auditoria" && <AuditPanel />}
            {active === "instituicao" && <InstituicaoPanel />}
            {active === "profissionais" && <ProfissionaisPanel />}
            {active === "cortex" && <CortexRoutingPanel />}
            {active === "ia-oss" && <ModelosIAPanel categoria="oss" />}
            {active === "ia-pagas" && <ModelosIAPanel categoria="paga" />}
            {active === "assistente" && <AssistentePanel />}
            {active === "banco" && <BancoDadosPanel />}
            {active === "artefatos" && <ArtefatosPanel />}
            {active === "pulse" && <IntegracaoPulsePanel />}
            {active === "smtp" && <ComunicacaoPanel canal="smtp" />}
            {active === "sms" && <ComunicacaoPanel canal="sms" />}
            {active === "whatsapp" && <ComunicacaoPanel canal="whatsapp" />}
            {active === "bases" && SETTING_DEFS[active] && <SettingsForm def={SETTING_DEFS[active]} />}
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
