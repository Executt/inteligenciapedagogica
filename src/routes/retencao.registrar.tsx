import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Calendar as CalendarIcon, Loader2, Search } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/retencao/registrar")({
  component: RegistrarIntervencao,
  head: () => ({
    meta: [
      { title: "Registrar Intervenção · Retenção Estudantil · Edu-Gov" },
      { name: "description", content: "Registre intervenções de retenção estudantil com dados da comunicação, causa e próximos passos." },
      { property: "og:title", content: "Registrar Intervenção · Retenção Estudantil · Edu-Gov" },
      { property: "og:description", content: "Registre intervenções de retenção estudantil com dados da comunicação, causa e próximos passos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const tiposContato = ["WhatsApp", "E-mail", "Ligação Telefônica", "Reunião Presencial"] as const;
const resultados = ["Sucesso", "Sem Resposta", "Recusa", "Remarcado"] as const;
const categoriasCausa = ["Pedagógica", "Financeira", "Familiar", "Saúde", "Outros"] as const;

const formSchema = z.object({
  aluno: z.string().min(3, "Informe o nome completo do aluno").max(120, "Nome muito longo"),
  dataIntervencao: z.date({ required_error: "Selecione a data da intervenção" }),
  tipoContato: z
    .string()
    .refine((v) => tiposContato.includes(v as (typeof tiposContato)[number]), {
      message: "Selecione o tipo de contato",
    }),
  resultado: z
    .string()
    .refine((v) => resultados.includes(v as (typeof resultados)[number]), {
      message: "Selecione o resultado",
    }),
  categoriaCausa: z
    .string()
    .refine((v) => categoriasCausa.includes(v as (typeof categoriasCausa)[number]), {
      message: "Selecione a categoria da causa",
    }),
  observacoes: z.string().max(2000, "Máximo de 2000 caracteres").optional(),
  proximosPassos: z.string().max(2000, "Máximo de 2000 caracteres").optional(),
  responsavel: z.string().min(2, "Informe o responsável").max(120, "Nome muito longo"),
});

type FormValues = z.infer<typeof formSchema>;

const defaultValues: FormValues = {
  aluno: "",
  dataIntervencao: new Date(),
  tipoContato: "",
  resultado: "",
  categoriaCausa: "",
  observacoes: "",
  proximosPassos: "",
  responsavel: "Coordenação Pedagógica",
};

function RegistrarIntervencao() {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const isSubmitting = form.formState.isSubmitting;

  async function onSubmit(values: FormValues) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    // eslint-disable-next-line no-console
    console.log("Intervenção registrada:", values);
    toast.success("Intervenção registrada com sucesso!");
    form.reset(defaultValues);
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Registrar Intervenção</CardTitle>
        <CardDescription>
          Preencha os dados do contato realizado com o responsável ou aluno em situação de risco.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="aluno"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Aluno</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Search
                        className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <Input
                        placeholder="Busca por nome"
                        className="pl-9"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="dataIntervencao"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data da Intervenção</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            type="button"
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal h-9",
                              !field.value && "text-muted-foreground"
                            )}
                            aria-label="Abrir calendário"
                          >
                            {field.value ? (
                              format(field.value, "dd/MM/yyyy", { locale: ptBR })
                            ) : (
                              <span>Selecione a data</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" aria-hidden="true" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date > new Date()}
                          initialFocus
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tipoContato"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Contato</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo de contato" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {tiposContato.map((tipo) => (
                          <SelectItem key={tipo} value={tipo}>
                            {tipo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="resultado"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resultado</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o resultado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {resultados.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="categoriaCausa"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria da Causa</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a categoria" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categoriasCausa.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="observacoes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Detalhes da intervenção..."
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="proximosPassos"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Próximos Passos</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ação seguinte planejada..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="responsavel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Responsável</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                disabled={isSubmitting}
                onClick={() => form.reset(defaultValues)}
              >
                Limpar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  "Salvar Intervenção"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
