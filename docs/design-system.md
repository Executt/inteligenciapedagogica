# Design System · HUB-GOV / Horizon

Guia de referência dos tokens semânticos e dos componentes padronizados do Edu-Gov.
Regra de ouro: **componentes nunca usam cor literal** (`text-white`, `bg-[#0070f2]`).
Todo valor visual vem de um token semântico definido em `src/styles.css`.

## 1. Arquitetura de tokens

```text
RAW (paleta Horizon)   -->  SEMANTIC (papel na UI)  -->  UTILITÁRIO Tailwind
--blue-7: #0070f2           --primary: var(--blue-7)     bg-primary / text-primary
--grey-9: #1d2d3e           --foreground                 text-foreground
```

- **RAW/Reference**: `--blue-*`, `--grey-*`, `--green-*`, `--orange-*`, `--red-*`, `--teal-6`, `--indigo-6`.
  Uso exclusivo dentro de `src/styles.css`.
- **Semantic**: mapeados em `@theme inline` (`--color-*`) e por isso disponíveis como classes.
- **Temas**: `:root` = Morning (claro), `.dark` = Evening (escuro). Os dois definem os mesmos
  tokens semânticos, portanto um componente escrito com tokens funciona nos dois temas.

### Tokens de superfície e texto

| Token | Classe | Uso |
| --- | --- | --- |
| `--background` / `--foreground` | `bg-background`, `text-foreground` | Canvas da página e texto padrão |
| `--card` / `--card-foreground` | `bg-card`, `text-card-foreground` | Cartões, painéis, tabelas |
| `--popover` / `--popover-foreground` | `bg-popover` | Menus, dropdowns, tooltips |
| `--muted` / `--muted-foreground` | `bg-muted`, `text-muted-foreground` | Cabeçalhos de tabela, textos auxiliares |
| `--accent` / `--accent-foreground` | `bg-accent` | Hover de linhas e itens de lista |
| `--border` / `--input` / `--ring` | `border-border`, `border-input`, `ring-ring` | Bordas, campos, anel de foco |

### Tokens de ação e status

| Token | Classe | Significado |
| --- | --- | --- |
| `--primary` | `bg-primary text-primary-foreground` | Ação principal (azul institucional `#0070F2`) |
| `--secondary` | `bg-secondary` | Ação secundária/neutra |
| `--success` | `bg-success`, `text-success` | Concluído, sincronizado, aprovado |
| `--warning` | `bg-warning` | Atenção, risco médio, pendente |
| `--destructive` | `bg-destructive` | Erro, risco alto, exclusão |
| `--info` | `bg-info` | Informação neutra |
| `--link` | — | Cor de hyperlink |

> Status nunca é comunicado **só** por cor: sempre acompanha ícone e/ou texto (`Badge`, `MessageStrip`).

### Shell, navegação, elevação e raio

| Grupo | Tokens |
| --- | --- |
| Shell bar | `--shell`, `--shell-foreground`, `--shell-border`, `--shell-accent` |
| Side nav | `--sidebar`, `--sidebar-foreground`, `--sidebar-primary*`, `--sidebar-accent*`, `--sidebar-border` |
| Elevação | utilitários `elevation-0`, `elevation-1`, `elevation-2` (`--shadow-level-*`) |
| Raio | `--radius: 0.5rem` → `rounded-sm/md/lg/xl/2xl` derivados |
| Charts | `--chart-1` … `--chart-5` |
| Tipografia | `--font-sans` = Inter / 72 (fonte SAP) |

Escala de elevação: `elevation-0` para superfícies estáticas (tabelas, cards de conteúdo),
`elevation-1` para cards interativos em hover, `elevation-2` para popovers e diálogos.

## 2. Botões

```tsx
<Button>Salvar</Button>                        {/* primária */}
<Button variant="secondary">Duplicar</Button>
<Button variant="outline">Cancelar</Button>
<Button variant="ghost" size="sm">Detalhes</Button>
<Button variant="destructive">Excluir</Button>

{/* Ícone sozinho SEMPRE com aria-label */}
<Button variant="ghost" size="icon" aria-label="Remover conector">
  <Trash2 className="h-4 w-4" aria-hidden="true" />
</Button>
```

Todas as variantes já trazem `focus-visible:ring-2 focus-visible:ring-ring` — não sobrescreva o foco.

## 3. Inputs, labels e selects

```tsx
<div className="space-y-1.5">
  <Label htmlFor="inep">Código INEP</Label>
  <Input id="inep" inputMode="numeric" placeholder="00000000" />
  <p id="inep-hint" className="text-xs text-muted-foreground">8 dígitos, sem pontuação.</p>
</div>

<Select>
  <SelectTrigger aria-label="Selecionar turno"><SelectValue placeholder="Turno" /></SelectTrigger>
  <SelectContent>
    <SelectItem value="manha">Manhã</SelectItem>
  </SelectContent>
</Select>
```

