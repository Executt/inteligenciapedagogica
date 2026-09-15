import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Calendar as CalendarIcon, Check, ChevronsUpDown, Loader2, Search } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";
import {
  buscarAlunos, criarIntervencao, TIPOS_CONTATO, RESULTADOS, CATEGORIAS_CAUSA,
} from "@/lib/retencao/intervencoes.functions";

const searchSchema = z.object({
  aluno: z.string().optional(),
  nome: z.string().optional(),
});

export const Route = createFileRoute("/retencao/registrar")({
  component: RegistrarIntervencao,
  validateSearch: (search) => searchSchema.parse(search),
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

const formSchema = z.object({
  alunoId: z.string().uuid("Selecione um aluno da rede"),
  dataIntervencao: z.date({ required_error: "Selecione a data da intervenção" }),
  tipoContato: z.enum(TIPOS_CONTATO, { required_error: "Selecione o tipo de contato" }),
  resultado: z.enum(RESULTADOS, { required_error: "Selecione o resultado" }),
  categoriaCausa: z.enum(CATEGORIAS_CAUSA, { required_error: "Selecione a categoria da causa" }),
  observacoes: z.string().max(2000, "Máximo de 2000 caracteres").optional(),
  proximosPassos: z.string().max(2000, "Máximo de 2000 caracteres").optional(),
  responsavel: z.string().min(2, "Informe o responsável").max(120, "Nome muito longo"),
});

type FormValues = z.infer<typeof formSchema>;

type AlunoOpcao = {
  id: string;
  codigo: string;
  nome: string;
  turma: string | null;
  escolaId: string | null;
  escolaNome: string | null;
};

function RegistrarIntervencao() {
  const { aluno: alunoParam, nome: nomeParam } = Route.useSearch();
  const queryClient = useQueryClient();
  const salvar = useServerFn(criarIntervencao);
  const buscar = useServerFn(buscarAlunos);

  const defaultValues: FormValues = {
    alunoId: (alunoParam ?? "") as FormValues["alunoId"],
    dataIntervencao: new Date(),
    tipoContato: undefined as unknown as FormValues["tipoContato"],
    resultado: undefined as unknown as FormValues["resultado"],
    categoriaCausa: undefined as unknown as FormValues["categoriaCausa"],
    observacoes: "",
    proximosPassos: "",
    responsavel: "Coordenação Pedagógica",
  };

  const form = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues });
  const [termo, setTermo] = useState("");
  const [aberto, setAberto] = useState(false);
  const [selecionado, setSelecionado] = useState<{ id: string; nome: string; detalhe?: string } | null>(
    alunoParam && nomeParam ? { id: alunoParam, nome: nomeParam } : null,
  );

  const { data: alunos, isFetching } = useQuery({
    queryKey: ["retencao-busca-alunos", termo],
    queryFn: () => buscar({ data: { termo } }),
  });

  const isSubmitting = form.formState.isSubmitting;

  async function onSubmit(values: FormValues) {
    try {
      await salvar({
        data: {
          alunoId: values.alunoId,
          dataIntervencao: format(values.dataIntervencao, "yyyy-MM-dd"),
          tipoContato: values.tipoContato,
          resultado: values.resultado,
          categoriaCausa: values.categoriaCausa,
          observacoes: values.observacoes || undefined,
          proximosPassos: values.proximosPassos || undefined,
          responsavel: values.responsavel,
        },
      });
      toast.success("Intervenção registrada com sucesso!");
      form.reset({ ...defaultValues, alunoId: "" as FormValues["alunoId"] });
      setSelecionado(null);
      setTermo("");
      void queryClient.invalidateQueries({ queryKey: ["retencao-indicadores"] });
      void queryClient.invalidateQueries({ queryKey: ["retencao-escolas"] });
      void queryClient.invalidateQueries({ queryKey: ["retencao-escola"] });
      void queryClient.invalidateQueries({ queryKey: ["intervencoes-aluno"] });
    } catch (e) {
      toast.error("Não foi possível registrar a intervenção.", {
        description: e instanceof Error ? e.message : undefined,
      });
    }
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
              name="alunoId"
              render={() => (
                <FormItem className="flex flex-col">
                  <FormLabel>Aluno</FormLabel>
                  <Popover open={aberto} onOpenChange={setAberto}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          role="combobox"
                          aria-expanded={aberto}
                          className={cn("w-full justify-between font-normal h-9", !selecionado && "text-muted-foreground")}
                        >
                          <span className="flex items-center gap-2 min-w-0">
                            <Search className="h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
                            <span className="truncate">
                              {selecionado ? selecionado.nome : "Busca por nome ou matrícula"}
                            </span>
                          </span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[min(28rem,90vw)] p-0" align="start">
                      <Command shouldFilter={false}>
                        <CommandInput
                          placeholder="Digite o nome ou a matrícula"
                          value={termo}
                          onValueChange={setTermo}
                        />
                        <CommandList>
                          <CommandEmpty>
                            {isFetching ? "Buscando alunos..." : "Nenhum aluno encontrado na rede."}
                          </CommandEmpty>
                          <CommandGroup>
                            {((alunos ?? []) as AlunoOpcao[]).map((a) => (
                              <CommandItem
                                key={a.id}
                                value={a.id}
                                onSelect={() => {
                                  form.setValue("alunoId", a.id, { shouldValidate: true });
                                  setSelecionado({
                                    id: a.id,
                                    nome: a.nome,
                                    detalhe: [a.codigo, a.turma, a.escolaNome].filter(Boolean).join(" · "),
                                  });
                                  setAberto(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selecionado?.id === a.id ? "opacity-100" : "opacity-0",
                                  )}
                                  aria-hidden="true"
                                />
                                <span className="min-w-0">
                                  <span className="block truncate">{a.nome}</span>
                                  <span className="block text-xs text-muted-foreground truncate">
                                    {[a.codigo, a.turma, a.escolaNome].filter(Boolean).join(" · ")}
                                  </span>
                                </span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {selecionado?.detalhe && (
                    <p className="text-xs text-muted-foreground">{selecionado.detalhe}</p>
                  )}
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
                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo de contato" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TIPOS_CONTATO.map((tipo) => (
                          <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
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
                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o resultado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {RESULTADOS.map((r) => (
                          <SelectItem key={r} value={r}>{r}</SelectItem>
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
                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a categoria" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CATEGORIAS_CAUSA.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
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
                    <Textarea placeholder="Detalhes da intervenção..." rows={4} {...field} />
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
                    <Textarea placeholder="Ação seguinte planejada..." rows={3} {...field} />
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
                onClick={() => {
                  form.reset({ ...defaultValues, alunoId: "" as FormValues["alunoId"] });
                  setSelecionado(null);
                }}
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
