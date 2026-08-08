import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, SkeletonTable } from "@/components/ui/states";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** ------------------------------------------------------------------
 * DataTable — padrão HUB-GOV para tabelas e grids.
 * Unifica: elevação e bordas do Card, cabeçalho `bg-muted/60`,
 * paginação, e estados carregando / vazio / erro.
 * ------------------------------------------------------------------ */

export type DataTableColumn<T> = {
  /** Identificador único da coluna. */
  id: string;
  header: React.ReactNode;
  cell: (row: T, index: number) => React.ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
  headerClassName?: string;
};

export type DataTableProps<T> = {
  /** Título do card. Omita para renderizar sem card (`bare`). */
  title?: React.ReactNode;
  actions?: React.ReactNode;
  columns: DataTableColumn<T>[];
  rows: T[] | undefined;
  rowKey: (row: T, index: number) => string;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  error?: boolean;
  errorDescription?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  /** Linhas por página. `0` desliga a paginação. */
  pageSize?: number;
  caption?: string;
  className?: string;
  bare?: boolean;
};

const alignClass = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
} as const;

export function DataTable<T>({
  title,
  actions,
  columns,
  rows,
  rowKey,
  onRowClick,
  loading,
  error,
  errorDescription = "Tente novamente em alguns instantes.",
  emptyTitle = "Nenhum registro encontrado",
  emptyDescription = "Ajuste os filtros ou cadastre novos dados para visualizar informações aqui.",
  emptyAction,
  pageSize = 10,
  caption,
  className,
  bare,
}: DataTableProps<T>) {
  const [page, setPage] = React.useState(0);
  const data = rows ?? [];
  const paginated = pageSize > 0;
  const totalPages = paginated ? Math.max(1, Math.ceil(data.length / pageSize)) : 1;

  React.useEffect(() => {
    if (page > totalPages - 1) setPage(0);
  }, [page, totalPages]);

  const visible = paginated ? data.slice(page * pageSize, page * pageSize + pageSize) : data;

  const body = loading ? (
    <SkeletonTable rows={Math.min(pageSize || 5, 6)} cols={columns.length} />
  ) : error ? (
    <ErrorState description={errorDescription} />
  ) : data.length === 0 ? (
    <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
  ) : (
    <>
      <Table>
        {caption && <caption className="sr-only">{caption}</caption>}
        <TableHeader>
          <TableRow>
            {columns.map((c) => (
              <TableHead
                key={c.id}
                scope="col"
                className={cn(alignClass[c.align ?? "left"], c.headerClassName)}
              >
                {c.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {visible.map((row, i) => (
            <TableRow
              key={rowKey(row, i)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              onKeyDown={
                onRowClick
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onRowClick(row);
                      }
                    }
                  : undefined
              }
              tabIndex={onRowClick ? 0 : undefined}
              className={cn(
                onRowClick &&
                  "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
              )}
            >
              {columns.map((c) => (
                <TableCell key={c.id} className={cn(alignClass[c.align ?? "left"], c.className)}>
                  {c.cell(row, page * (pageSize || 0) + i)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {paginated && data.length > pageSize && (
        <nav
          aria-label="Paginação da tabela"
          className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3"
        >
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {page * pageSize + 1}–{Math.min((page + 1) * pageSize, data.length)} de {data.length}{" "}
            registros · página {page + 1} de {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              Próxima
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </nav>
      )}
    </>
  );

  if (bare) return <div className={cn("w-full", className)}>{body}</div>;

  return (
    <Card className={className}>
      {(title || actions) && (
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            {title && <CardTitle className="text-sm">{title}</CardTitle>}
            {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
          </div>
        </CardHeader>
      )}
      <CardContent>{body}</CardContent>
    </Card>
  );
}
