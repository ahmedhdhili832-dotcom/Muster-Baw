const MODEL = "gemini-3.7-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const schema = {
  type: "object",
  properties: {
    summary: { type: "string" },
    drawing_type: { type: "string" },
    connectors: {
      type: "array",
      items: {
        type: "object",
        properties: {
          reference: { type: "string" },
          type: { type: "string" },
          pins: { type: "array", items: { type: "string" } },
          location: { type: "string" },
          confidence: { type: "number" }
        },
        required: ["reference", "type", "pins", "location", "confidence"]
      }
    },
    wires: {
      type: "array",
      items: {
        type: "object",
        properties: {
          reference: { type: "string" },
          color: { type: "string" },
          section: { type: "string" },
          from: { type: "string" },
          to: { type: "string" },
          pin_from: { type: "string" },
          pin_to: { type: "string" },
          length: { type: "string" },
          terminal: { type: "string" },
          contact: { type: "string" },
          path: { type: "string" },
          confidence: { type: "number" }
        },
        required: ["reference", "color", "section", "from", "to", "pin_from", "pin_to", "length", "terminal", "contact", "path", "confidence"]
      }
    },
    warnings: { type: "array", items: { type: "string" } },
    confidence: { type: "number" }
  },
  required: ["summary", "drawing_type", "connectors", "wires", "warnings", "confidence"]
};

const instruction = `You are MUSTER BAW Engineering Vision AI for automotive wire-harness drawings.
Analyze the supplied drawing visually, not OCR alone. Identify visible connectors, wires, electrical symbols and relationships you can justify.
Trace colored wire paths when visible. Read connector references, pin/cavity labels, wire colors, cross-sections, terminal/contact references, branches and approximate paths/lengths when visible.
Distinguish crossings from true junctions only when the drawing supports it.
NEVER invent data. If a value cannot be read or inferred safely from the drawing, return "unknown".
Confidence must be a number from 0 to 1. Flag uncertain engineering relationships in warnings.
The output will be reviewed by a human, so precision is more important than filling every field.`;

function json(statusCode, data) {
  return new Response(JSON.stringify(data), {
    status: statusCode,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" }
  });
}

export default async (request) => {
  if (request.method === "OPTIONS") return json(204, {});
  if (request.method !== "POST") return json(405, { error: "Method not allowed" });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return json(500, { error: "GEMINI_API_KEY is not configured on Netlify." });

  try {
    const body = await request.json();
    const { data, mimeType, fileName } = body || {};
    if (!data || !mimeType) return json(400, { error: "Missing drawing data or MIME type." });
    if (!/^image\/(png|jpeg|webp|bmp|tiff)$/i.test(mimeType) && mimeType !== "application/pdf") {
      return json(400, { error: "Unsupported drawing format." });
    }
    if (typeof data !== "string" || data.length > 6000000) {
      return json(413, { error: "Drawing is too large for the Netlify function payload. Use a compressed image below 4.5 MB." });
    }

    const response = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          role: "user",
          parts: [
            { text: `${instruction}\nFile: ${fileName || "drawing"}` },
            { inline_data: { mime_type: mimeType, data } }
          ]
        }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: schema,
          thinkingConfig: { thinkingLevel: "medium" }
        }
      })
    });

    const raw = await response.text();
    if (!response.ok) {
      let detail = raw;
      try { detail = JSON.parse(raw)?.error?.message || raw; } catch (_) {}
      return json(response.status, { error: `Gemini: ${detail}` });
    }

    const payload = JSON.parse(raw);
    const text = payload?.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("").trim();
    if (!text) return json(502, { error: "Gemini returned an empty analysis." });

    let result;
    try { result = JSON.parse(text); }
    catch (_) { return json(502, { error: "Gemini returned invalid JSON.", raw: text.slice(0, 2000) }); }

    return json(200, { ok: true, model: MODEL, fileName: fileName || "drawing", result });
  } catch (error) {
    return json(500, { error: error?.message || "Unexpected server error." });
  }
};
