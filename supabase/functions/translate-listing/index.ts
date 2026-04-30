// Translates a single listing's text fields (title, description, address, area, options[])
// from a source language into Mongolian, Korean, English, Russian, Chinese, Vietnamese
// using Lovable AI Gateway (Gemini 2.5 Pro).
//
// Request body:
//   { sourceLang?: "mn" | "ko" | "en" | "ru" | "zh" | "vi",
//     fields: { title?: string, description?: string, address?: string, area?: string, options?: string[] } }
//
// Response body:
//   { titleTranslations?: Record<lang,string>, descriptionTranslations?: Record<lang,string>,
//     addressTranslations?: Record<lang,string>, areaTranslations?: Record<lang,string>,
//     optionsTranslations?: Record<lang,string[]> }
//
// All target languages are filled. The source language is included as-is.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LANGS = ["mn", "ko", "en", "ru", "zh", "vi"] as const;
type Lang = (typeof LANGS)[number];

const LANG_NAME: Record<Lang, string> = {
  mn: "Mongolian (Cyrillic)",
  ko: "Korean",
  en: "English",
  ru: "Russian",
  zh: "Simplified Chinese",
  vi: "Vietnamese",
};

interface Fields {
  title?: string;
  description?: string;
  address?: string;
  area?: string;
  options?: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const { sourceLang = "mn", fields } = (await req.json()) as {
      sourceLang?: Lang;
      fields: Fields;
    };

    if (!fields || typeof fields !== "object") {
      return new Response(JSON.stringify({ error: "fields is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const targets = LANGS.filter((l) => l !== sourceLang);

    // Build a single prompt that asks the model to produce JSON for all fields/langs.
    const payload = {
      source_language: LANG_NAME[sourceLang],
      target_languages: targets.map((t) => ({ code: t, name: LANG_NAME[t] })),
      fields: {
        title: fields.title ?? "",
        description: fields.description ?? "",
        address: fields.address ?? "",
        area: fields.area ?? "",
        options: Array.isArray(fields.options) ? fields.options : [],
      },
    };

    const systemPrompt = `You are a professional translator for a Korean real-estate rental website used by Mongolians, Koreans, English speakers, Russians, Chinese, and Vietnamese.
Translate the provided fields from the source language into every target language.

Rules:
- Keep meaning natural and idiomatic in each target language.
- For Korean addresses, area names, subway/station names, and proper nouns: keep them in their native form (Hangul / Hanja). Do NOT transliterate Korean place names back into other scripts unless the source already used a transliteration.
- For numbers, prices, and units: keep as-is.
- For "options" (amenities/features), translate each item but keep the array length and order identical.
- Never add commentary; only fill the JSON fields.
- If a source field is empty, return an empty string (or empty array) for every language.`;

    const tool = {
      type: "function",
      function: {
        name: "return_translations",
        description: "Return translations for every target language and field.",
        parameters: {
          type: "object",
          properties: {
            translations: {
              type: "object",
              description:
                "Map of language code -> { title, description, address, area, options[] }",
              properties: Object.fromEntries(
                targets.map((t) => [
                  t,
                  {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      description: { type: "string" },
                      address: { type: "string" },
                      area: { type: "string" },
                      options: {
                        type: "array",
                        items: { type: "string" },
                      },
                    },
                    required: [
                      "title",
                      "description",
                      "address",
                      "area",
                      "options",
                    ],
                    additionalProperties: false,
                  },
                ]),
              ),
              required: targets as unknown as string[],
              additionalProperties: false,
            },
          },
          required: ["translations"],
          additionalProperties: false,
        },
      },
    };

    const aiRes = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: JSON.stringify(payload) },
          ],
          tools: [tool],
          tool_choice: {
            type: "function",
            function: { name: "return_translations" },
          },
        }),
      },
    );

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI error", aiRes.status, errText);
      if (aiRes.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, try again shortly." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      if (aiRes.status === 402) {
        return new Response(
          JSON.stringify({
            error: "AI credits exhausted. Top up in Settings → Workspace → Usage.",
          }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      return new Response(
        JSON.stringify({ error: "AI gateway error", detail: errText }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const data = await aiRes.json();
    const call = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!call?.function?.arguments) {
      console.error("No tool call returned", JSON.stringify(data));
      return new Response(
        JSON.stringify({ error: "Invalid AI response" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const parsed = JSON.parse(call.function.arguments) as {
      translations: Record<
        string,
        {
          title: string;
          description: string;
          address: string;
          area: string;
          options: string[];
        }
      >;
    };

    // Add source language as-is.
    const titleTranslations: Record<string, string> = {};
    const descriptionTranslations: Record<string, string> = {};
    const addressTranslations: Record<string, string> = {};
    const areaTranslations: Record<string, string> = {};
    const optionsTranslations: Record<string, string[]> = {};

    titleTranslations[sourceLang] = fields.title ?? "";
    descriptionTranslations[sourceLang] = fields.description ?? "";
    addressTranslations[sourceLang] = fields.address ?? "";
    areaTranslations[sourceLang] = fields.area ?? "";
    optionsTranslations[sourceLang] = Array.isArray(fields.options)
      ? fields.options
      : [];

    for (const t of targets) {
      const v = parsed.translations[t];
      if (!v) continue;
      titleTranslations[t] = v.title ?? "";
      descriptionTranslations[t] = v.description ?? "";
      addressTranslations[t] = v.address ?? "";
      areaTranslations[t] = v.area ?? "";
      optionsTranslations[t] = Array.isArray(v.options) ? v.options : [];
    }

    return new Response(
      JSON.stringify({
        titleTranslations,
        descriptionTranslations,
        addressTranslations,
        areaTranslations,
        optionsTranslations,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("translate-listing error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
