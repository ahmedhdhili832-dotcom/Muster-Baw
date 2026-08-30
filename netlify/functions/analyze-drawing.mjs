const MODEL = "gpt-5.6-luna";
const OPENAI_URL = "https://api.openai.com/v1/responses";

const schema = {
  type: "object",
  properties: {
    summary: { type: "string" },
    drawing_type: { type: "string" },
    connectors: {
      type: "array", items: { type: "object", properties: {
        reference: { type: "string" }, type: { type: "string" }, pins: { type: "array", items: { type: "string" } },
        location: { type: "string" }, confidence: { type: "number" }
      }, required: ["reference", "type", "pins", "location", "confidence"], additionalProperties: false }
    },
    wires: {
      type: "array", items: { type: "object", properties: {
        reference: { type: "string" }, color: { type: "string" }, section: { type: "string" },
        from: { type: "string" }, to: { type: "string" }, pin_from: { type: "string" }, pin_to: { type: "string" },
        length: { type: "string" }, terminal: { type: "string" }, contact: { type: "string" }, path: { type: "string" }, confidence: { type: "number" }
      }, required: ["reference", "color", "section", "from", "to", "pin_from", "pin_to", "length", "terminal", "contact", "path", "confidence"], additionalProperties: false }
    },
    warnings: { type: "array", items: { type: "string" } },
    confidence: { type: "number" }
  },
  required: ["summary", "drawing_type", "connectors", "wires", "warnings", "confidence"],
  additionalProperties: false
};

const instruction = `You are MUSTER BAW Engineering Vision AI for automotive wire-harness drawings.
Analyze the supplied engineering drawing visually and spatially. OCR alone is not sufficient.
Identify only elements that are actually visible or strongly supported by the drawing.
Trace wire paths where possible; identify connector references, cavity/pin labels, wire colors, cross-sections, terminal/contact references, branches, junctions and approximate lengths when visible.
A line crossing is NOT a junction unless the drawing visually supports a junction.
For every wire, populate reference, color, section, from, to, pin_from, pin_to, length, terminal, contact and path when readable.
Use the exact visible text where possible. NEVER invent a reference, pin, terminal, color, section, length or relationship.
If a value cannot be read safely, return "unknown". If a complete wire relationship cannot be justified, do not fabricate it; add a warning instead.
Confidence values are 0..1 and must reflect visual certainty, not guesswork.
This is an engineering-assistance tool. All uncertain results must be flagged for human validation.`;

function json(statusCode, data) {
  return new Response(JSON.stringify(data), {
    status: statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "POST, OPTIONS"
    }
  });
}

export default async (request) => {
  if (request.method === "OPTIONS") return json(204, {});
  if (request.method !== "POST") return json(405, { error: "Method not allowed" });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return json(500, { error: "OPENAI_API_KEY is not configured on Netlify." });

  try {
    const body = await request.json();
    const { data, mimeType, fileName, pages } = body || {};
    if (!data || !mimeType) return json(400, { error: "Missing drawing data or MIME type." });
    if (!/^image\/(png|jpeg|webp|gif)$/i.test(mimeType)) return json(400, { error: "Unsupported analysis image format." });
    if (typeof data !== "string" || data.length > 6000000) return json(413, { error: "Drawing is too large. Use a compressed image below 4.5 MB." });

    const response = await fetch(OPENAI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL,
        input: [{ role: "user", content: [
          { type: "input_text", text: `${instruction}\nFile: ${fileName || "drawing"}${pages ? `\nSource pages: ${pages}. The supplied visual is the first rendered page.` : ""}` },
          { type: "input_image", image_url: `data:${mimeType};base64,${data}`, detail: "high" }
        ] }],
        text: { format: { type: "json_schema", name: "muster_baw_analysis", strict: true, schema } }
      })
    });

    const raw = await response.text();
    if (!response.ok) {
      let detail = raw;
      try { detail = JSON.parse(raw)?.error?.message || raw; } catch (_) {}
      return json(response.status, { error: `OpenAI: ${detail}` });
    }

    const payload = JSON.parse(raw);
    const text = payload?.output_text?.trim();
    if (!text) return json(502, { error: "OpenAI returned an empty analysis." });

    let result;
    try { result = JSON.parse(text); }
    catch (_) { return json(502, { error: "OpenAI returned invalid JSON.", raw: text.slice(0, 2000) }); }

    return json(200, { ok: true, provider: "OpenAI", model: MODEL, fileName: fileName || "drawing", pages: pages || 1, result });
  } catch (error) {
    return json(500, { error: error?.message || "Unexpected server error." });
  }
};
