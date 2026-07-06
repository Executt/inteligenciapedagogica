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
import {
  Users, ScrollText, BrainCircuit, Cpu, Database, Package, Sparkles, Mail, MessageSquare, Phone, BookOpen,
} from "lucide-react";

const TABS = [
  { id: "usuarios", label: "Usuários", icon: Users },
  { id: "auditoria", label: "Auditoria", icon: ScrollText },
  { id: "cortex", label: "Córtex", icon: Sparkles },
  { id: "ia-oss", label: "IA Open Source", icon: Cpu },
  { id: "ia-pagas", label: "IA Pagas", icon: BrainCircuit },
  { id: "bases", label: "Bases de Conhecimento", icon: BookOpen },
  { id: "banco", label: "Banco de Dados", icon: Database },
  { id: "artefatos", label: "Repositório", icon: Package },
  { id: "smtp", label: "SMTP", icon: Mail },
  { id: "sms", label: "SMS", icon: MessageSquare },
  { id: "whatsapp", label: "WhatsApp", icon: Phone },
] as const;

type TabId = (typeof TABS)[number]["id"];

const searchSchema = z.object({ tab: z.enum(TABS.map((t) => t.id) as [TabId, ...TabId[]]).optional() });

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
      { name: "description", content: "Gestão de usuários, auditoria e configurações da plataforma." },
    ],
  }),
  component: ConfiguracoesPage,
});

function ConfiguracoesPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const active = (search.tab ?? "usuarios") as TabId;

  return (
    <AppShell>
      <div className="p-6">
        <PageHeader title="Configurações do sistema" subtitle="Gestão de usuários, auditoria e integrações da plataforma Edu-Gov." />

        <div className="flex gap-6">
          <nav className="w-56 shrink-0 space-y-0.5">
            {TABS.map((t) => {
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
                  <Icon className="h-4 w-4" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </nav>

          <Card className="flex-1 p-6">
            {active === "usuarios" && <UsersPanel />}
            {active === "auditoria" && <AuditPanel />}
            {active !== "usuarios" && active !== "auditoria" && SETTING_DEFS[active] && (
              <SettingsForm def={SETTING_DEFS[active]} />
            )}
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