Regras: todo campo tem `Label` com `htmlFor` **ou** `aria-label`; erro usa `text-destructive`
mais texto explicativo (nunca borda vermelha isolada); placeholder usa `text-muted-foreground`.

## 4. Cards

```tsx
<Card>                                   {/* bg-card + border + elevation-0 */}
  <CardHeader className="pb-2">
    <CardTitle className="text-sm">Indicadores da rede</CardTitle>
  </CardHeader>
  <CardContent>…</CardContent>
</Card>

{/* Card clicável */}
<Card className="hover:border-primary hover:elevation-2 transition-all">…</Card>
```

## 5. Tabelas e grids — use `DataTable`

`src/components/ui/data-table.tsx` padroniza borda, elevação, cabeçalho `bg-muted/60`,
paginação, zebra/hover, foco por teclado e os estados carregando / vazio / erro.

```tsx
<DataTable
  title={`Alunos (${data?.length ?? 0})`}
  columns={[
    { id: "nome", header: "Aluno", cell: (a) => a.nome },
    { id: "media", header: "Média", align: "right", className: "font-mono", cell: (a) => a.mediaGeral },
    { id: "risco", header: "Risco", cell: (a) => <Badge variant="warning">{a.risco}</Badge> },
  ]}
  rows={data}
  rowKey={(a) => a.id}
  loading={isLoading}
  error={isError}
  pageSize={12}
  caption="Lista de alunos com média, frequência e risco"
  emptyTitle="Nenhum aluno encontrado"
  emptyDescription="Importe dados ou cadastre alunos para começar."
  onRowClick={(a) => navigate({ to: "/aluno/$id", params: { id: a.id } })}
/>
```

Para tabelas artesanais (ex.: mapa de calor), continue usando `Table` de
`src/components/ui/table.tsx` — o wrapper já aplica borda, raio e `elevation-0` — e mantenha
`<caption className="sr-only">`, `scope="col"` nos cabeçalhos e `scope="row"` na primeira célula.

## 6. Charts — use `ChartFrame`

`src/components/ui/chart-frame.tsx` é o único ponto de entrada para Recharts. Ele monta o card,
o `ResponsiveContainer`, o rótulo acessível e os estados; as primitivas aplicam o tema.

```tsx
<ChartFrame title="Evolução dos indicadores" description="Médias por bimestre" height={300}
            loading={isLoading} error={isError} empty={rows.length === 0}
            footnote="Fonte: Core Platform · Censo escolar">
  <LineChart data={rows}>
    <ChartGrid />
    <ChartXAxis dataKey="bimestre" />
    <ChartYAxis domain={[0, 10]} />
    <ChartTooltip />
    <ChartLegend />
    <Line dataKey="Português"  {...lineSeries(0)} />
    <Line dataKey="Matemática" {...lineSeries(1)} />
  </LineChart>
</ChartFrame>
```

- `lineSeries(i)`, `areaSeries(i)`, `barSeries(i)` → cor `--chart-(i+1)`, espessura, raio de
  canto e **padrão de traço** distinto (`seriesDashArray`), para diferenciar séries sem depender de cor.
- `chartStatusColor.positive/attention/negative` para séries semânticas (meta, alerta, déficit).
- Polar/radar: `ChartPolarGrid`, `ChartPolarAngleAxis`, `ChartPolarRadiusAxis`.
- Nunca passe cor literal: use `chartSeriesColor(i)` ou os tokens `var(--color-chart-n)`.

## 7. Estados: carregando, vazio, erro e alertas

`src/components/ui/states.tsx`:

```tsx
<SkeletonTable rows={6} cols={4} />
<LoadingState label="Carregando conectores…" />
<EmptyState title="Nenhum conector" description="Cadastre um conector REST, SOAP ou SQL." />
<ErrorState description="Falha ao consultar o barramento. Tente novamente." />
<MessageStrip variant="warning">3 execuções pendentes de reprocessamento.</MessageStrip>
```

Toda tela de dados cobre os quatro estados: carregando (skeleton com a forma do conteúdo),
vazio (título + próxima ação), erro (causa + como recuperar) e sucesso.

## 8. Acessibilidade — checklist obrigatório

- Um único `<main>` por página (vem do `AppShell`) e skip link "Ir para o conteúdo principal".
- Navegação lateral com `aria-current="page"` no item ativo.
- Botões de ícone com `aria-label`; ícones decorativos com `aria-hidden="true"`.
- Foco visível em tudo que recebe Tab: `focus-visible:ring-2 focus-visible:ring-ring`.
- Contraste: pares `*-foreground` sobre o respectivo fundo já atendem WCAG AA — não substitua por
  cinzas arbitrários (`text-gray-300`) nem por `text-muted-foreground/50`.
- Alturas de viewport com `min-h-dvh` (não `min-h-screen`).
- Atualizações dinâmicas anunciadas com `role="status"` / `aria-live="polite"`.
