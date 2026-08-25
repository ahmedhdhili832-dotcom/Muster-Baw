/* MUSTER BAW — Secure Vision AI client
   Calls Netlify instead of exposing the Gemini key in the browser. */
"use strict";
(() => {
  const $ = (s, p = document) => p.querySelector(s);
  const MAX_INLINE_BYTES = 4.4 * 1024 * 1024;
  const toast = (m, t = "info") => window.Toast?.show ? window.Toast.show(m, t) : console.log(`[${t}] ${m}`);
  const esc = v => String(v ?? "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[c]));
  const pct = v => `${Math.round((Number(v) || 0) * 100)}%`;
  const endpoint = () => window.MUSTER_AI_ENDPOINT || "/.netlify/functions/analyze-drawing";

  function configureKey() {
    toast("Vision AI est sécurisé côté serveur. Aucune clé Gemini n'est demandée dans le navigateur.", "info");
  }
  function getFile() { return window.MusterDrawingFile || $("#drawingFile")?.files?.[0] || null; }
  function base64(file) { return new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result).split(",")[1] || ""); r.onerror = () => reject(new Error("Lecture du Drawing impossible.")); r.readAsDataURL(file); }); }

  async function prepare(file) {
    if (file.size <= MAX_INLINE_BYTES) return { data: await base64(file), mimeType: file.type || "image/jpeg" };
    if (!file.type.startsWith("image/")) throw new Error("Ce fichier est trop volumineux pour le serveur. Exportez le Drawing en JPG/PNG compressé (moins de 4,4 MB) pour l'analyse IA.");
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, Math.sqrt(MAX_INLINE_BYTES / file.size));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext("2d", { alpha: false }).drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close?.();
    let quality = 0.86, blob = await new Promise(r => canvas.toBlob(r, "image/jpeg", quality));
    while (blob && blob.size > MAX_INLINE_BYTES && quality > 0.45) { quality -= 0.08; blob = await new Promise(r => canvas.toBlob(r, "image/jpeg", quality)); }
    if (!blob || blob.size > MAX_INLINE_BYTES) throw new Error("Impossible de compresser ce Drawing assez pour l'analyse IA.");
    return { data: await base64(blob), mimeType: "image/jpeg" };
  }

  function render(result, fileName) {
    const out = $("#aiResults"); if (!out) return;
    const connectors = result.connectors || [], wires = result.wires || [], warnings = result.warnings || [];
    out.innerHTML = `<div class="ai-summary"><div><strong>Type</strong><span>${esc(result.drawing_type)}</span></div><div><strong>Confiance</strong><span>${pct(result.confidence)}</span></div><div><strong>Connecteurs</strong><span>${connectors.length}</span></div><div><strong>Fils</strong><span>${wires.length}</span></div></div><p class="ai-description">${esc(result.summary)}</p><div class="ai-result-grid"><section><h4>Connecteurs détectés</h4><div class="table-container"><table class="data-table"><thead><tr><th>Réf.</th><th>Type</th><th>Pins</th><th>Position</th><th>Conf.</th></tr></thead><tbody>${connectors.map(x => `<tr><td>${esc(x.reference)}</td><td>${esc(x.type)}</td><td>${esc((x.pins || []).join(", "))}</td><td>${esc(x.location)}</td><td>${pct(x.confidence)}</td></tr>`).join("") || `<tr><td colspan="5">Aucun connecteur suffisamment lisible.</td></tr>`}</tbody></table></div></section><section><h4>Wire List IA</h4><div class="table-container"><table class="data-table"><thead><tr><th>Wire</th><th>Couleur</th><th>Section</th><th>De → Vers</th><th>Pins</th><th>Terminal</th><th>Conf.</th></tr></thead><tbody>${wires.map(x => `<tr><td>${esc(x.reference)}</td><td>${esc(x.color)}</td><td>${esc(x.section)}</td><td>${esc(x.from)} → ${esc(x.to)}</td><td>${esc(x.pin_from)} → ${esc(x.pin_to)}</td><td>${esc(x.terminal)} / ${esc(x.contact)}</td><td>${pct(x.confidence)}</td></tr>`).join("") || `<tr><td colspan="7">Aucun fil suffisamment lisible.</td></tr>`}</tbody></table></div></section></div><section class="ai-warnings"><h4><i class="fa-solid fa-triangle-exclamation"></i> À valider humainement</h4><ul>${warnings.map(w => `<li>${esc(w)}</li>`).join("") || "<li>Aucun avertissement.</li>"}</ul></section>`;
    localStorage.setItem("musterLastAiAnalysis", JSON.stringify({ file: fileName, at: new Date().toISOString(), result }));
  }

  async function run() {
    const file = getFile();
    if (!file) { toast("Choisissez d'abord un Drawing.", "warning"); return; }
    const status = $("#aiStatus"), out = $("#aiResults"), button = $("#runAiDrawing");
    if (button) button.disabled = true;
    if (status) status.textContent = "Préparation sécurisée du Drawing…";
    if (out) out.innerHTML = `<div class="ai-loading"><i class="fa-solid fa-spinner fa-spin"></i><span>Préparation du Drawing pour Vision AI…</span></div>`;
    try {
      const media = await prepare(file);
      if (status) status.textContent = "Vision AI analyse le câblage…";
      const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 90000);
      let response;
      try { response = await fetch(endpoint(), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fileName: file.name, mimeType: media.mimeType, data: media.data }), signal: controller.signal }); }
      finally { clearTimeout(timer); }
      const raw = await response.text(); let payload = {}; try { payload = JSON.parse(raw); } catch (_) { payload = { error: raw }; }
      if (!response.ok) throw new Error(payload.error || `Erreur serveur HTTP ${response.status}`);
      if (!payload.result) throw new Error("Le serveur n'a pas retourné de résultat IA.");
      render(payload.result, file.name);
      if (status) status.textContent = `Analyse terminée : ${file.name}`;
      toast("Analyse Vision AI terminée. Vérifiez les résultats avant validation.", "success");
      window.dispatchEvent(new CustomEvent("muster:analysis-ready", { detail: payload.result }));
      return payload.result;
    } catch (error) {
      const message = error?.name === "AbortError" ? "Le délai d'analyse a expiré (90 s). Réessayez avec une image plus légère." : error.message;
      if (status) status.textContent = "Échec de l'analyse — prêt à réessayer.";
      if (out) out.innerHTML = `<div class="ai-error"><strong>Analyse impossible</strong><p>${esc(message)}</p><small>Le Drawing reste chargé. Vous pouvez réessayer sans le recharger.</small><br><button class="btn btn-small" id="aiRetryStable"><i class="fa-solid fa-rotate-right"></i> Réessayer</button></div>`;
      $("#aiRetryStable")?.addEventListener("click", run);
      toast(message, "error");
    } finally { if (button) button.disabled = false; }
  }

  function bind() {
    const page = $("#page-drawing-scanner"); if (!page?.classList.contains("active")) return;
    const button = $("#runAiDrawing"); if (button && !button.dataset.stableBound) { button.dataset.stableBound = "1"; button.onclick = run; }
    const keyButton = $("#aiKeyBtn"); if (keyButton && !keyButton.dataset.stableBound) { keyButton.dataset.stableBound = "1"; keyButton.onclick = configureKey; keyButton.innerHTML = '<i class="fa-solid fa-shield-halved"></i> IA sécurisée'; }
  }
  document.addEventListener("DOMContentLoaded", bind);
  new MutationObserver(bind).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
  window.MusterStableVision = { run, configureKey, getFile };
})();
