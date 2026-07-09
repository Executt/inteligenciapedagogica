import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Acesso restrito.");
}

const listSchema = z.object({
  limit: z.number().min(1).max(200).default(50),
  event_type: z.string().optional(),
}).default({ limit: 50 });

export const listPulseEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.input<typeof listSchema>) => listSchema.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    let q = context.supabase
      .from("pulse_events")
      .select("id, source, event_type, external_id, payload, ip, user_agent, processed, received_at")
      .order("received_at", { ascending: false })
      .limit(data.limit);
    if (data.event_type) q = q.eq("event_type", data.event_type);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getPulseIngestStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const configured = Boolean(process.env.PULSE_INGEST_TOKEN);
    const { count } = await context.supabase
      .from("pulse_events")
      .select("id", { count: "exact", head: true });
    return { configured, total: count ?? 0 };
  });
