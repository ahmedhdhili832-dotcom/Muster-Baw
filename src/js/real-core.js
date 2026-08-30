/* MUSTER BAW — Real client-side application state */
"use strict";
(() => {
  const STORE = "muster_baw_app_v1", ANALYSIS = "muster_baw_analysis_v2";
  const $ = (s, p = document) => p.querySelector(s), $$ = (s, p = document) => [...p.querySelectorAll(s)];
  const read = (k, f) => { try { return JSON.parse(localStorage.getItem(k) || "null") ?? f; } catch { return f; } };
  const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  const state = read(STORE, { projects: [], analyses: [], settings: { company: "SEBN", environment: "PPE" } });
  const persist = () => write(STORE, state);

  function analysisData() {
    const v2 = read(ANALYSIS, null);
    if (v2?.connectors || v2?.wires) return v2;
    const last = read("musterLastAiAnalysis", null);
    return last?.result ? { ...last.result, file: last.file, createdAt: last.createdAt, confidence: Math.round((Number(last.result.confidence) || 0) * 100) } : null;
  }

  function analysisSnapshot() {
    const a = analysisData(); if (!a) return null;
    const confidence = Number(a.confidence);
    return {
      id: `ANA-${String(Date.now()).slice(-8)}`,
      file: a.file || "Drawing",
      createdAt: a.createdAt || new Date().toISOString(),
      connectors: Array.isArray(a.connectors) ? a.connectors.length : 0,
      wires: Array.isArray(a.wires) ? a.wires.length : 0,
      pins: Array.isArray(a.connectors) ? a.connectors.reduce((n, c) => n + (Array.isArray(c.pins) ? c.pins.length : 0), 0) : 0,
      lines: 0,
      junctions: 0,
      confidence: Number.isFinite(confidence) ? confidence : null,
      status: "À valider"
    };
  }

  function metrics() {
    const latest = analysisSnapshot();
    const all = state.analyses.length ? state.analyses : (latest ? [latest] : []);
    return {
      drawings: all.length,
      connectors: all.reduce((n, a) => n + (a.connectors || 0), 0),
      wires: all.reduce((n, a) => n + (a.wires || 0), 0),
      confidence: latest?.confidence ?? 0,
      latest: all.slice(-5).reverse()
    };
  }

  function ingestLatestAnalysis() {
    const latest = analysisSnapshot(); if (!latest) return;
    const exists = state.analyses.some(a => a.file === latest.file && a.createdAt === latest.createdAt);
    if (!exists) { state.analyses.push(latest); persist(); }
  }

  function escapeHtml(v) { return String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
  function setMetric(label, value) { $$('.stat-card').filter(c => c.textContent.includes(label)).forEach(c => { $('.stat-card-content strong', c)?.replaceChildren(document.createTextNode(value)); }); }

  function refreshDashboard() {
    ingestLatestAnalysis();
    const m = metrics();
    setMetric("Drawings analysés", m.drawings);
    setMetric("Connecteurs détectés", m.connectors);
    setMetric("Fils analysés", m.wires);
    setMetric("Confiance IA", m.confidence ? `${m.confidence} %` : "—");
    const body = $("#page-dashboard .data-table tbody"); if (!body) return;
    body.innerHTML = m.latest.length ? m.latest.map(a => `<tr><td><strong>${escapeHtml(a.file)}</strong><small>${escapeHtml(a.id)}</small></td><td>${escapeHtml(a.file)}</td><td>${a.connectors}</td><td>${a.wires}</td><td>${a.confidence != null ? `${a.confidence} %` : "—"}</td><td><span class="status-badge analysis">${escapeHtml(a.status)}</span></td></tr>`).join("") : `<tr><td colspan="6">Aucune analyse réelle enregistrée. Importez un Drawing pour commencer.</td></tr>`;
  }

  function projectForm() {
    const old = $("#realProjectModal"); if (old) old.remove();
    const root = document.createElement("div"); root.id = "realProjectModal"; root.className = "muster-modal-backdrop";
    root.innerHTML = `<div class="muster-modal show"><div class="muster-modal-head"><strong>Nouveau projet réel</strong><button class="modal-close">×</button></div><div class="muster-modal-body"><div class="form-stack"><label>Nom du projet<input id="realProjectName" placeholder="BAW Harness 2026"></label><label>Référence<input id="realProjectRef" placeholder="PRJ-001"></label></div></div><div class="muster-modal-actions"><button class="btn btn-secondary modal-close">Annuler</button><button class="btn btn-primary" id="saveRealProject">Créer le projet</button></div></div>`;
    document.body.appendChild(root);
    root.querySelectorAll(".modal-close").forEach(b => b.addEventListener("click", () => root.remove()));
    root.querySelector("#saveRealProject")?.addEventListener("click", () => {
      const name = $("#realProjectName")?.value.trim(), ref = $("#realProjectRef")?.value.trim();
      if (!name || !ref) return window.Toast?.show?.("Nom et référence requis.", "warning");
      state.projects.push({ id: ref, name, createdAt: new Date().toISOString() }); persist(); root.remove();
      window.Toast?.show?.(`Projet ${ref} créé.`); window.Navigation?.go?.("projects");
    });
  }

  function bindRealActions() {
    document.addEventListener("click", e => { const a = e.target.closest("[data-action]"); if (a?.dataset.action === "new-project") projectForm(); });
  }

  window.MusterApp = { state, persist, metrics, refreshDashboard, ingestLatestAnalysis, getProjects: () => [...state.projects], getAnalyses: () => [...state.analyses] };
  function loadManualEditor() { if (document.querySelector('script[data-muster-manual-editor]')) return; const s = document.createElement("script"); s.src = "src/js/manual-editor.js"; s.async = false; s.dataset.musterManualEditor = "1"; s.onload = () => setTimeout(() => { window.MusterManualEditor?.mount?.(); loadVisionBridge(); }, 80); document.head.appendChild(s); }
  function loadVisionBridge() { if (document.querySelector('script[data-muster-vision-manual-bridge]')) return; const s = document.createElement("script"); s.src = "src/js/ai-manual-bridge.js"; s.async = false; s.dataset.musterVisionManualBridge = "1"; document.head.appendChild(s); }
  function mountManualLater() { setTimeout(() => { window.MusterManualEditor?.mount?.(); window.MusterAiManualBridge?.refreshPins?.(); }, 100); }

  window.addEventListener("DOMContentLoaded", () => { ingestLatestAnalysis(); refreshDashboard(); bindRealActions(); loadManualEditor(); mountManualLater(); loadVisionBridge(); });
  window.addEventListener("muster:analysis-ready", () => { setTimeout(refreshDashboard, 50); });
  window.addEventListener("hashchange", () => { setTimeout(refreshDashboard, 50); mountManualLater(); });
})();
