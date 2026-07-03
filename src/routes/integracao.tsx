import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Upload, FileText, FileSpreadsheet, Image as ImageIcon, FileJson, CheckCircle2, Loader2 } from "lucide-react";
import { uploadDocumento } from "@/lib/api";

export const Route = createFileRoute("/integracao")({ component: Integracao });

type JobStatus = "enviando" | "ocr" | "extraindo" | "concluido";
type Job = { id: string; nome: string; tipo: string; tamanho: string; progresso: number; status: JobStatus };

const initial: Job[] = [
  { id: "j1", nome: "censo_escolar_2025_parcial.csv", tipo: "CSV", tamanho: "2.4 MB", progresso: 100, status: "concluido" },
  { id: "j2", nome: "boletins_5B_novembro.pdf", tipo: "PDF", tamanho: "8.1 MB", progresso: 100, status: "concluido" },
  { id: "j3", nome: "ata_conselho_20251103.pdf", tipo: "PDF", tamanho: "3.2 MB", progresso: 68, status: "ocr" },
  { id: "j4", nome: "planilha_frequencia_gov.json", tipo: "JSON", tamanho: "612 KB", progresso: 42, status: "extraindo" },
];

function Integracao() {
  const [jobs, setJobs] = useState<Job[]>(initial);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = useCallback((files: FileList | File[]) => {
    Array.from(files).forEach((file) => {
      const id = `j_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const ext = file.name.split(".").pop()?.toUpperCase() ?? "?";
      const size = `${(file.size / 1024 / 1024).toFixed(2)} MB`;
      setJobs((prev) => [{ id, nome: file.name, tipo: ext, tamanho: size, progresso: 0, status: "enviando" }, ...prev]);
      toast.info(`Enviando ${file.name}...`);

      uploadDocumento(file, (p) => {
        setJobs((prev) => prev.map((j) => j.id === id ? {
          ...j,
          progresso: p,
          status: p < 40 ? "enviando" : p < 75 ? "ocr" : p < 100 ? "extraindo" : "concluido",
        } : j));
      }).then(() => {
        toast.success(`${file.name} processado · OCR + extração IA concluídos`);
      });
    });
  }, []);

  return (
    <AppShell>
      <div className="p-8 max-w-[1400px] mx-auto">
        <PageHeader
          title="Integração de Dados Governamentais"
          subtitle="Ingestão de CSV, JSON, PDFs e imagens da administração pública. OCR + extração assíncrona por IA."
          actions={<Badge variant="outline" className="font-normal">Endpoint: POST /api/v1/import/gov-data</Badge>}
        />

        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card
            className={`col-span-2 border-2 border-dashed transition-colors ${dragOver ? "border-primary bg-primary/5" : "border-border"}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault(); setDragOver(false);
              if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
            }}
          >
            <CardContent className="p-12 flex flex-col items-center text-center">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Upload className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-base font-semibold mb-1">Arraste arquivos ou clique para enviar</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-md">
                Suporta planilhas do INEP/SIGE (CSV, XLSX, JSON), boletins e atas em PDF e imagens de documentos escaneados (OCR automático).
              </p>
              <div className="flex items-center gap-2 mb-4">
                <Badge variant="secondary" className="gap-1"><FileSpreadsheet className="h-3 w-3" /> CSV / XLSX</Badge>
                <Badge variant="secondary" className="gap-1"><FileJson className="h-3 w-3" /> JSON</Badge>
                <Badge variant="secondary" className="gap-1"><FileText className="h-3 w-3" /> PDF</Badge>
                <Badge variant="secondary" className="gap-1"><ImageIcon className="h-3 w-3" /> Imagens</Badge>
              </div>
              <label>
                <input type="file" multiple className="hidden" onChange={(e) => e.target.files && handleFiles(e.target.files)} />
                <Button asChild><span>Selecionar arquivos</span></Button>
              </label>
              <p className="text-[11px] text-muted-foreground mt-3">Tamanho máx. por arquivo: 50 MB · LGPD compliant · Dados criptografados em trânsito</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Pipeline de Processamento</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <PipelineStep n={1} label="Upload seguro (S3/MinIO)" done />
              <PipelineStep n={2} label="Detecção de tipo + validação" done />
              <PipelineStep n={3} label="OCR (Tesseract + LayoutLMv3)" active />
              <PipelineStep n={4} label="Extração estruturada (LLM)" />
              <PipelineStep n={5} label="Normalização + persistência" />
              <PipelineStep n={6} label="Reindexação analítica" />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Fila de Processamento</CardTitle>
            <Badge variant="outline" className="font-normal">{jobs.filter(j => j.status !== "concluido").length} em andamento</Badge>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {jobs.map((j) => <JobRow key={j.id} job={j} />)}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function PipelineStep({ n, label, done, active }: { n: number; label: string; done?: boolean; active?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-semibold ${
        done ? "bg-success text-success-foreground" : active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
      }`}>
        {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : active ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : n}
      </div>
      <span className={done ? "text-muted-foreground line-through" : active ? "font-medium" : "text-muted-foreground"}>{label}</span>
    </div>
  );
}

function JobRow({ job }: { job: Job }) {
  const Icon = job.tipo === "PDF" ? FileText : job.tipo === "JSON" ? FileJson : job.tipo === "CSV" ? FileSpreadsheet : ImageIcon;
  const statusLabel = {
    enviando: "Enviando…",
    ocr: "OCR em andamento",
    extraindo: "Extração por IA",
    concluido: "Concluído",
  }[job.status];
  return (
    <div className="py-3 flex items-center gap-4">
      <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{job.nome}</span>
          <Badge variant="outline" className="text-[10px]">{job.tipo}</Badge>
          <span className="text-xs text-muted-foreground">{job.tamanho}</span>
        </div>
        <div className="flex items-center gap-3 mt-1.5">
          <Progress value={job.progresso} className="h-1.5 flex-1" />
          <span className="text-xs text-muted-foreground w-12 text-right">{job.progresso}%</span>
        </div>
      </div>
      <Badge variant={job.status === "concluido" ? "outline" : "secondary"} className="shrink-0">
        {job.status === "concluido" ? <CheckCircle2 className="h-3 w-3 mr-1 text-success" /> : <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
        {statusLabel}
      </Badge>
    </div>
  );
}
