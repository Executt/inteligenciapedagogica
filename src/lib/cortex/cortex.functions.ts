import { createServerFn } from "@tanstack/react-start";
import { generateText, Output, NoObjectGeneratedError } from "ai";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  createLovableAiGatewayProvider,
  embedTexts,
  requireLovableApiKey,
} from "@/lib/ai-gateway.server";
import { rotearIngestao, rotearAnaliseFinal, detectarTipo } from "./router";
import { chunkText } from "./chunk";

// ============ Uploads ============
export const criarUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ alunoId: z.string().min(1), nome: z.string().min(1) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const safe = data.nome.replace(/[^\w.\-]+/g, "_");
    const path = `${context.userId}/${data.alunoId}/${Date.now()}_${safe}`;
    const { data: signed, error } = await supabaseAdmin.storage
      .from("dossies")
      .createSignedUploadUrl(path);
    if (error) throw new Error(error.message);
    return { path, token: signed.token, signedUrl: signed.signedUrl };
  });

// ============ Listar documentos ============
export const listarDocumentos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ alunoId: z.string() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("documentos_aluno")
      .select("*")
      .eq("aluno_id", data.alunoId)
      .order("criado_em", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// ============ Ingestão ============
const IngestInput = z.object({
  alunoId: z.string(),
  storagePath: z.string(),
  nome: z.string(),
  mime: z.string(),
  tamanho: z.number(),
  sensivel: z.boolean().default(false),
});

export const ingestDocumento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => IngestInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const tipo = detectarTipo(data.mime);
    const rota = rotearIngestao({
      mime: data.mime,
      tamanhoBytes: data.tamanho,
      sensivel: data.sensivel,
    });

    // Cria registro
    const { data: doc, error: insErr } = await context.supabase
      .from("documentos_aluno")
      .insert({
        aluno_id: data.alunoId,
        tipo,
        nome: data.nome,
        storage_path: data.storagePath,
        mime: data.mime,
        tamanho: data.tamanho,
        sensivel: data.sensivel,
        status_ingestao: "PROCESSANDO",
        modelo_usado: rota.modelo,
        rota_roteador: rota.rota,
        criado_por: context.userId,
      })
      .select()
      .single();
    if (insErr || !doc) throw new Error(insErr?.message ?? "Falha ao registrar documento");

    try {
      // Baixa do storage
      const { data: blob, error: dlErr } = await supabaseAdmin.storage
        .from("dossies")
        .download(data.storagePath);
      if (dlErr || !blob) throw new Error(dlErr?.message ?? "Falha ao baixar arquivo");

      // Extrai texto
      let textoExtraido = "";
      if (tipo === "texto" || tipo === "planilha") {
        textoExtraido = await blob.text();
      } else {
        // imagem/pdf → gemini multimodal
        const key = requireLovableApiKey();
        const ab = await blob.arrayBuffer();
        const b64 = Buffer.from(ab).toString("base64");
        const contentBlock =
          tipo === "imagem"
            ? { type: "image_url" as const, image_url: { url: `data:${data.mime};base64,${b64}` } }
            : {
                type: "file" as const,
                file: { filename: data.nome, file_data: `data:${data.mime};base64,${b64}` },
              };
        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Lovable-API-Key": key,
          },
          body: JSON.stringify({
            model: rota.modelo,
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: "Transcreva integralmente o conteúdo deste documento educacional em português. Preserve estrutura (títulos, listas, tabelas se houver). Se for prova manuscrita, transcreva as respostas do aluno e observações. Retorne apenas o texto transcrito.",
                  },
                  contentBlock,
                ],
              },
            ],
          }),
        });
        if (!res.ok) throw new Error(`OCR/extração falhou [${res.status}]: ${await res.text()}`);
        const j = (await res.json()) as {
          choices: { message: { content: string } }[];
        };
        textoExtraido = j.choices?.[0]?.message?.content ?? "";
      }

      // Sumário + tom + competências (rota econômica)
      const provider = createLovableAiGatewayProvider(requireLovableApiKey());
      const model = provider("google/gemini-3.1-flash-lite");
      let resumo = "";
      let tom = "neutro";
      let competencias: string[] = [];
      try {
        const meta = await generateText({
          model,
          output: Output.object({
            schema: z.object({
              resumo: z.string(),
              tom_emocional: z.string(),
              competencias_bncc: z.array(z.string()),
            }),
          }),
          prompt: `Analise este material do dossiê do aluno. Devolva um resumo em 3 frases, o tom emocional predominante (ex: neutro, positivo, ansioso, frustrado, motivado) e até 6 competências BNCC citadas ou inferidas (códigos como EF08MA ou nomes curtos).\n\n---\n${textoExtraido.slice(0, 8000)}`,
        });
        resumo = meta.output.resumo;
        tom = meta.output.tom_emocional;
        competencias = meta.output.competencias_bncc.slice(0, 6);
      } catch (e) {
        if (!NoObjectGeneratedError.isInstance(e)) throw e;
      }

      // Chunk + embeddings
      const chunks = chunkText(textoExtraido);
      if (chunks.length > 0) {
        const embeddings = await embedTexts(chunks);
        const rows = chunks.map((texto, ordem) => ({
          documento_id: doc.id,
          aluno_id: data.alunoId,
          criado_por: context.userId,
          ordem,
          texto,
          embedding: embeddings[ordem] as unknown as string,
          metadados: { nome: data.nome, tipo },
        }));
        const { error: chErr } = await context.supabase.from("documento_chunks").insert(rows);
        if (chErr) throw new Error(chErr.message);
      }

      await context.supabase
        .from("documentos_aluno")
        .update({
          status_ingestao: "PROCESSADO",
          resumo,
          tom_emocional: tom,
          competencias,
        })
        .eq("id", doc.id);

      return { ok: true, documentoId: doc.id, chunks: chunks.length };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await context.supabase
        .from("documentos_aluno")
        .update({ status_ingestao: "ERRO", erro: msg })
        .eq("id", doc.id);
      throw new Error(msg);
    }
  });

