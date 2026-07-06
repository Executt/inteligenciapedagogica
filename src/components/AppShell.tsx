import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  LayoutDashboard, Building2, Upload, School, Users, User2, Sparkles, GraduationCap, Bell, Search, Brain, Settings, LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { getMyProfile } from "@/lib/admin/profile.functions";
import { logAuditEvent } from "@/lib/admin/audit.functions";
import { Button } from "@/components/ui/button";

const nav = [
  { to: "/", label: "Visão Geral", icon: LayoutDashboard },
  { to: "/entidades", label: "Gestão de Entidades", icon: Building2 },
  { to: "/integracao", label: "Integração Gov", icon: Upload },
  { to: "/escola", label: "Visão da Escola", icon: School },
  { to: "/turmas", label: "Visão da Turma", icon: Users },
  { to: "/alunos", label: "Dossiê do Aluno", icon: User2 },
  { to: "/intervencao", label: "Intervenção Pedagógica", icon: Sparkles },
  { to: "/cortex", label: "Edu-Córtex · IA", icon: Brain },
];

const ROLE_LABEL: Record<string, string> = {
  admin: "Superadmin",
  direcao: "Direção",
  coordenacao: "Coordenação",
  professor: "Professor",
  pais: "Pais/Responsáveis",
};

function initialsFrom(name?: string | null, email?: string | null) {
  const src = (name || email || "??").trim();
  const parts = src.split(/[\s@.]+/).filter(Boolean).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const profileFn = useServerFn(getMyProfile);
  const logEvent = useServerFn(logAuditEvent);

  const { data: profile } = useQuery({
    queryKey: ["me", "profile"],
    queryFn: () => profileFn({}),
    staleTime: 60_000,
  });

  const isAdmin = profile?.roles?.includes("admin") ?? false;
  const roleLabel = profile?.roles?.[0] ? ROLE_LABEL[profile.roles[0]] ?? profile.roles[0] : "—";

  async function handleSignOut() {
    try { await logEvent({ data: { acao: "auth.logout", entidade: "auth" } }); } catch { /* ignore */ }
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen flex w-full bg-background">
      <aside className="w-64 shrink-0 bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border">
        <div className="h-16 px-5 flex items-center gap-2.5 border-b border-sidebar-border">
          <div className="h-9 w-9 rounded-md bg-sidebar-primary flex items-center justify-center">
            <GraduationCap className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight">Edu-Gov</div>
            <div className="text-[10px] uppercase tracking-wider text-sidebar-foreground/60">Inteligência Pedagógica</div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {nav.map((item) => {
            const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
          {isAdmin && (
            <Link
              to="/configuracoes"
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                pathname.startsWith("/configuracoes")
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <Settings className="h-4 w-4" />
              <span>Configurações</span>
            </Link>
          )}
        </nav>
        <div className="p-4 border-t border-sidebar-border text-[11px] text-sidebar-foreground/60">
          v1.0 · Ambiente Homologação
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border bg-card px-6 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              placeholder="Buscar aluno, turma, escola, INEP..."
              className="w-full h-9 pl-9 pr-3 rounded-md border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
          <button className="relative h-9 w-9 rounded-md hover:bg-accent flex items-center justify-center">
            <Bell className="h-4 w-4" />
            <span className="absolute top-1.5 right-2 h-1.5 w-1.5 rounded-full bg-destructive" />
          </button>
          <div className="flex items-center gap-2 pl-3 border-l border-border">
            <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center">
              {initialsFrom(profile?.nome, null)}
            </div>
            <div className="text-xs leading-tight">
              <div className="font-medium">{profile?.nome ?? "—"}</div>
              <div className="text-muted-foreground">{roleLabel}</div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleSignOut} title="Sair" className="ml-1">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
