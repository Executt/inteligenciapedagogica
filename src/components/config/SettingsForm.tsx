import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getSetting, setSetting } from "@/lib/admin/settings.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

export type FieldDef =
  | { key: string; label: string; type: "text" | "password" | "url" | "email"; placeholder?: string; help?: string }
  | { key: string; label: string; type: "number"; min?: number; max?: number; step?: number; help?: string }
  | { key: string; label: string; type: "textarea"; placeholder?: string; help?: string }
  | { key: string; label: string; type: "boolean"; help?: string };

export type SettingDefinition = {
  chave: string;
  titulo: string;
  descricao: string;
  aviso?: string;
  fields: FieldDef[];
};

export function SettingsForm({ def }: { def: SettingDefinition }) {
  const qc = useQueryClient();
  const get = useServerFn(getSetting);
  const set = useServerFn(setSetting);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "settings", def.chave],
    queryFn: () => get({ data: { chave: def.chave } }),
  });

  const [values, setValues] = useState<Record<string, any>>({});
  useEffect(() => { setValues((data as any) ?? {}); }, [data]);

  const mut = useMutation({
    mutationFn: () => set({ data: { chave: def.chave, valor: values } }),
    onSuccess: () => { toast.success("Configuração salva."); qc.invalidateQueries({ queryKey: ["admin", "settings", def.chave] }); },
    onError: (e: any) => toast.error(e.message ?? "Falha ao salvar"),
  });

  if (isLoading) return <div className="text-sm text-muted-foreground">Carregando…</div>;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold">{def.titulo}</h2>
        <p className="text-sm text-muted-foreground mt-1">{def.descricao}</p>
      </div>

      {def.aviso && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">{def.aviso}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
        {def.fields.map((f) => (
          <div key={f.key} className={f.type === "textarea" ? "md:col-span-2" : ""}>
            <Label className="text-xs">{f.label}</Label>
            {f.type === "textarea" ? (
              <Textarea value={values[f.key] ?? ""} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} className="mt-1 font-mono text-xs" rows={4} placeholder={f.placeholder} />
            ) : f.type === "boolean" ? (
              <div className="mt-2"><Switch checked={!!values[f.key]} onCheckedChange={(v) => setValues({ ...values, [f.key]: v })} /></div>
            ) : f.type === "number" ? (
              <Input type="number" min={f.min} max={f.max} step={f.step} value={values[f.key] ?? ""} onChange={(e) => setValues({ ...values, [f.key]: e.target.value === "" ? "" : Number(e.target.value) })} className="mt-1" />
            ) : (
              <Input type={f.type} value={values[f.key] ?? ""} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} className="mt-1" placeholder={(f as any).placeholder} />
            )}
            {f.help && <p className="text-[11px] text-muted-foreground mt-1">{f.help}</p>}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={() => mut.mutate()} disabled={mut.isPending}>
          {mut.isPending ? "Salvando…" : "Salvar configuração"}
        </Button>
        <Button variant="outline" disabled title="Ative a integração real para testar a conexão">Testar conexão</Button>
      </div>
    </div>
  );
}
