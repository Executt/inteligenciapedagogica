/**
 * Integration Hub — barramento interno de eventos.
 *
 * Persistência mínima em `hub_events` + `hub_event_deliveries` (outbox pattern).
 * O contrato de publicação/consumo é agnóstico de transporte: hoje a fila é a própria
 * tabela; a migração para RabbitMQ/Kafka substitui apenas o "driver" de entrega,
 * mantendo `nome`, `agregado`, `correlacao_id` e `payload` inalterados.
 */
import type { DomainEventName } from "@/lib/platform/contracts";

export type EventAggregate = "student" | "school" | "class" | "teacher" | "grade" | "council";

export const EVENT_CATALOG: Array<{
  nome: DomainEventName;
  agregado: EventAggregate;
  descricao: string;
}> = [
  { nome: "StudentCreated", agregado: "student", descricao: "Aluno criado no Core Platform." },
  { nome: "StudentUpdated", agregado: "student", descricao: "Dados cadastrais do aluno alterados." },
  { nome: "StudentTransferred", agregado: "student", descricao: "Transferência entre unidades escolares." },
  { nome: "SchoolCreated", agregado: "school", descricao: "Unidade escolar cadastrada." },
  { nome: "SchoolUpdated", agregado: "school", descricao: "Dados da unidade escolar alterados." },
  { nome: "TeacherCreated", agregado: "teacher", descricao: "Professor/servidor cadastrado." },
  { nome: "ClassCreated", agregado: "class", descricao: "Turma criada para o ano letivo." },
  { nome: "AttendanceImported", agregado: "class", descricao: "Frequência importada de sistema externo." },
  { nome: "GradeUpdated", agregado: "grade", descricao: "Nota ou avaliação atualizada." },
  { nome: "CouncilMeetingCreated", agregado: "council", descricao: "Ata de conselho pedagógico registrada." },
];

export const EVENT_AGGREGATE: Record<DomainEventName, EventAggregate> = Object.fromEntries(
  EVENT_CATALOG.map((e) => [e.nome, e.agregado]),
) as Record<DomainEventName, EventAggregate>;

/** Consumidores registrados no barramento (camadas internas). */
export const CONSUMIDORES = ["analytics", "ai-services", "administration", "integration-hub"] as const;
export type Consumidor = (typeof CONSUMIDORES)[number];

/** Transporte atual do barramento — trocável sem alterar os contratos acima. */
export const BUS_TRANSPORT = {
  atual: "postgres-outbox",
  planejado: ["rabbitmq", "kafka"],
} as const;
