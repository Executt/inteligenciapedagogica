import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, MessageSquare, Phone, Save, Plug, Loader2, Send } from "lucide-react";
import { simulate } from "./_shared";

type Canal = "smtp" | "sms" | "whatsapp";

const smtpSchema = z.object({
  host: z.string().min(3), porta: z.coerce.number().min(1).max(65535),
  usuario: z.string().min(2), senhaRef: z.string().min(2),
  from: z.string().email("E-mail inválido"), tls: z.boolean().default(true), habilitado: z.boolean().default(true),
});
const smsSchema = z.object({
  provedor: z.enum(["twilio", "zenvia", "tim"]), senderId: z.string().min(2),
  endpoint: z.string().url("URL inválida"), tokenRef: z.string().min(2), habilitado: z.boolean().default(true),
});
const waSchema = z.object({
  phoneNumberId: z.string().min(6), businessAccountId: z.string().min(6),
  tokenRef: z.string().min(2), templatePadrao: z.string().min(2), habilitado: z.boolean().default(true),
});

const CFG = {
  smtp: {
    icon: Mail, titulo: "SMTP", desc: "Servidor de e-mails transacionais (recuperação de senha, alertas).",
    schema: smtpSchema,
    defaults: { host: "smtp.gov.br", porta: 587, usuario: "no-reply@edu-gov.br", senhaRef: "SMTP_PASSWORD", from: "no-reply@edu-gov.br", tls: true, habilitado: true },
    testLabel: "Enviar e-mail de teste",
  },
  sms: {
    icon: MessageSquare, titulo: "SMS", desc: "Provedor de SMS transacional para alertas críticos.",
    schema: smsSchema,
    defaults: { provedor: "twilio" as const, senderId: "EDUGOV", endpoint: "https://api.twilio.com/2010-04-01/Accounts", tokenRef: "SMS_TOKEN", habilitado: true },
    testLabel: "Enviar SMS de teste",
  },
  whatsapp: {
    icon: Phone, titulo: "WhatsApp Business", desc: "Integração com WhatsApp Cloud API para comunicação com responsáveis.",
    schema: waSchema,
    defaults: { phoneNumberId: "108451234567890", businessAccountId: "203456789012345", tokenRef: "WHATSAPP_TOKEN", templatePadrao: "notificacao_pedagogica", habilitado: true },
    testLabel: "Enviar mensagem de teste",
  },
} as const;

