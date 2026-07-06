import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { listUsers, createUser, setUserActive, setUserRole, forcePasswordReset } from "@/lib/admin/users.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { evaluatePassword, friendlyAuthError } from "@/lib/admin/password";
import { StrengthMeter } from "@/routes/reset-password";
import { UserPlus, Search, KeyRound, Power } from "lucide-react";

const ROLES = ["admin", "direcao", "coordenacao", "professor", "pais"] as const;
type Role = (typeof ROLES)[number];
const ROLE_LABEL: Record<Role, string> = {
  admin: "Superadmin",
  direcao: "Direção",
  coordenacao: "Coordenação",
  professor: "Professor",
  pais: "Pais/Responsáveis",
};

export function UsersPanel() {
  const qc = useQueryClient();
  const list = useServerFn(listUsers);
  const { data: users = [], isLoading } = useQuery({ queryKey: ["admin", "users"], queryFn: () => list({}) });

  const [busca, setBusca] = useState("");
  const filtered = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u: any) => u.email.toLowerCase().includes(q) || (u.nome ?? "").toLowerCase().includes(q));
  }, [users, busca]);

  const setActive = useServerFn(setUserActive);
  const setRole = useServerFn(setUserRole);
  const forceReset = useServerFn(forcePasswordReset);

  const mActive = useMutation({
    mutationFn: (v: { userId: string; ativo: boolean }) => setActive({ data: v }),
    onSuccess: () => { toast.success("Status atualizado."); qc.invalidateQueries({ queryKey: ["admin", "users"] }); },
    onError: (e: any) => toast.error(friendlyAuthError(e.message)),
  });
  const mRole = useMutation({
    mutationFn: (v: { userId: string; role: Role }) => setRole({ data: v }),
    onSuccess: () => { toast.success("Papel atualizado."); qc.invalidateQueries({ queryKey: ["admin", "users"] }); },
    onError: (e: any) => toast.error(friendlyAuthError(e.message)),
  });
  const mReset = useMutation({
    mutationFn: (userId: string) => forceReset({ data: { userId } }),
    onSuccess: () => toast.success("Troca de senha exigida no próximo login."),
    onError: (e: any) => toast.error(friendlyAuthError(e.message)),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por e-mail ou nome…" value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-9" />
        </div>
        <CreateUserDialog />
      </div>

      <div className="rounded-md border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Último acesso</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">Carregando…</TableCell></TableRow>
            )}
            {!isLoading && filtered.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">Nenhum usuário encontrado.</TableCell></TableRow>
            )}
            {filtered.map((u: any) => {
              const currentRole = (u.roles?.[0] as Role) ?? "professor";
              return (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="font-medium">{u.nome || "—"}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </TableCell>
                  <TableCell>
                    <Select value={currentRole} onValueChange={(v) => mRole.mutate({ userId: u.id, role: v as Role })}>
                      <SelectTrigger className="w-40 h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {u.ativo ? <Badge variant="outline" className="border-emerald-600 text-emerald-700">Ativo</Badge>
                             : <Badge variant="outline" className="border-destructive text-destructive">Desativado</Badge>}
                    {u.must_change_password && <Badge variant="outline" className="ml-1 border-yellow-500 text-yellow-700">Trocar senha</Badge>}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {u.ultimo_login ? new Date(u.ultimo_login).toLocaleString("pt-BR") : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => mReset.mutate(u.id)} title="Forçar troca de senha">
                      <KeyRound className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => mActive.mutate({ userId: u.id, ativo: !u.ativo })} title={u.ativo ? "Desativar" : "Reativar"}>
                      <Power className={`h-3.5 w-3.5 ${u.ativo ? "text-destructive" : "text-emerald-600"}`} />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function CreateUserDialog() {
  const qc = useQueryClient();
  const create = useServerFn(createUser);
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [role, setRole] = useState<Role>("professor");
  const [busy, setBusy] = useState(false);
  const strength = evaluatePassword(senha);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!strength.ok) { toast.error("Senha temporária não atende à política."); return; }
    setBusy(true);
    try {
      await create({ data: { nome, email, senha, role } });
      toast.success("Usuário criado. Ele deverá trocar a senha no 1º acesso.");
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      setOpen(false); setNome(""); setEmail(""); setSenha(""); setRole("professor");
    } catch (err: any) {
      toast.error(friendlyAuthError(err.message ?? "Erro ao criar."));
    } finally { setBusy(false); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><UserPlus className="h-4 w-4 mr-2" />Novo usuário</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Cadastrar usuário</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label>Nome completo</Label>
            <Input required value={nome} onChange={(e) => setNome(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>E-mail institucional</Label>
            <Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Senha temporária</Label>
            <Input required type="text" value={senha} onChange={(e) => setSenha(e.target.value)} className="mt-1 font-mono" />
            {senha && <StrengthMeter strength={strength} />}
            <div className="text-[11px] text-muted-foreground mt-1">O usuário será obrigado a trocar no 1º acesso.</div>
          </div>
          <div>
            <Label>Papel</Label>
            <Select value={role} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={busy}>{busy ? "Criando…" : "Criar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
