/** Exportação de tabelas do Integration Hub: CSV (download) e PDF (via janela de impressão). */
export type ExportColumn<T> = { id: string; rotulo: string; valor: (row: T) => string | number | null | undefined };

function cell(v: unknown) {
  return v == null ? "" : String(v);
}

export function exportCSV<T>(nomeArquivo: string, colunas: Array<ExportColumn<T>>, rows: T[]) {
  const linhas = [
    colunas.map((c) => c.rotulo).join(";"),
    ...rows.map((r) => colunas.map((c) => `"${cell(c.valor(r)).replace(/"/g, '""')}"`).join(";")),
  ];
  const blob = new Blob(["\uFEFF" + linhas.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${nomeArquivo}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportPDF<T>(titulo: string, colunas: Array<ExportColumn<T>>, rows: T[], resumo?: string) {
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8" />
<title>${titulo}</title>
<style>
  body { font-family: system-ui, sans-serif; padding: 24px; color: #111; }
  h1 { font-size: 16px; margin: 0 0 4px; }
  p.meta { font-size: 11px; color: #555; margin: 0 0 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 10px; }
  th, td { border: 1px solid #ddd; padding: 4px 6px; text-align: left; vertical-align: top; }
  th { background: #f3f4f6; }
</style></head><body>
<h1>${titulo}</h1>
<p class="meta">Edu-Gov · Integration Hub · gerado em ${new Date().toLocaleString("pt-BR")}${resumo ? ` · ${resumo}` : ""}</p>
<table><thead><tr>${colunas.map((c) => `<th>${c.rotulo}</th>`).join("")}</tr></thead>
<tbody>${rows
    .map((r) => `<tr>${colunas.map((c) => `<td>${cell(c.valor(r)).replace(/[<>]/g, "")}</td>`).join("")}</tr>`)
    .join("")}</tbody></table>
<script>window.onload = () => window.print();<\/script>
</body></html>`;
  const w = window.open("", "_blank", "width=1024,height=768");
  if (!w) throw new Error("Bloqueio de pop-up impediu a geração do PDF.");
  w.document.write(html);
  w.document.close();
}