export function ComunicacaoPanel({ canal }: { canal: Canal }) {
  const cfg = CFG[canal];
  const Icon = cfg.icon;
  const [status, setStatus] = useState<"ok" | "erro" | "pendente">("pendente");
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [destinoTeste, setDestinoTeste] = useState("");

  const form = useForm<any>({ resolver: zodResolver(cfg.schema as any), defaultValues: cfg.defaults });

  const submit = form.handleSubmit(async () => {
    setSaving(true); await simulate(800); setSaving(false);
    toast.success(`Configuração de ${cfg.titulo} salva.`);
  });

  async function testar() {
    if (!destinoTeste) { toast.error("Informe um destino de teste."); return; }
    setTesting(true);
    try {
      await simulate(1200, undefined, 0.2);
      setStatus("ok"); toast.success(`${cfg.titulo}: conexão estabelecida e envio de teste concluído.`);
    } catch (e: any) {
      setStatus("erro"); toast.error(e.message ?? "Falha no teste");
    } finally { setTesting(false); }
  }

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold flex items-center gap-2"><Icon className="h-4 w-4" /> {cfg.titulo}</h2>
          <p className="text-sm text-muted-foreground mt-1">{cfg.desc}</p>
        </div>
        <Badge variant={status === "ok" ? "default" : status === "erro" ? "destructive" : "secondary"}>
          {status === "ok" ? "Ativo" : status === "erro" ? "Falha" : "Pendente de teste"}
        </Badge>
      </header>

      <form onSubmit={submit} className="space-y-5">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Credenciais e endpoint</CardTitle>
            <CardDescription>Chaves e tokens são referências ao cofre de segredos.</CardDescription>
          </CardHeader>
          <CardContent>
            {canal === "smtp" && <SmtpFields form={form} />}
            {canal === "sms" && <SmsFields form={form} />}
            {canal === "whatsapp" && <WaFields form={form} />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Teste de envio</CardTitle></CardHeader>
          <CardContent className="flex flex-col md:flex-row gap-3 items-end">
            <div className="flex-1">
              <Label className="text-xs">
                {canal === "smtp" ? "Endereço de e-mail" : canal === "sms" ? "Número de celular (E.164)" : "Número WhatsApp (E.164)"}
              </Label>
              <Input value={destinoTeste} onChange={(e) => setDestinoTeste(e.target.value)}
                placeholder={canal === "smtp" ? "diretor@ee-anisio.sp.gov.br" : "+5511999998888"} />
            </div>
            <Button type="button" variant="outline" onClick={testar} disabled={testing}>
              {testing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
              {cfg.testLabel}
            </Button>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" disabled={testing} onClick={testar}><Plug className="h-4 w-4 mr-1" /> Testar conexão</Button>
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
            Salvar configuração
          </Button>
        </div>
      </form>
    </div>
  );
}

function Err({ msg }: { msg?: string }) {
  return msg ? <p className="text-[11px] text-destructive mt-1">{msg}</p> : null;
}

function SmtpFields({ form }: { form: any }) {
  const e = form.formState.errors;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div><Label className="text-xs">Host</Label><Input {...form.register("host")} /><Err msg={e.host?.message} /></div>
      <div><Label className="text-xs">Porta</Label><Input type="number" {...form.register("porta")} /><Err msg={e.porta?.message} /></div>
      <div><Label className="text-xs">Usuário</Label><Input {...form.register("usuario")} /><Err msg={e.usuario?.message} /></div>
      <div><Label className="text-xs">Senha (ref. secret)</Label><Input {...form.register("senhaRef")} /><Err msg={e.senhaRef?.message} /></div>
      <div><Label className="text-xs">Remetente (From)</Label><Input type="email" {...form.register("from")} /><Err msg={e.from?.message} /></div>
      <div className="flex items-end gap-4">
        <div className="flex items-center gap-2"><Switch checked={form.watch("tls")} onCheckedChange={(v: boolean) => form.setValue("tls", v)} /><span className="text-xs">TLS/STARTTLS</span></div>
        <div className="flex items-center gap-2"><Switch checked={form.watch("habilitado")} onCheckedChange={(v: boolean) => form.setValue("habilitado", v)} /><span className="text-xs">Habilitado</span></div>
      </div>
    </div>
  );
}

function SmsFields({ form }: { form: any }) {
  const e = form.formState.errors;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div>
        <Label className="text-xs">Provedor</Label>
        <Select value={form.watch("provedor")} onValueChange={(v: any) => form.setValue("provedor", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="twilio">Twilio</SelectItem>
            <SelectItem value="zenvia">Zenvia</SelectItem>
            <SelectItem value="tim">TIM Corporate</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div><Label className="text-xs">Sender ID</Label><Input {...form.register("senderId")} /><Err msg={e.senderId?.message} /></div>
      <div className="md:col-span-2"><Label className="text-xs">Endpoint</Label><Input {...form.register("endpoint")} /><Err msg={e.endpoint?.message} /></div>
      <div><Label className="text-xs">Token (ref. secret)</Label><Input {...form.register("tokenRef")} /><Err msg={e.tokenRef?.message} /></div>
      <div className="flex items-end"><div className="flex items-center gap-2"><Switch checked={form.watch("habilitado")} onCheckedChange={(v: boolean) => form.setValue("habilitado", v)} /><span className="text-xs">Habilitado</span></div></div>
    </div>
  );
}

function WaFields({ form }: { form: any }) {
  const e = form.formState.errors;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div><Label className="text-xs">Phone Number ID</Label><Input {...form.register("phoneNumberId")} /><Err msg={e.phoneNumberId?.message} /></div>
      <div><Label className="text-xs">Business Account ID</Label><Input {...form.register("businessAccountId")} /><Err msg={e.businessAccountId?.message} /></div>
      <div><Label className="text-xs">Token permanente (ref. secret)</Label><Input {...form.register("tokenRef")} /><Err msg={e.tokenRef?.message} /></div>
      <div><Label className="text-xs">Template padrão</Label><Input {...form.register("templatePadrao")} /><Err msg={e.templatePadrao?.message} /></div>
      <div className="flex items-end"><div className="flex items-center gap-2"><Switch checked={form.watch("habilitado")} onCheckedChange={(v: boolean) => form.setValue("habilitado", v)} /><span className="text-xs">Habilitado</span></div></div>
    </div>
  );
}
