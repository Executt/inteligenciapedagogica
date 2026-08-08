import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { evaluatePassword, friendlyAuthError } from "@/lib/admin/password";
import { markPasswordChanged } from "@/lib/admin/profile.functions";
import { useServerFn } from "@tanstack/react-start";
import { ShieldCheck, KeyRound } from "lucide-react";

const searchSchema = z.object({ forced: z.string().optional() });

export const Route = createFileRoute("/reset-password")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [{ title: "Redefinir senha · Edu-Córtex" }, { name: "description", content: "Defina uma nova senha para acessar o console." }],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const forced = search.forced === "1";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const markChanged = useServerFn(markPasswordChanged);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        // se veio de fluxo "esqueci senha", o token está no hash — Supabase seta sessão automaticamente
        setTimeout(() => supabase.auth.getSession().then(({ data: d2 }) => {
          if (!d2.session) {
            toast.error("Sessão expirada. Faça login novamente.");
            navigate({ to: "/auth" });
          } else setReady(true);
        }), 500);
      } else setReady(true);
    });
  }, [navigate]);

  const strength = evaluatePassword(password);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!strength.ok) {
      toast.error("A senha ainda não atende à política.");
      return;
    }
    if (password !== confirm) {
      toast.error("As senhas não conferem.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      await markChanged({}).catch(() => null);
      toast.success("Senha atualizada com sucesso.");
      navigate({ to: "/cortex" });
    } catch (err) {
      toast.error(friendlyAuthError(err instanceof Error ? err.message : String(err)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          <div className="flex items-center gap-2 mb-6">
            <div className="h-10 w-10 rounded-md bg-primary flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <div className="text-lg font-semibold tracking-tight">Redefinir senha</div>
              <div className="text-xs text-muted-foreground">
                {forced ? "Primeiro acesso — defina uma senha própria." : "Escolha uma nova senha forte."}
              </div>
            </div>
          </div>

          {!ready ? (
            <div className="text-sm text-muted-foreground">Validando sessão…</div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="pwd">Nova senha</Label>
                <div className="relative mt-1">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="pwd" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9" />
                </div>
                <StrengthMeter strength={strength} />
              </div>
              <div>
                <Label htmlFor="conf">Confirmar senha</Label>
                <Input id="conf" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} className="mt-1" />
              </div>
              <Button type="submit" className="w-full" disabled={busy || !strength.ok}>
                {busy ? "Atualizando…" : "Salvar nova senha"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function StrengthMeter({ strength }: { strength: ReturnType<typeof evaluatePassword> }) {
  const colors = ["bg-destructive", "bg-destructive", "bg-yellow-500", "bg-blue-500", "bg-emerald-600"];
  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`h-1.5 flex-1 rounded ${i < strength.score ? colors[strength.score] : "bg-muted"}`} />
        ))}
      </div>
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground">Força: <span className="font-medium text-foreground">{strength.label}</span></span>
        {strength.issues.length > 0 && (
          <span className="text-muted-foreground">Faltam: {strength.issues.join(", ")}</span>
        )}
      </div>
    </div>
  );
}
