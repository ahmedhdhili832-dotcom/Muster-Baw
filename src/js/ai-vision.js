/* MUSTER BAW — Vision AI compatibility bridge
   The real analysis is handled by ai-vision-stable.js through the serverless backend.
   This file intentionally contains no API key and no direct provider call. */
"use strict";
(() => {
  const $ = (s, p = document) => p.querySelector(s);
  function configureKey() { window.MusterStableVision?.configureKey?.(); }
  function run() { return window.MusterStableVision?.run?.(); }
  function ensureUI() {
    const page = $("#page-drawing-scanner");
    if (!page || page.dataset.aiReady === "1" || $("#musterVisionCard", page)) return;
    const card = document.createElement("div");
    card.className = "dashboard-card ai-vision-card";
    card.id = "musterVisionCard";
    card.innerHTML = `<div class="card-header"><div><h3><i class="fa-solid fa-brain"></i> MUSTER BAW Vision AI</h3><p>Analyse sécurisée du Drawing : fils, connecteurs, pins et relations.</p></div><button class="btn btn-small" id="aiKeyBtn"><i class="fa-solid fa-shield-halved"></i> IA sécurisée</button></div><div class="ai-vision-actions"><button class="btn btn-primary" id="runAiDrawing"><i class="fa-solid fa-wand-magic-sparkles"></i> Analyser avec l'IA</button><span id="aiStatus">Drawing prêt.</span></div><div id="aiResults" class="ai-results"></div>`;
    page.querySelector(".analyzer-shell")?.appendChild(card);
    $("#runAiDrawing", card).onclick = run;
    $("#aiKeyBtn", card).onclick = configureKey;
  }
  window.MusterVisionAI = { ensureUI, run, configureKey };
  document.addEventListener("DOMContentLoaded", ensureUI);
  new MutationObserver(ensureUI).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
})();
