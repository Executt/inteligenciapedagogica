import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  PULSE_DEFAULTS,
  PULSE_SETTING_KEY,
  hmacSha256Hex,
  safeEqual,
  sha256Hex,
  type PulseIngestConfig,
} from "@/lib/pulse/hash";

const payloadSchema = z.object({
  event_type: z.string().min(1).max(120),
  external_id: z.string().max(200).nullish(),
  payload: z.record(z.any()).default({}),
});

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, authorization, x-pulse-timestamp, x-pulse-nonce, x-pulse-signature",
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
            assinatura: {
              headers: ["x-pulse-timestamp", "x-pulse-nonce", "x-pulse-signature"],
              algoritmo: "HMAC-SHA256(token, `${timestamp}.${nonce}.${rawBody}`)",
              antiReplay: "nonce único + janela de tempo configurável",
            },
            body: { event_type: "string", external_id: "string?", payload: "object" },
          }),
          { status: 200, headers: { "content-type": "application/json", ...CORS_HEADERS } },
        ),
      POST: async ({ request }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: settingRow } = await supabaseAdmin
          .from("app_settings")
          .select("valor")
          .eq("chave", PULSE_SETTING_KEY)
          .maybeSingle();
        const cfg: PulseIngestConfig = { ...PULSE_DEFAULTS, ...((settingRow?.valor ?? {}) as PulseIngestConfig) };

        const envToken = process.env["PULSE_INGEST_TOKEN"];
        const allowEnv = cfg.allow_env_token ?? PULSE_DEFAULTS.allow_env_token;
        if (!cfg.token_hash && !(allowEnv && envToken)) {
          return json({ error: "ingest_disabled" }, 503);
        }

        const auth = request.headers.get("authorization") ?? "";
        const token = auth.replace(/^Bearer\s+/i, "").trim();
        if (!token) return json({ error: "unauthorized" }, 401);

        let authorized = false;
        if (cfg.token_hash) {
          authorized = safeEqual(await sha256Hex(token), cfg.token_hash);
        }
        if (!authorized && allowEnv && envToken) {
          authorized = token.length === envToken.length && safeEqual(token, envToken);
        }
        if (!authorized) return json({ error: "unauthorized" }, 401);

        const rawBody = await request.text();

        // ── Assinatura + proteção contra replay ──
        const skew = cfg.skew_seconds ?? PULSE_DEFAULTS.skew_seconds;
        const tsHeader = request.headers.get("x-pulse-timestamp");
        const nonce = request.headers.get("x-pulse-nonce");
        const signature = request.headers.get("x-pulse-signature");
        const signaturePresent = Boolean(tsHeader || nonce || signature);
        const requireSignature = cfg.require_signature ?? PULSE_DEFAULTS.require_signature;

        if (requireSignature || signaturePresent) {
          if (!tsHeader || !nonce || !signature) {
            return json({ error: "signature_required", detail: "Envie x-pulse-timestamp, x-pulse-nonce e x-pulse-signature." }, 401);
          }
          const tsNum = Number(tsHeader);
          const tsMs = !Number.isFinite(tsNum)
            ? Date.parse(tsHeader)
            : tsNum > 1e12 ? tsNum : tsNum * 1000;
          if (!Number.isFinite(tsMs)) return json({ error: "invalid_timestamp" }, 400);
          if (Math.abs(Date.now() - tsMs) > skew * 1000) {
            return json({ error: "timestamp_out_of_window", detail: `Janela permitida: ${skew}s` }, 401);
          }
          if (nonce.length < 8 || nonce.length > 200) return json({ error: "invalid_nonce" }, 400);

          const expected = await hmacSha256Hex(token, `${tsHeader}.${nonce}.${rawBody}`);
          if (!safeEqual(signature.trim().toLowerCase(), expected)) {
            return json({ error: "invalid_signature" }, 401);
          }

          await supabaseAdmin.rpc("purge_pulse_nonces");
          const { error: nonceError } = await supabaseAdmin
            .from("pulse_ingest_nonces")
            .insert({
              nonce,
              request_ts: new Date(tsMs).toISOString(),
              expires_at: new Date(Date.now() + skew * 2000).toISOString(),
            });
          if (nonceError) {
            if (nonceError.code === "23505") return json({ error: "replay_detected" }, 409);
            console.error("pulse nonce insert failed", nonceError);
            return json({ error: "replay_check_failed" }, 500);
          }
        }

        let body: unknown;
        try {
          body = JSON.parse(rawBody);
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

        return json({ ok: true, id: data.id, received_at: data.received_at, signed: requireSignature || signaturePresent }, 201);
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
