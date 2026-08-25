/* MUSTER BAW — Stable Gemini Vision client
   Uses the current Interactions API contract and never leaves the UI hanging.
*/
"use strict";
(() => {
  const KEY_STORE = "musterGeminiApiKey";
  const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions";
  const MODEL = "gemini-3.6-flash";
  const $ = (s, p = document) => p.querySelector(s);

  const schema = {
    type: "object",
    properties: {
      summary: { type: "string" },
      drawing_type: { type: "string" },
      connectors: { type: "array", items: { type: "object", properties: {
        reference: { type: "string" }, type: { type: "string" },
        pins: { type: "array", items: { type: "string" } },
        location: { type: "string" }, confidence: { type: "number" }
      }, required: ["reference","type","pins","location","confidence"] } },
      wires: { type: "array", items: { type: "object", properties: {
        reference: { type: "string" }, color: { type: "string" }, section: { type: "string" },
        from: { type: "string" }, to: { type: "string" }, pin_from: { type: "string" },
        pin_to: { type: "string" }, length: { type: "string" }, terminal: { type: "string" },
        contact: { type: "string" }, path: { type: "string" }, confidence: { type: "number" }
      }, required: ["reference","color","section","from","to","pin_from","pin_to","length","terminal","contact","path","confidence"] } },
      warnings: { type: "array", items: { type: "string" } },
      confidence: { type: "number" }
    },
    required: ["summary","drawing_type","connectors","wires","warnings","confidence"]
  };

  const prompt = `You are MUSTER BAW Engineering Vision AI for automotive wire-harness drawings.
Analyze the supplied drawing visually, not OCR-only. Identify visible connectors, wires, pins/cavities,
wire colors, labels, sections, terminals/contacts and electrical relationships that are actually supported
by the drawing. Trace colored wire paths where possible. Distinguish a junction from a crossing only when
visually justified. NEVER invent data. Use "unknown" when unreadable. Confidence is 0..1.
Return ONLY JSON matching the requested schema. Uncertain relationships MUST be listed in warnings for human validation.`;

  function key() { return localStorage.getItem(KEY_STORE) || ""; }
  function toast(m, t = "info") { if (window.Toast?.show) window.Toast.show(m, t); }
  function escapeHtml(v) { return String(v ?? "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[c])); }
  function b64(file) { return new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result).split(",")[1]); r.onerror = reject; r.readAsDataURL(file); }); }
  function withTimeout(promise, ms) { return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout: l'analyse IA a dépassé 90 secondes.")), ms))]); }

  function getText(response) {
    if (typeof response.output_text === "string" && response.output_text.trim()) return response.output_text;
    const steps = response.steps || [];
    for (let i = steps.length - 1; i >= 0; i--) {
      const content = steps[i]?.content || [];
      for (const block of content) if (block.type === "text" && block.text) return block.text;
    }
    throw new Error("Réponse Gemini reçue sans texte exploitable.");
  }

  function render(result, fileName) {
    const root = $("#aiResults"); if (!root) return;
    const connectors = result.connectors || [], wires = result.wires || [], warnings = result.warnings || [];
    const pct = v => `${Math.round((Number(v) || 0) * 100)}%`;
    root.innerHTML = `
      <div class="ai-summary">
        <div><strong>Type</strong><span>${escapeHtml(result.drawing_type)}</span></div>
        <div><strong>Confiance</strong><span>${pct(result.confidence)}</span></div>
        <div><strong>Connecteurs</strong><span>${connectors.length}</span></div>
        <div><strong>Fils</strong><span>${wires.length}</span></div>
      </div>
      <p class="ai-description">${escapeHtml(result.summary)}</p>
      <div class="ai-result-grid">
        <section><h4>Connecteurs détectés</h4><div class="table-container"><table class="data-table"><thead><tr><th>Référence</th><th>Type</th><th>Pins</th><th>Position</th><th>Conf.</th></tr></thead><tbody>
          ${connectors.map(x => `<tr><td>${escapeHtml(x.reference)}</td><td>${escapeHtml(x.type)}</td><td>${escapeHtml((x.pins || []).join(", "))}</td><td>${escapeHtml(x.location)}</td><td>${pct(x.confidence)}</td></tr>`).join("") || `<tr><td colspan="5">Aucun connecteur suffisamment lisible.</td></tr>`}
        </tbody></table></div></section>
        <section><h4>Wire List IA</h4><div class="table-container"><table class="data-table"><thead><tr><th>Wire</th><th>Couleur</th><th>Section</th><th>De → Vers</th><th>Pins</th><th>Terminal</th><th>Conf.</th></tr></thead><tbody>
          ${wires.map(x => `<tr><td>${escapeHtml(x.reference)}</td><td>${escapeHtml(x.color)}</td><td>${escapeHtml(x.section)}</td><td>${escapeHtml(x.from)} → ${escapeHtml(x.to)}</td><td>${escapeHtml(x.pin_from)} → ${escapeHtml(x.pin_to)}</td><td>${escapeHtml(x.terminal)} / ${escapeHtml(x.contact)}</td><td>${pct(x.confidence)}</td></tr>`).join("") || `<tr><td colspan="7">Aucun fil suffisamment lisible.</td></tr>`}
        </tbody></table></div></section>
      </div>
      <section class="ai-warnings"><h4><i class="fa-solid fa-triangle-exclamation"></i> À valider humainement</h4><ul>${warnings.map(w => `<li>${escapeHtml(w)}</li>`).join("") || "<li>Aucun avertissement.</li>"}</ul></section>`;
    localStorage.setItem("musterLastAiAnalysis", JSON.stringify({ file: fileName, at: new Date().toISOString(), result }));
  }

  async function configureKey() {
    const current = key();
    const value = window.prompt("Collez votre clé Gemini API. Elle reste dans ce navigateur pour cette version de démonstration.", current);
    if (value === null) return false;
    if (!value.trim()) { localStorage.removeItem(KEY_STORE); toast("Clé Gemini supprimée.", "warning"); return false; }
    localStorage.setItem(KEY_STORE, value.trim());
    toast("Clé Gemini enregistrée localement.", "success");
    return true;
  }

  async function run() {
    const input = $("#drawingFile"), file = input?.files?.[0];
    if (!file) { toast("Choisissez d'abord un Drawing.", "warning"); return; }
    let apiKey = key(); if (!apiKey) { if (!(await configureKey())) return; apiKey = key(); }
    const status = $("#aiStatus"), out = $("#aiResults"), button = $("#runAiDrawing");
    if (button) button.disabled = true;
    if (status) status.textContent = "Analyse IA en cours… 0–90 s";
    if (out) out.innerHTML = `<div class="ai-loading"><i class="fa-solid fa-spinner fa-spin"></i><span>Gemini Vision lit le Drawing et reconstruit les relations…</span></div>`;
    try {
      const data = await b64(file);
      const media = file.type === "application/pdf"
        ? { type: "document", data, mime_type: "application/pdf" }
        : { type: "image", data, mime_type: file.type || "image/jpeg", resolution: "high" };
      const body = {
        model: MODEL,
        input: [{ type: "text", text: prompt }, media],
        response_format: { type: "text", mime_type: "application/json", schema }
      };
      const response = await withTimeout(fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify(body)
      }).then(async r => { const text = await r.text(); let parsed; try { parsed = JSON.parse(text); } catch { parsed = null; } if (!r.ok) throw new Error(parsed?.error?.message || text || `HTTP ${r.status}`); return parsed; }), 90000);
      const text = getText(response);
      let result; try { result = JSON.parse(text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim()); } catch { throw new Error("Gemini a renvoyé un JSON invalide."); }
      render(result, file.name);
      if (status) status.textContent = `Analyse terminée : ${file.name}`;
      toast("Analyse IA terminée. Vérifiez les relations avant validation.", "success");
    } catch (e) {
      console.error(e);
      if (out) out.innerHTML = `<div class="ai-error"><strong>Analyse interrompue</strong><p>${escapeHtml(e.message)}</p><small>Le Drawing est chargé. Vous pouvez réessayer sans le réimporter.</small><br><button class="btn btn-small" id="aiRetryStable"><i class="fa-solid fa-rotate-right"></i> Réessayer</button></div>`;
      if (status) status.textContent = "Échec de l'analyse IA — prêt à réessayer.";
      $("#aiRetryStable")?.addEventListener("click", run);
      toast("L'analyse IA a échoué. Le fichier reste chargé.", "error");
    } finally { if (button) button.disabled = false; }
  }

  function bind() {
    const page = $("#page-drawing-scanner"); if (!page?.classList.contains("active")) return;
    const button = $("#runAiDrawing");
    if (button && !button.dataset.stableBound) {
      button.dataset.stableBound = "1";
      button.onclick = run;
    }
    const keyButton = $("#aiKeyBtn");
    if (keyButton && !keyButton.dataset.stableBound) {
      keyButton.dataset.stableBound = "1";
      keyButton.onclick = configureKey;
    }
  }
  document.addEventListener("DOMContentLoaded", bind);
  new MutationObserver(bind).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
  window.MusterStableVision = { run, configureKey };
})();