// ============ Deletar documento ============
export const deletarDocumento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: doc } = await context.supabase
      .from("documentos_aluno")
      .select("storage_path")
      .eq("id", data.id)
      .single();
    if (doc?.storage_path) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.storage.from("dossies").remove([doc.storage_path]);
    }
    await context.supabase.from("documentos_aluno").delete().eq("id", data.id);
    return { ok: true };
  });

// ============ Gerar análise integral (RAG + 3 eixos) ============
const AnaliseSchema = z.object({
  eixo_educacional: z.object({
    diagnostico: z.string(),
    competencias_bncc: z.array(z.string()),
    evidencias: z.array(z.string()),
  }),
  eixo_cognitivo: z.object({
    diagnostico: z.string(),
    estilos_aprendizagem: z.array(z.string()),
    padroes_raciocinio: z.array(z.string()),
    evidencias: z.array(z.string()),
  }),
  eixo_socioemocional: z.object({
    diagnostico: z.string(),
    indicadores: z.array(z.string()),
    sinais_alerta: z.array(z.string()),
    evidencias: z.array(z.string()),
  }),
  plano_acao: z.array(
    z.object({
      publico_alvo: z.enum(["pais", "professores", "direcao"]),
      acao: z.string(),
      prazo: z.string(),
      responsavel_sugerido: z.string(),
    }),
  ),
  lacunas_de_dados: z.array(z.string()),
});

