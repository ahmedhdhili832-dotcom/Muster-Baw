/* MUSTER BAW — Real client-side application state */
"use strict";

(() => {
  const STORE = "muster_baw_app_v1";
  const ANALYSIS = "muster_baw_analysis_v2";
  const $ = (s, p=document) => p.querySelector(s);
  const $$ = (s, p=document) => [...p.querySelectorAll(s)];
  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; } catch { return fallback; } };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const state = read(STORE, { projects: [], analyses: [], settings: { company: "SEBN", environment: "PPE" } });
  function persist() { write(STORE, state); }
  function analysisSnapshot() {
    const a = read(ANALYSIS, null); if (!a) return null;
    return { id:`ANA-${Date.now()}`, file:a.file||"Drawing", createdAt:a.createdAt||new Date().toISOString(), connectors:Array.isArray(a.connectors)?a.connectors.length:0, wires:Array.isArray(a.wires)?a.wires.length:0, pins:Array.isArray(a.pins)?a.pins.length:0, lines:Array.isArray(a.geometry?.lines)?a.geometry.lines.length:0, junctions:Array.isArray(a.geometry?.junctions)?a.geometry.junctions.length:0, confidence:typeof a.confidence==="number"?a.confidence:null, status:"À valider" };
  }
  function metrics() { const latest=analysisSnapshot(); const all=state.analyses.length?state.analyses:(latest?[latest]:[]); return {drawings:all.length,connectors:all.reduce((n,a)=>n+(a.connectors||0),0),wires:all.reduce((n,a)=>n+(a.wires||0),0),confidence:latest?.confidence??0,latest:all.slice(-5).reverse()}; }
  function ingestLatestAnalysis() { const latest=analysisSnapshot(); if(!latest)return; const exists=state.analyses.some(a=>a.file===latest.file&&a.createdAt===latest.createdAt); if(!exists){state.analyses.push(latest);persist();} }
  function setMetric(label,value){const candidates=$$(".stat-card").filter(card=>card.textContent.includes(label));candidates.forEach(card=>{const strong=$(".stat-card-content strong",card);if(strong)strong.textContent=value;});}
  function escapeHtml(v){return String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");}
  function refreshDashboard(){ingestLatestAnalysis();const m=metrics();setMetric("Drawings analysés",m.drawings);setMetric("Connecteurs détectés",m.connectors);setMetric("Fils analysés",m.wires);setMetric("Confiance IA",m.confidence?`${m.confidence} %`:"—");const body=$("#page-dashboard .data-table tbody");if(!body)return;body.innerHTML=m.latest.length?m.latest.map(a=>`<tr><td><strong>${escapeHtml(a.file)}</strong><small>${escapeHtml(a.id)}</small></td><td>${escapeHtml(a.file)}</td><td>${a.connectors}</td><td>${a.wires}</td><td>${a.confidence!=null?`${a.confidence} %`:"—"}</td><td><span class="status-badge analysis">${escapeHtml(a.status)}</span></td></tr>`).join(""):`<tr><td colspan="6">Aucune analyse réelle enregistrée. Importez un Drawing pour commencer.</td></tr>`;}
  function projectForm(){const existing=$("#realProjectModal");if(existing)existing.remove();const root=document.createElement("div");root.id="realProjectModal";root.className="muster-modal-backdrop";root.innerHTML=`<div class="muster-modal show"><div class="muster-modal-head"><strong>Nouveau projet réel</strong><button class="modal-close">×</button></div><div class="muster-modal-body"><div class="form-stack"><label>Nom du projet<input id="realProjectName" placeholder="BAW Harness 2026"></label><label>Référence<input id="realProjectRef" placeholder="PRJ-001"></label></div></div><div class="muster-modal-actions"><button class="btn btn-secondary modal-close">Annuler</button><button class="btn btn-primary" id="saveRealProject">Créer le projet</button></div></div>`;document.body.appendChild(root);root.querySelector(".modal-close")?.addEventListener("click",()=>root.remove());root.querySelector("#saveRealProject")?.addEventListener("click",()=>{const name=$("#realProjectName")?.value.trim(),ref=$("#realProjectRef")?.value.trim();if(!name||!ref)return window.Toast?.show?.("Nom et référence requis.","warning");state.projects.push({id:ref,name,createdAt:new Date().toISOString()});persist();root.remove();window.Toast?.show?.(`Projet ${ref} créé.`);window.Navigation?.go?window.Navigation.go("projects"):location.hash="#projects";});}
  function bindRealActions(){document.addEventListener("click",e=>{const action=e.target.closest("[data-action]");if(!action)return;if(action.dataset.action==="new-project")projectForm();});}
  window.MusterApp={state,persist,metrics,refreshDashboard,ingestLatestAnalysis,getProjects:()=>[...state.projects],getAnalyses:()=>[...state.analyses]};
  function loadManualEditor(){if(document.querySelector('script[data-muster-manual-editor]'))return;const s=document.createElement("script");s.src="src/js/manual-editor.js";s.async=false;s.dataset.musterManualEditor="1";document.head.appendChild(s);}
  window.addEventListener("DOMContentLoaded",()=>{ingestLatestAnalysis();refreshDashboard();bindRealActions();loadManualEditor();});
  window.addEventListener("hashchange",()=>setTimeout(refreshDashboard,50));
})();
