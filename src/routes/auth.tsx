import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { GraduationCap, Mail, Lock, AlertCircle } from "lucide-react";
import { evaluatePassword, friendlyAuthError } from "@/lib/admin/password";
import { StrengthMeter } from "./reset-password";
import { useServerFn } from "@tanstack/react-start";
import { touchLastLogin } from "@/lib/admin/profile.functions";
import { logPublicAuthEvent } from "@/lib/admin/audit.functions";

const emailSchema = z.string().trim().email("Informe um e-mail válido").max(255);

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar · Edu-Córtex" },
      { name: "description", content: "Acesse o console pedagógico Edu-Córtex." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const touchLogin = useServerFn(touchLastLogin);
  const logFailure = useServerFn(logPublicAuthEvent);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/cortex" });
    });
  }, [navigate]);

  const strength = evaluatePassword(password);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const emailCheck = emailSchema.safeParse(email);
    if (!emailCheck.success) {
      setError(emailCheck.error.errors[0].message);
      return;
    }

    setBusy(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Se o e-mail existir, você receberá instruções em instantes.");
        setMode("login");
        return;
      }

      if (mode === "signup") {
        if (!strength.ok) {
          setError("A senha não atende à política mínima.");
          setBusy(false);
          return;
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/cortex` },
        });
        if (error) throw error;
        toast.success("Cadastro criado. Verifique seu e-mail se necessário.");
        navigate({ to: "/cortex" });
        return;
      }

      // login
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        await logFailure({ data: { acao: "auth.login_failed", actor_email: email, metadados: { motivo: error.message } } }).catch(() => null);
        throw error;
      }
      await touchLogin({}).catch(() => null);
      toast.success("Bem-vindo!");
      navigate({ to: "/cortex" });
    } catch (err) {
      const msg = friendlyAuthError(err instanceof Error ? err.message : String(err));
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setBusy(true);
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (res.error) {
      setError(friendlyAuthError(res.error.message ?? "Falha no Google"));
      setBusy(false);
      return;
    }
    if (res.redirected) return;
    await touchLogin({}).catch(() => null);
    navigate({ to: "/cortex" });
  }

  return (
    <div className="min-h-dvh bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          <div className="flex items-center gap-2 mb-6">
            <div className="h-10 w-10 rounded-md bg-primary flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <div className="text-lg font-semibold tracking-tight">Edu-Córtex</div>
              <div className="text-xs text-muted-foreground">Console de inteligência pedagógica</div>
            </div>
          </div>

          <h1 className="text-base font-semibold mb-4">
            {mode === "login" && "Entrar"}
            {mode === "signup" && "Criar conta"}
            {mode === "forgot" && "Recuperar acesso"}
          </h1>

          {error && (
            <div className="mb-3 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <Label htmlFor="email" className="text-xs">E-mail institucional</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="email" type="email" required autoComplete="email" placeholder="voce@exemplo.gov.br" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9" />
              </div>
            </div>

            {mode !== "forgot" && (
              <div>
                <Label htmlFor="password" className="text-xs">Senha</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="password" type="password" required minLength={6} autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9" />
                </div>
                {mode === "signup" && password.length > 0 && <StrengthMeter strength={strength} />}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Aguarde…" : mode === "login" ? "Entrar" : mode === "signup" ? "Criar conta" : "Enviar link de recuperação"}
            </Button>

            {mode === "login" && (
              <button type="button" className="w-full text-xs text-muted-foreground hover:text-foreground text-right" onClick={() => setMode("forgot")}>
                Esqueci minha senha
              </button>
            )}
          </form>

          {mode !== "forgot" && (
            <>
              <div className="my-4 flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground">ou</span>
                <div className="flex-1 h-px bg-border" />
              </div>
              <Button variant="outline" className="w-full" onClick={handleGoogle} disabled={busy}>
                Continuar com Google
              </Button>
            </>
          )}

          <div className="mt-5 text-center text-xs text-muted-foreground">
            {mode === "login" && (
              <button type="button" className="hover:text-foreground" onClick={() => { setMode("signup"); setError(null); }}>
                Não tem conta? Criar cadastro
              </button>
            )}
            {mode === "signup" && (
              <button type="button" className="hover:text-foreground" onClick={() => { setMode("login"); setError(null); }}>
                Já tem conta? Entrar
              </button>
            )}
            {mode === "forgot" && (
              <button type="button" className="hover:text-foreground" onClick={() => { setMode("login"); setError(null); }}>
                Voltar ao login
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