export const gerarAnaliseCortex = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        alunoId: z.string(),
        publico: z.enum(["direcao", "professores", "pais"]),
        contexto: z.string().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    // 1. RAG — busca chunks relevantes
    const queryTexto = `Perfil integral do aluno: desempenho acadêmico, competências BNCC, padrões cognitivos, indicadores socioemocionais, evidências recentes. ${data.contexto ?? ""}`;
    const [queryEmbedding] = await embedTexts([queryTexto]);
    const { data: matches, error: mErr } = await context.supabase.rpc("match_documento_chunks", {
      p_aluno_id: data.alunoId,
      p_query_embedding: queryEmbedding as unknown as string,
      p_match_count: 8,
      p_criado_por: context.userId,
    });
    if (mErr) throw new Error(mErr.message);

    const fontes = (matches ?? []) as Array<{
      id: string;
      documento_id: string;
      texto: string;
      metadados: Record<string, unknown>;
      similarity: number;
    }>;

    // 2. Documentos + metadados
    const { data: docs } = await context.supabase
      .from("documentos_aluno")
      .select("nome,tipo,resumo,tom_emocional,competencias")
      .eq("aluno_id", data.alunoId);

    const contextoRag = fontes.length
      ? fontes
          .map(
            (f, i) =>
              `[fonte ${i + 1} · similaridade ${f.similarity.toFixed(2)}] ${f.texto.slice(0, 800)}`,
          )
          .join("\n\n")
      : "(nenhum documento vetorial disponível para este aluno)";

    const contextoDocs = (docs ?? []).length
      ? (docs ?? [])
          .map(
            (d) =>
              `- ${d.nome} (${d.tipo}) · tom: ${d.tom_emocional ?? "n/d"} · competências: ${(d.competencias as string[] | null)?.join(", ") ?? "n/d"}\n  resumo: ${d.resumo ?? "n/d"}`,
          )
          .join("\n")
      : "(sem documentos ingeridos)";

    // 3. Modelo premium
    const rota = rotearAnaliseFinal(data.publico);
    const provider = createLovableAiGatewayProvider(requireLovableApiKey());
    const model = provider(rota.modelo);

    const tomMap = {
      direcao: "clínico, estratégico, com métricas agregadas e recomendações macro",
      professores: "operacional, pedagógico, com ações por disciplina e sequências didáticas",
      pais: "acolhedor, empático, em linguagem acessível e sem jargão técnico",
    } as const;

    const prompt = `Você é o Edu-Córtex, orquestrador de inteligência pedagógica.
Público-alvo: ${data.publico.toUpperCase()} — tom ${tomMap[data.publico]}.
REGRA ABSOLUTA: Zero alucinação. Se as fontes RAG e metadados abaixo não sustentarem uma afirmação, declare a lacuna em "lacunas_de_dados" e NÃO invente.

## Metadados dos documentos do dossiê
${contextoDocs}

## Fontes vetoriais (RAG top-${fontes.length})
${contextoRag}

Gere análise obrigatoriamente nos 3 eixos (Educacional / Cognitivo / Socioemocional) e um plano de ação prático com público-alvo (pais/professores/direcao), prazo e responsável sugerido. Cite evidências (trecho curto ou nome do documento) sempre que possível.`;

    let output: z.infer<typeof AnaliseSchema>;
    try {
      const res = await generateText({
        model,
        output: Output.object({ schema: AnaliseSchema }),
        prompt,
      });
      output = res.output;
    } catch (e) {
      if (NoObjectGeneratedError.isInstance(e)) {
        throw new Error(
          "Modelo não retornou análise estruturada. Tente novamente com mais documentos no dossiê.",
        );
      }
      throw e;
    }

    // 4. Persiste
    const { data: saved, error: sErr } = await context.supabase
      .from("cortex_analises")
      .insert({
        aluno_id: data.alunoId,
        publico_alvo: data.publico,
        eixo_educacional: output.eixo_educacional,
        eixo_cognitivo: output.eixo_cognitivo,
        eixo_socioemocional: output.eixo_socioemocional,
        plano_acao: output.plano_acao,
        fontes: fontes.map((f) => ({
          documento_id: f.documento_id,
          similarity: f.similarity,
          trecho: f.texto.slice(0, 240),
        })),
        modelo_usado: rota.modelo,
        rota_roteador: rota.rota,
        criado_por: context.userId,
      })
      .select()
      .single();
    if (sErr) throw new Error(sErr.message);

    return {
      analise: saved,
      lacunas: output.lacunas_de_dados,
      rota_roteador: rota,
    };
  });

// ============ Listar análises ============
export const listarAnalises = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ alunoId: z.string() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("cortex_analises")
      .select("*")
      .eq("aluno_id", data.alunoId)
      .order("criado_em", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
