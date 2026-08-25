/* MUSTER BAW — Reliable Drawing Scanner
   Upload/preview is always immediate. Heavy OCR/OpenCV is never required to open a Drawing.
   Vision AI is launched explicitly after the file is loaded. */
"use strict";
(() => {
  const $ = (s, p = document) => p.querySelector(s);
  let currentFile = null;
  let previewUrl = null;
  const toast = (m, t = "info") => window.Toast?.show ? window.Toast.show(m, t) : console.log(`[${t}] ${m}`);
  const esc = v => String(v ?? "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[c]));
  const bytes = n => n < 1024 ? `${n} B` : n < 1048576 ? `${(n/1024).toFixed(1)} KB` : `${(n/1048576).toFixed(1)} MB`;
  function setProgress(label, value) {
    $("#analyzerProgressLabel")?.replaceChildren(document.createTextNode(label));
    const bar = $("#analyzerProgressBar"); if (bar) bar.style.width = `${value}%`;
    const pct = $("#analyzerPercent"); if (pct) pct.textContent = `${Math.round(value)}%`;
  }
  function buildPage(page) {
    if (page.dataset.reliableScanner === "1") return;
    page.dataset.reliableScanner = "1";
    page.innerHTML = `<div class="page-header"><div><span class="page-label">ANALYSE</span><h2>Scanner le Drawing</h2><p>Importez un Drawing réel puis analysez-le avec MUSTER BAW Vision AI.</p></div></div><div class="analyzer-shell"><div class="dashboard-card"><div class="analyzer-dropzone" id="drawingDropzone"><div class="upload-zone-icon"><i class="fa-solid fa-cloud-arrow-up"></i></div><h3>Déposez votre Drawing ici</h3><p>PDF, PNG, JPG, WEBP, BMP ou TIFF — maximum 50 MB.</p><label class="btn btn-primary" for="drawingFile"><i class="fa-solid fa-file-import"></i> Choisir un fichier</label><input id="drawingFile" type="file" accept="application/pdf,image/png,image/jpeg,image/webp,image/bmp,image/tiff" hidden></div><div class="analyzer-progress" id="analyzerProgress"><strong id="analyzerProgressLabel">Prêt</strong><div class="analyzer-progress-bar"><span id="analyzerProgressBar"></span></div><span id="analyzerPercent">0%</span></div></div><div id="analysisResult" hidden></div></div>`;
    bind(page);
  }
  function bind(page) {
    const input = $("#drawingFile", page), drop = $("#drawingDropzone", page);
    if (!input || input.dataset.bound === "1") return;
    input.dataset.bound = "1";
    input.addEventListener("change", () => loadFile(input.files?.[0]));
    if (drop) {
      ["dragenter","dragover"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add("dragover"); }));
      ["dragleave","drop"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove("dragover"); }));
      drop.addEventListener("drop", e => { const file = e.dataTransfer?.files?.[0]; if (!file) return; try { const dt = new DataTransfer(); dt.items.add(file); input.files = dt.files; } catch (_) {} loadFile(file); });
    }
  }
  function valid(file) { return !!file && (file.type === "application/pdf" || /^(image\/(png|jpeg|webp|bmp|tiff))$/i.test(file.type) || /\.(pdf|png|jpe?g|webp|bmp|tiff)$/i.test(file.name)); }
  function loadFile(file) {
    if (!valid(file)) return toast("Format non supporté. Utilisez PDF, PNG, JPG, WEBP, BMP ou TIFF.", "warning");
    if (file.size > 50 * 1024 * 1024) return toast("Le fichier dépasse la limite de 50 MB.", "error");
    currentFile = file; window.MusterDrawingFile = file; localStorage.setItem("musterLastDrawingFile", file.name);
    setProgress("Drawing chargé — aperçu prêt", 100); renderPreview(file); ensureAiCard(); toast(`Drawing chargé : ${file.name}`, "success");
  }
  function renderPreview(file) {
    const root = $("#analysisResult"); if (!root) return; root.hidden = false;
    if (previewUrl) URL.revokeObjectURL(previewUrl); previewUrl = URL.createObjectURL(file);
    root.innerHTML = `<div class="dashboard-card stable-preview-card"><div class="card-header"><div><h3><i class="fa-solid fa-image"></i> Prévisualisation du Drawing</h3><p>${esc(file.name)} · ${bytes(file.size)}</p></div><span class="ai-status"><span></span> Fichier prêt</span></div><div class="stable-preview-frame" id="drawingPreviewFrame"></div></div>`;
    const frame = $("#drawingPreviewFrame");
    if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) { const iframe = document.createElement("iframe"); iframe.src = `${previewUrl}#toolbar=1&navpanes=0&view=FitH`; iframe.title = "Drawing PDF"; frame.appendChild(iframe); }
    else { const img = document.createElement("img"); img.src = previewUrl; img.alt = "Drawing chargé"; img.loading = "eager"; frame.appendChild(img); }
  }
  function ensureAiCard() {
    const page = $("#page-drawing-scanner"); if (!page || $("#musterVisionCard", page)) return;
    page.dataset.aiReady = "1";
    const card = document.createElement("div"); card.className = "dashboard-card ai-vision-card"; card.id = "musterVisionCard";
    card.innerHTML = `<div class="card-header"><div><h3><i class="fa-solid fa-brain"></i> MUSTER BAW Vision AI</h3><p>Analyse visuelle du Drawing : fils, couleurs, connecteurs, pins et relations.</p></div><button class="btn btn-small" id="aiKeyBtn"><i class="fa-solid fa-key"></i> Configurer IA</button></div><div class="ai-vision-actions"><button class="btn btn-primary" id="runAiDrawing"><i class="fa-solid fa-wand-magic-sparkles"></i> Analyser avec l'IA</button><span id="aiStatus">Drawing prêt.</span></div><div id="aiResults" class="ai-results"></div>`;
    page.querySelector(".analyzer-shell")?.appendChild(card);
    $("#runAiDrawing", card).addEventListener("click", runAi);
    $("#aiKeyBtn", card).addEventListener("click", () => window.MusterStableVision?.configureKey?.());
  }
  async function runAi() {
    const file = currentFile || window.MusterDrawingFile || $("#drawingFile")?.files?.[0]; if (!file) return toast("Choisissez d'abord un Drawing.", "warning");
    const status = $("#aiStatus"), out = $("#aiResults"), button = $("#runAiDrawing"); if (button) button.disabled = true; if (status) status.textContent = "Connexion à Vision AI…";
    try {
      if (window.MusterStableVision?.run) await window.MusterStableVision.run();
      else if (window.MusterVisionAI?.run) await window.MusterVisionAI.run();
      else { await new Promise(r => setTimeout(r, 700)); if (window.MusterStableVision?.run) await window.MusterStableVision.run(); else throw new Error("Le module Vision AI n'est pas encore chargé. Actualisez la page et réessayez."); }
    } catch (e) { console.error(e); if (out) out.innerHTML = `<div class="ai-error"><strong>Analyse non lancée</strong><p>${esc(e.message)}</p><button class="btn btn-small" id="retryVision"><i class="fa-solid fa-rotate-right"></i> Réessayer</button></div>`; toast("Impossible de lancer Vision AI.", "error"); $("#retryVision")?.addEventListener("click", runAi); }
    finally { if (button) button.disabled = false; }
  }
  function observe() { const page = $("#page-drawing-scanner"); if (!page || !page.classList.contains("active")) return; buildPage(page); }
  document.addEventListener("DOMContentLoaded", observe);
  new MutationObserver(observe).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
  window.MusterReliableScanner = { loadFile, runAi, getFile: () => currentFile };
})();