import { createServerFn } from "@tanstack/react-start";

const TARGET_LANGS: Record<string, string> = {
  ko: "Korean",
  en: "English",
  ru: "Russian",
  zh: "Simplified Chinese",
  vi: "Vietnamese",
};

type TranslateInput = { text: string; sourceLang?: string };

export const translateDescription = createServerFn({ method: "POST" })
  .inputValidator((input: TranslateInput) => {
    if (!input || typeof input.text !== "string") throw new Error("text required");
    return { text: input.text.trim(), sourceLang: input.sourceLang || "Mongolian" };
  })
  .handler(async ({ data }) => {
    if (!data.text) return {};

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

    const targets = Object.entries(TARGET_LANGS);
    const systemPrompt = `You are a professional translator. Translate the user's real-estate listing description from ${data.sourceLang} into multiple languages. Preserve meaning, tone, line breaks, numbers and proper nouns. Do not add commentary.`;

    const userPrompt = `Translate the following text into these languages and return via the tool call:\n${targets
      .map(([code, name]) => `- ${code}: ${name}`)
      .join("\n")}\n\nText:\n"""\n${data.text}\n"""`;

    const properties: Record<string, { type: string; description: string }> = {};
    const required: string[] = [];
    for (const [code, name] of targets) {
      properties[code] = { type: "string", description: `Translation in ${name}` };
      required.push(code);
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "save_translations",
              description: "Save the translations of the input text",
              parameters: {
                type: "object",
                properties,
                required,
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "save_translations" } },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error("[translate] gateway error", response.status, body);
      if (response.status === 429) throw new Error("Rate limit exceeded. Please try again shortly.");
      if (response.status === 402) throw new Error("AI credits exhausted. Add credits in Workspace Settings.");
      throw new Error(`Translation failed (${response.status})`);
    }

    const json = (await response.json()) as {
      choices?: Array<{
        message?: {
          tool_calls?: Array<{ function?: { arguments?: string } }>;
        };
      }>;
    };
    const args = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) {
      console.error("[translate] missing tool call", JSON.stringify(json));
      throw new Error("Translation failed: empty response");
    }
    let parsed: Record<string, string>;
    try {
      parsed = JSON.parse(args);
    } catch {
      throw new Error("Translation failed: invalid response");
    }

    const out: Record<string, string> = {};
    for (const code of Object.keys(TARGET_LANGS)) {
      if (typeof parsed[code] === "string" && parsed[code].trim()) {
        out[code] = parsed[code].trim();
      }
    }
    return out;
  });
