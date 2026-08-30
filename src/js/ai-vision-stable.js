/* MUSTER BAW — Secure Vision AI client
   Secure server-side analysis + PDF/image preparation + canonical result storage. */
"use strict";
(() => {
  const $ = (s, p = document) => p.querySelector(s);
  const MAX_INLINE_BYTES = 4.4 * 1024 * 1024;
  const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
  const endpoint = () => window.MUSTER_AI_ENDPOINT || "/.netlify/functions/analyze-drawing";
  const toast = (m, t = "info") => window.Toast?.show ? window.Toast.show(m, t) : console.log(`[${t}] ${m}`);
  const esc = v => String(v ?? "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[c]));
  const pct = v => `${Math.round((Number(v) || 0) * 100)}%`;

  function configureKey() {
    toast("Vision AI est sécurisé côté serveur. La clé API n'est jamais stockée dans le navigateur.", "info");
  }

  function getFile() { return window.MusterDrawingFile || $("#drawingFile")?.files?.[0] || null; }

  function base64(blob) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result).split(",")[1] || "");
      r.onerror = () => reject(new Error("Lecture du Drawing impossible."));
      r.readAsDataURL(blob);
    });
  }

  async function loadPdfJs() {
    if (window.pdfjsLib) return window.pdfjsLib;
    await new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-muster-pdfjs]');
      if (existing) { existing.addEventListener("load", resolve, { once: true }); existing.addEventListener("error", reject, { once: true }); return; }
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      s.async = true; s.dataset.musterPdfjs = "1";
      s.onload = resolve; s.onerror = () => reject(new Error("Le moteur PDF n'a pas pu être chargé."));
      document.head.appendChild(s);
    });
    if (!window.pdfjsLib) throw new Error("PDF.js indisponible.");
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    return window.pdfjsLib;
  }

  async function pdfToImage(file) {
    const pdfjs = await loadPdfJs();
    const buffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: buffer }).promise;
    const page = await pdf.getPage(1);
    const baseViewport = page.getViewport({ scale: 1 });
    const maxWidth = 2400;
    const scale = Math.min(2.2, Math.max(1, maxWidth / baseViewport.width));
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext("2d", { alpha: false });
    await page.render({ canvasContext: ctx, viewport }).promise;
    let quality = 0.88;
    let blob = await new Promise(r => canvas.toBlob(r, "image/jpeg", quality));
    while (blob && blob.size > MAX_INLINE_BYTES && quality > 0.45) {
      quality -= 0.08;
      blob = await new Promise(r => canvas.toBlob(r, "image/jpeg", quality));
    }
    if (!blob || blob.size > MAX_INLINE_BYTES) throw new Error("Le PDF est trop complexe pour être converti en image d'analyse.");
    return { data: await base64(blob), mimeType: "image/jpeg", pages: pdf.numPages };
  }

  async function prepare(file) {
    if (file.size > MAX_UPLOAD_BYTES) throw new Error("Le Drawing dépasse la limite de 50 MB.");
    if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) return pdfToImage(file);
    if (!file.type.startsWith("image/")) throw new Error("Format non supporté. Utilisez PDF, PNG, JPG, WEBP, BMP ou TIFF.");
    if (file.size <= MAX_INLINE_BYTES && /^(image\/(png|jpeg|webp|gif))$/i.test(file.type)) {
      return { data: await base64(file), mimeType: file.type, pages: 1 };
    }
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, Math.sqrt(MAX_INLINE_BYTES / file.size));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext("2d", { alpha: false }).drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    let quality = 0.86;
    let blob = await new Promise(r => canvas.toBlob(r, "image/jpeg", quality));
    while (blob && blob.size > MAX_INLINE_BYTES && quality > 0.45) {
      quality -= 0.08;
      blob = await new Promise(r => canvas.toBlob(r, "image/jpeg", quality));
    }
    if (!blob || blob.size > MAX_INLINE_BYTES) throw new Error("Impossible de compresser ce Drawing assez pour l'analyse IA.");
    return { data: await base64(blob), mimeType: "image/jpeg", pages: 1 };
  }

  function storeResult(result, fileName) {
    const record = { file: fileName, createdAt: new Date().toISOString(), result };
    localStorage.setItem("musterLastAiAnalysis", JSON.stringify(record));
    localStorage.setItem("muster_baw_analysis_v1", JSON.stringify({
      file: fileName, createdAt: record.createdAt, ...result,
      confidence: Math.round((Number(result.confidence) || 0) * 100)
    }));
    localStorage.setItem("muster_baw_analysis_v2", JSON.stringify({
      file: fileName, createdAt: record.createdAt, ...result,
      confidence: Math.round((Number(result.confidence) || 0) * 100)
    }));
  }

  function render(result, fileName) {
    const out = $("#aiResults"); if (!out) return;
    const connectors = result.connectors || [], wires = result.wires || [], warnings = result.warnings || [];
    out.innerHTML = `<div class="ai-summary"><div><strong>Type</strong><span>${esc(result.drawing_type || "unknown")}</span></div><div><strong>Confiance</strong><span>${pct(result.confidence)}</span></div><div><strong>Connecteurs</strong><span>${connectors.length}</span></div><div><strong>Fils</strong><span>${wires.length}</span></div></div><p class="ai-description">${esc(result.summary || "")}</p><div class="ai-result-grid"><section><h4>Connecteurs détectés</h4><div class="table-container"><table class="data-table"><thead><tr><th>Réf.</th><th>Type</th><th>Pins</th><th>Position</th><th>Conf.</th></tr></thead><tbody>${connectors.map(x => `<tr><td>${esc(x.reference)}</td><td>${esc(x.type)}</td><td>${esc((x.pins || []).join(", "))}</td><td>${esc(x.location)}</td><td>${pct(x.confidence)}</td></tr>`).join("") || `<tr><td colspan="5">Aucun connecteur suffisamment lisible.</td></tr>`}</tbody></table></div></section><section><h4>Wire List IA</h4><div class="table-container"><table class="data-table"><thead><tr><th>Wire</th><th>Couleur</th><th>Section</th><th>De → Vers</th><th>Pins</th><th>Terminal</th><th>Contact</th><th>Conf.</th></tr></thead><tbody>${wires.map(x => `<tr><td>${esc(x.reference)}</td><td>${esc(x.color)}</td><td>${esc(x.section)}</td><td>${esc(x.from)} → ${esc(x.to)}</td><td>${esc(x.pin_from)} → ${esc(x.pin_to)}</td><td>${esc(x.terminal)}</td><td>${esc(x.contact)}</td><td>${pct(x.confidence)}</td></tr>`).join("") || `<tr><td colspan="8">Aucun fil suffisamment lisible.</td></tr>`}</tbody></table></div></section></div><section class="ai-warnings"><h4><i class="fa-solid fa-triangle-exclamation"></i> À valider humainement</h4><ul>${warnings.map(w => `<li>${esc(w)}</li>`).join("") || "<li>Aucun avertissement.</li>"}</ul></section>`;
    storeResult(result, fileName);
    window.dispatchEvent(new CustomEvent("muster:analysis-ready", { detail: { result, fileName } }));
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
      if (status) status.textContent = media.pages > 1 ? `PDF chargé (${media.pages} pages) — analyse de la première page…` : "Vision AI analyse le câblage…";
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 90000);
      let response;
      try {
        response = await fetch(endpoint(), {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileName: file.name, mimeType: media.mimeType, data: media.data, pages: media.pages }),
          signal: controller.signal
        });
      } finally { clearTimeout(timer); }
      const raw = await response.text();
      let payload = {}; try { payload = JSON.parse(raw); } catch (_) { payload = { error: raw }; }
      if (!response.ok) throw new Error(payload.error || `Erreur serveur HTTP ${response.status}`);
      if (!payload.result) throw new Error("Le serveur n'a pas retourné de résultat IA.");
      render(payload.result, file.name);
      if (status) status.textContent = `Analyse terminée : ${file.name}`;
      toast("Analyse Vision AI terminée. Vérifiez les résultats avant validation.", "success");
      return payload.result;
    } catch (error) {
      const message = error?.name === "AbortError" ? "Le délai d'analyse a expiré (90 s). Réessayez avec une image plus légère." : (error?.message || "Erreur inconnue");
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
