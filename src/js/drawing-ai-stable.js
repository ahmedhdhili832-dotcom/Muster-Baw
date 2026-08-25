/* MUSTER BAW — Stable Drawing upload bridge
   Keeps preview immediate and delegates analysis to Vision AI.
*/
"use strict";
(() => {
  const $ = (s, p = document) => p.querySelector(s);
  let mounted = false;

  function toast(message, type = "info") {
    if (window.Toast?.show) window.Toast.show(message, type);
  }

  function mount() {
    const page = $("#page-drawing-scanner");
    const input = $("#drawingFile", page || document);
    if (!page || !input || mounted) return;
    mounted = true;

    // The legacy OCR/CV analyzer attaches onchange directly. Clone the input
    // so the stable flow owns the file event and never blocks at OCR/CV stage.
    const fresh = input.cloneNode(true);
    fresh.value = "";
    input.replaceWith(fresh);

    const drop = $("#drawingDropzone", page);
    const progressLabel = $("#analyzerProgressLabel");
    const progressBar = $("#analyzerProgressBar");
    const percent = $("#analyzerPercent");
    const result = $("#analysisResult");

    const setProgress = (label, value) => {
      if (progressLabel) progressLabel.textContent = label;
      if (progressBar) progressBar.style.width = `${value}%`;
      if (percent) percent.textContent = `${Math.round(value)}%`;
    };

    const preview = file => {
      if (!result) return;
      result.hidden = false;
      result.innerHTML = `
        <div class="dashboard-card stable-preview-card">
          <div class="card-header">
            <div><h3><i class="fa-solid fa-image"></i> Drawing chargé</h3>
            <p>${escapeHtml(file.name)} · ${formatBytes(file.size)}</p></div>
            <span class="ai-status"><span></span> Prêt pour Vision AI</span>
          </div>
          <div class="stable-preview-frame" id="stableDrawingPreview"></div>
        </div>`;
      const frame = $("#stableDrawingPreview");
      const url = URL.createObjectURL(file);
      if (file.type === "application/pdf") {
        frame.innerHTML = `<iframe src="${url}#toolbar=0&navpanes=0" title="Drawing PDF"></iframe>`;
      } else {
        const img = document.createElement("img");
        img.src = url; img.alt = "Drawing preview";
        frame.appendChild(img);
      }
    };

    const onFile = file => {
      if (!file) return;
      const ok = file.type === "application/pdf" || /^image\/(png|jpeg|jpg|webp|bmp|tiff)$/i.test(file.type);
      if (!ok) { toast("Format non supporté. Utilisez PDF, PNG, JPG, WEBP, BMP ou TIFF.", "warning"); return; }
      if (file.size > 50 * 1024 * 1024) { toast("Le fichier dépasse 50 MB.", "error"); return; }
      setProgress("Drawing chargé — prêt pour l'analyse IA", 8);
      preview(file);
      fresh.dataset.selected = "1";
      fresh.dispatchEvent(new Event("muster:drawing-ready", { bubbles: true }));
      toast("Drawing chargé. Lancez l'analyse avec Vision AI.", "success");
    };

    fresh.addEventListener("change", () => onFile(fresh.files?.[0]));
    if (drop) {
      drop.addEventListener("dragover", e => { e.preventDefault(); drop.classList.add("dragover"); });
      drop.addEventListener("dragleave", () => drop.classList.remove("dragover"));
      drop.addEventListener("drop", e => {
        e.preventDefault(); drop.classList.remove("dragover");
        const file = e.dataTransfer?.files?.[0];
        if (!file) return;
        const dt = new DataTransfer(); dt.items.add(file); fresh.files = dt.files;
        onFile(file);
      });
    }
  }

  function escapeHtml(v) { return String(v ?? "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[c])); }
  function formatBytes(n) { if (n < 1024) return `${n} B`; if (n < 1048576) return `${(n/1024).toFixed(1)} KB`; return `${(n/1048576).toFixed(1)} MB`; }

  const observer = new MutationObserver(() => {
    const page = $("#page-drawing-scanner");
    if (page?.classList.contains("active")) mount();
  });
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
  document.addEventListener("DOMContentLoaded", mount);
  window.MusterStableDrawing = { mount };
})();