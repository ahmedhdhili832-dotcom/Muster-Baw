/* MUSTER BAW — Results synchronization layer */
"use strict";
(() => {
  const STORE="muster_baw_analysis_v1";
  const $=(s,p=document)=>p.querySelector(s);
  const safe=()=>{try{return JSON.parse(localStorage.getItem(STORE)||"null")}catch{return null}};
  const esc=v=>String(v??"").replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));
  const chips=(arr,cls="blue")=>(arr||[]).map(x=>`<span class="result-chip ${cls}">${esc(typeof x==='string'?x:(x.label||x.value||x.id))}</span>`).join("")||`<span class="result-chip gray">Aucune donnée</span>`;
  function analysis(){return safe();}
  function render(page){
    const data=analysis(); if(!data)return;
    if(page==="ai-analyzer"){
      const el=$("#page-ai-analyzer"); if(!el)return;
      el.innerHTML=`<div class="page-header"><div><span class="page-label">COMPUTER VISION</span><h2>Analyseur IA</h2><p>Résultats issus du dernier Drawing importé et passé par OCR + règles de détection.</p></div><span class="ai-status"><span></span>Analyse disponible</span></div><div class="analysis-summary">${["Connecteurs","Fils","Pins / cavités","Sections","Longueurs"].map((k,i)=>`<div class="analysis-kpi"><small>${k}</small><strong>${[data.connectors?.length,data.wires?.length,data.pins?.length,data.sections?.length,data.lengths?.length][i]||0}</strong></div>`).join("")}</div><div class="dashboard-grid" style="margin-top:18px"><article class="dashboard-card"><div class="ai-card-content"><div class="ai-icon"><i class="fa-solid fa-brain"></i></div><h4>Source</h4><p><strong>${esc(data.file||"Drawing")}</strong></p><p>Le texte OCR est stocké localement pour permettre la validation et les exports.</p></div></article><article class="dashboard-card"><div class="ai-card-content"><div class="ai-icon"><i class="fa-solid fa-shield-halved"></i></div><h4>Validation humaine</h4><p>Confirmez les références avant de les utiliser dans une Wire List ou une BOM.</p><button class="btn btn-primary" data-page-link="validation">Ouvrir la validation</button></div></article></div>`;
    }
    if(page==="connectors"){
      const el=$("#page-connectors"); if(!el)return;
      el.innerHTML=`<div class="page-header"><div><span class="page-label">CONNECTEURS</span><h2>Connecteurs détectés</h2><p>Références candidates extraites du Drawing.</p></div></div><div class="dashboard-card"><div class="result-list" style="padding:18px">${chips(data.connectors)}</div><div class="analysis-note" style="margin:0 18px 18px">Références détectées par OCR / règles. La confirmation du fabricant et du pinout reste nécessaire.</div></div>`;
    }
    if(page==="wire-list"){
      const el=$("#page-wire-list"); if(!el)return;
      const wires=data.wires||[]; const connectors=data.connectors||[]; const sections=data.sections||[]; const lengths=data.lengths||[]; const terms=data.terminals||[]; const colors=data.colors||[];
      el.innerHTML=`<div class="page-header"><div><span class="page-label">CÂBLAGE</span><h2>Wire List</h2><p>${wires.length} fils candidats reconstruits à partir du Drawing.</p></div><button class="btn btn-primary" id="syncExportJson"><i class="fa-solid fa-download"></i>Exporter JSON</button></div><div class="dashboard-card"><div class="table-container"><table class="data-table"><thead><tr><th>Wire</th><th>Connecteur</th><th>Couleur</th><th>Section</th><th>Longueur</th><th>Terminal</th></tr></thead><tbody>${wires.map((w,i)=>`<tr><td><strong>${esc(w)}</strong></td><td>${esc(connectors[i%Math.max(1,connectors.length)]||"—")}</td><td>${esc(colors[i%Math.max(1,colors.length)]?.label||"—")}</td><td>${esc(sections[i%Math.max(1,sections.length)]||"—")}</td><td>${esc(lengths[i%Math.max(1,lengths.length)]||"—")}</td><td>${esc(terms[i%Math.max(1,terms.length)]||"—")}</td></tr>`).join("")||`<tr><td colspan="6" style="text-align:center">Aucun wire explicite détecté.</td></tr>`}</tbody></table></div></div>`;
      $("#syncExportJson")?.addEventListener("click",()=>{const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}));a.download="muster-baw-analysis.json";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)});
    }
    if(page==="reports"){
      const el=$("#page-reports"); if(!el)return;
      const saved=data.createdAt?new Date(data.createdAt).toLocaleString("fr-FR"):"—";
      el.innerHTML=`<div class="page-header"><div><span class="page-label">RÉSULTATS</span><h2>Rapports & Historique</h2><p>Dernière analyse locale disponible.</p></div></div><div class="dashboard-card"><div class="table-container"><table class="data-table"><thead><tr><th>Drawing</th><th>Date</th><th>Connecteurs</th><th>Fils</th><th>Sections</th><th>Longueurs</th></tr></thead><tbody><tr><td><strong>${esc(data.file||"Drawing")}</strong></td><td>${esc(saved)}</td><td>${data.connectors?.length||0}</td><td>${data.wires?.length||0}</td><td>${data.sections?.length||0}</td><td>${data.lengths?.length||0}</td></tr></tbody></table></div></div>`;
    }
  }
  let last="";
  const observer=new MutationObserver(()=>{const active=document.querySelector(".page.active");if(!active)return;const page=active.id.replace("page-","");if(page!==last){last=page;render(page)}});
  observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:["class"]});
  window.addEventListener("storage",()=>render(last));
  window.MusterResultsSync={render};
})();