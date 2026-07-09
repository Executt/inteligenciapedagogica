import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const payloadSchema = z.object({
  event_type: z.string().min(1).max(120),
  external_id: z.string().max(200).nullish(),
  payload: z.record(z.any()).default({}),
});

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, authorization",
};

export const Route = createFileRoute("/api/public/pulse/ingest")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      GET: async () =>
        new Response(
          JSON.stringify({
            ok: true,
            endpoint: "POST /api/public/pulse/ingest",
            auth: "Authorization: Bearer <PULSE_INGEST_TOKEN>",
            body: { event_type: "string", external_id: "string?", payload: "object" },
          }),
          { status: 200, headers: { "content-type": "application/json", ...CORS_HEADERS } },
        ),
      POST: async ({ request }) => {
        const expected = process.env.PULSE_INGEST_TOKEN;
        if (!expected) {
          return json({ error: "ingest_disabled" }, 503);
        }
        const auth = request.headers.get("authorization") ?? "";
        const token = auth.replace(/^Bearer\s+/i, "").trim();
        if (!token || token !== expected) {
          return json({ error: "unauthorized" }, 401);
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return json({ error: "invalid_json" }, 400);
        }
        const parsed = payloadSchema.safeParse(body);
        if (!parsed.success) {
          return json({ error: "invalid_payload", issues: parsed.error.issues }, 422);
        }

        const ip =
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          request.headers.get("cf-connecting-ip") ??
          null;
        const ua = request.headers.get("user-agent");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .from("pulse_events")
          .insert({
            source: "pedagogica-pulse",
            event_type: parsed.data.event_type,
            external_id: parsed.data.external_id ?? null,
            payload: parsed.data.payload,
            ip,
            user_agent: ua,
          })
          .select("id, received_at")
          .single();

        if (error) {
          console.error("pulse ingest insert failed", error);
          return json({ error: "persist_failed", detail: error.message }, 500);
        }

        return json({ ok: true, id: data.id, received_at: data.received_at }, 201);
      },
    },
  },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...CORS_HEADERS },
  });
}
