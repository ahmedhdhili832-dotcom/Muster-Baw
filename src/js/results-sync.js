/* MUSTER BAW — Results synchronization layer
   Reads the same canonical Vision AI result used by the dashboard. */
"use strict";
(() => {
  const $ = (s, p = document) => p.querySelector(s);
  const esc = v => String(v ?? "").replace(/[&<>\"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));
  const read = () => {
    try {
      const raw = JSON.parse(localStorage.getItem("musterLastAiAnalysis") || "null");
      if (raw?.result) return { ...raw.result, file: raw.file, createdAt: raw.createdAt };
      return JSON.parse(localStorage.getItem("muster_baw_analysis_v2") || "null");
    } catch { return null; }
  };
  const pct = v => `${Math.round((Number(v) || 0) * 100)}%`;

  function render(page) {
    const data = read(); if (!data) return;
    const connectors = data.connectors || [], wires = data.wires || [], warnings = data.warnings || [];
    if (page === "ai-analyzer") {
      const el = $("#page-ai-analyzer"); if (!el) return;
      el.innerHTML = `<div class="page-header"><div><span class="page-label">COMPUTER VISION</span><h2>Analyseur IA</h2><p>Résultats de la dernière analyse Vision AI.</p></div><span class="ai-status"><span></span> Analyse disponible</span></div><div class="analysis-summary"><div class="analysis-kpi"><small>Connecteurs</small><strong>${connectors.length}</strong></div><div class="analysis-kpi"><small>Fils</small><strong>${wires.length}</strong></div><div class="analysis-kpi"><small>Avertissements</small><strong>${warnings.length}</strong></div><div class="analysis-kpi"><small>Confiance</small><strong>${pct(data.confidence)}</strong></div></div><div class="dashboard-grid" style="margin-top:18px"><article class="dashboard-card"><div class="ai-card-content"><div class="ai-icon"><i class="fa-solid fa-brain"></i></div><h4>Source</h4><p><strong>${esc(data.file || "Drawing")}</strong></p><p>${esc(data.summary || "Analyse disponible.")}</p></div></article><article class="dashboard-card"><div class="ai-card-content"><div class="ai-icon"><i class="fa-solid fa-shield-halved"></i></div><h4>Validation humaine</h4><p>Les relations incertaines restent à confirmer avant utilisation industrielle.</p><button class="btn btn-primary" data-page-link="validation">Ouvrir la validation</button></div></article></div>`;
    }
    if (page === "connectors") {
      const el = $("#page-connectors"); if (!el) return;
      el.innerHTML = `<div class="page-header"><div><span class="page-label">CONNECTEURS</span><h2>Connecteurs détectés</h2><p>${connectors.length} connecteur(s) retourné(s) par Vision AI.</p></div></div><div class="dashboard-card"><div class="table-container"><table class="data-table"><thead><tr><th>Référence</th><th>Type</th><th>Pins / cavités</th><th>Position</th><th>Confiance</th></tr></thead><tbody>${connectors.map(x => `<tr><td><strong>${esc(x.reference)}</strong></td><td>${esc(x.type)}</td><td>${esc((x.pins || []).join(", "))}</td><td>${esc(x.location)}</td><td>${pct(x.confidence)}</td></tr>`).join("") || `<tr><td colspan="5">Aucun connecteur suffisamment lisible.</td></tr>`}</tbody></table></div></div>`;
    }
    if (page === "pinout") {
      const el = $("#page-pinout"); if (!el) return;
      const rows = connectors.flatMap(c => (c.pins || []).map(pin => ({ reference: c.reference, pin })));
      el.innerHTML = `<div class="page-header"><div><span class="page-label">CONNECTEURS</span><h2>Pinout & Cavités</h2><p>Correspondances extraites des connecteurs détectés.</p></div></div><div class="dashboard-card"><div class="table-container"><table class="data-table"><thead><tr><th>Connecteur</th><th>Pin / Cavité</th></tr></thead><tbody>${rows.map(x => `<tr><td>${esc(x.reference)}</td><td><strong>${esc(x.pin)}</strong></td></tr>`).join("") || `<tr><td colspan="2">Aucun pin lisible.</td></tr>`}</tbody></table></div></div>`;
    }
    if (page === "wire-list" || page === "wire-details") {
      const el = $(`#page-${page}`); if (!el) return;
      const title = page === "wire-list" ? "Wire List" : "Détails des fils";
      el.innerHTML = `<div class="page-header"><div><span class="page-label">CÂBLAGE</span><h2>${title}</h2><p>${wires.length} fil(s) détecté(s). Les champs "unknown" doivent être vérifiés.</p></div><button class="btn btn-primary" id="syncExportJson"><i class="fa-solid fa-download"></i>Exporter JSON</button></div><div class="dashboard-card"><div class="table-container"><table class="data-table"><thead><tr><th>Wire</th><th>Couleur</th><th>Section</th><th>De</th><th>Vers</th><th>Pin de</th><th>Pin vers</th><th>Longueur</th><th>Terminal</th><th>Contact</th><th>Conf.</th></tr></thead><tbody>${wires.map(w => `<tr><td><strong>${esc(w.reference)}</strong></td><td>${esc(w.color)}</td><td>${esc(w.section)}</td><td>${esc(w.from)}</td><td>${esc(w.to)}</td><td>${esc(w.pin_from)}</td><td>${esc(w.pin_to)}</td><td>${esc(w.length)}</td><td>${esc(w.terminal)}</td><td>${esc(w.contact)}</td><td>${pct(w.confidence)}</td></tr>`).join("") || `<tr><td colspan="11" style="text-align:center;padding:28px">Aucun fil suffisamment lisible.</td></tr>`}</tbody></table></div></div>`;
      $("#syncExportJson")?.addEventListener("click", () => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify({ file: data.file, connectors, wires, warnings }, null, 2)], { type: "application/json" })); a.download = "muster-baw-analysis.json"; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 500); });
    }
    if (page === "reports") {
      const el = $("#page-reports"); if (!el) return;
      const saved = data.createdAt ? new Date(data.createdAt).toLocaleString("fr-FR") : "—";
      el.innerHTML = `<div class="page-header"><div><span class="page-label">RÉSULTATS</span><h2>Rapports & Historique</h2><p>Dernière analyse locale disponible.</p></div></div><div class="dashboard-card"><div class="table-container"><table class="data-table"><thead><tr><th>Drawing</th><th>Date</th><th>Connecteurs</th><th>Fils</th><th>Confiance</th><th>Avertissements</th></tr></thead><tbody><tr><td><strong>${esc(data.file || "Drawing")}</strong></td><td>${esc(saved)}</td><td>${connectors.length}</td><td>${wires.length}</td><td>${pct(data.confidence)}</td><td>${warnings.length}</td></tr></tbody></table></div></div>`;
    }
    if (page === "validation") {
      const el = $("#page-validation"); if (!el) return;
      const low = [...connectors.map(x => ({ type: "Connecteur", ref: x.reference, confidence: x.confidence })), ...wires.map(x => ({ type: "Wire", ref: x.reference, confidence: x.confidence }))].filter(x => Number(x.confidence) < 0.85);
      el.innerHTML = `<div class="page-header"><div><span class="page-label">VALIDATION</span><h2>Validation humaine</h2><p>Contrôlez les éléments à faible confiance avant utilisation.</p></div></div><div class="dashboard-card"><div class="table-container"><table class="data-table"><thead><tr><th>Type</th><th>Référence</th><th>Confiance</th><th>État</th></tr></thead><tbody>${low.map(x => `<tr><td>${esc(x.type)}</td><td>${esc(x.ref)}</td><td>${pct(x.confidence)}</td><td><span class="status-badge warning">À vérifier</span></td></tr>`).join("") || `<tr><td colspan="4">Aucun élément sous 85% de confiance.</td></tr>`}</tbody></table></div></div>`;
    }
  }

  let last = "";
  const refresh = () => {
    const active = document.querySelector(".page.active"); if (!active) return;
    const page = active.id.replace("page-", "");
    if (page !== last) { last = page; render(page); }
  };
  const observer = new MutationObserver(refresh);
  observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["class"] });
  window.addEventListener("muster:analysis-ready", () => { last = ""; refresh(); window.MusterApp?.refreshDashboard?.(); });
  window.addEventListener("storage", () => { last = ""; refresh(); window.MusterApp?.refreshDashboard?.(); });
  window.MusterResultsSync = { render, refresh };
})();
