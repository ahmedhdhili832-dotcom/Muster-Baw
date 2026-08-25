/* MUSTER BAW — professional first-screen landing */
"use strict";
(() => {
  const $=(s,p=document)=>p.querySelector(s);
  const pages=[
    ['dashboard','Tableau de bord','Vue globale du projet et état des analyses','fa-chart-line'],
    ['projects','Gestion des projets','Créer et organiser les projets de câblage','fa-folder-open'],
    ['drawing-scanner','Scanner le Drawing','Importer PDF, PNG ou JPG et préparer le schéma','fa-file-import'],
    ['ai-analyzer','Analyseur IA','Interprétation assistée du Drawing et des relations','fa-brain'],
    ['manual-analysis','Analyse manuelle','Contrôler et compléter les résultats','fa-diagram-project'],
    ['connectors','Connecteurs détectés','Références, zones et connecteurs identifiés','fa-plug'],
    ['connector-3d','Vue 3D','Visualiser les connecteurs et le mapping des pins','fa-cube'],
    ['pinout','Pinout & Cavités','Lire les cavités, pins et correspondances','fa-table-cells'],
    ['wire-list','Wire List','Centraliser les fils et leurs caractéristiques','fa-grip-lines'],
    ['wire-details','Détails des fils','Explorer chaque fil, chemin et confiance','fa-magnifying-glass'],
    ['terminals','Terminaux & Contacts','Associer contacts, terminaux et connecteurs','fa-link'],
    ['compatibility','Compatibilité','Contrôler les associations techniques','fa-shield-halved'],
    ['validation','Validation humaine','Vérifier et valider les résultats','fa-user-check'],
    ['bom','Génération BOM','Préparer la nomenclature des composants','fa-boxes-stacked'],
    ['reports','Rapports & Historique','Consulter les analyses et exporter les résultats','fa-file-lines'],
    ['database','Base de données','Références de composants et données techniques','fa-database'],
    ['settings','Paramètres','Préférences de la plateforme','fa-gear']
  ];
  function ensurePages(){
    const container=$('.page-container'); if(!container)return;
    pages.forEach(([id])=>{if(!document.getElementById(`page-${id}`)){const s=document.createElement('section');s.className='page';s.id=`page-${id}`;container.appendChild(s)}});
  }
  function showPage(page){
    ensurePages();
    const nav=document.querySelector(`[data-page="${page}"]`); if(nav){nav.click();return}
    location.hash=`#${page}`;
    window.scrollTo({top:0,behavior:'smooth'});
  }
  function close(){
    document.querySelector('.onboarding-gate')?.remove();
    document.body.classList.remove('onboarding-locked');
    document.body.classList.add('platform-entered');
  }
  function render(){
    if(document.querySelector('.onboarding-gate'))return;
    ensurePages();
    document.body.classList.add('onboarding-locked');
    const gate=document.createElement('div'); gate.className='onboarding-gate';
    const featureHtml=pages.map(([id,title,desc,icon],i)=>`<button class="landing-feature" data-landing-page="${id}" style="--delay:${i*45}ms"><span class="landing-feature-icon"><i class="fa-solid ${icon}"></i></span><span><strong>${title}</strong><small>${desc}</small></span><i class="fa-solid fa-arrow-right landing-arrow"></i></button>`).join('');
    gate.innerHTML=`
      <div class="landing-orbit orbit-one"></div><div class="landing-orbit orbit-two"></div>
      <div class="landing-shell">
        <header class="landing-header">
          <div class="landing-brand"><div class="landing-logo"><span>MB</span><i class="fa-solid fa-bolt"></i></div><div><strong>MUSTER BAW</strong><small>SEBN • PPE</small></div></div>
          <div class="landing-badge"><span></span> DIGITAL WIRING ANALYSIS</div>
        </header>
        <div class="landing-hero">
          <div class="landing-copy">
            <div class="landing-kicker">MUSTER BAW SEBN • PPE</div>
            <h1>Analysez votre <span>Drawing.</span><br>Comprenez votre <span>câblage.</span></h1>
            <p>Plateforme dédiée à l’analyse et à la compréhension des schémas de câblage : import du Drawing, vision assistée par IA, connecteurs, pins, fils, compatibilité, validation, BOM et rapports.</p>
            <div class="landing-actions"><button class="landing-enter" id="landingEnter"><i class="fa-solid fa-arrow-right"></i> Entrer dans la plateforme</button><button class="landing-tour" id="landingTour"><i class="fa-solid fa-play"></i> Voir les modules</button></div>
            <div class="landing-trust"><span><i class="fa-solid fa-file-shield"></i> PDF / PNG / JPG</span><span><i class="fa-solid fa-brain"></i> IA + Vision</span><span><i class="fa-solid fa-cube"></i> 3D</span><span><i class="fa-solid fa-diagram-project"></i> Wiring Graph</span></div>
          </div>
          <div class="landing-visual" aria-label="Animation de câblage">
            <div class="visual-glow"></div><div class="visual-title"><span>LIVE ENGINE</span><b>WIRE ANALYSIS</b></div>
            <svg class="wiring-svg" viewBox="0 0 620 430" role="img" aria-label="Animation de lignes de câblage et connecteurs">
              <defs><linearGradient id="wireBlue" x1="0" x2="1"><stop stop-color="#38bdf8"/><stop offset="1" stop-color="#6366f1"/></linearGradient><linearGradient id="wireGreen" x1="0" x2="1"><stop stop-color="#34d399"/><stop offset="1" stop-color="#22c55e"/></linearGradient><filter id="glow"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
              <rect x="35" y="35" width="550" height="360" rx="28" fill="rgba(15,23,42,.72)" stroke="rgba(148,163,184,.22)"/>
              <g class="connector connector-a"><rect x="65" y="145" width="100" height="145" rx="14"/><rect x="80" y="160" width="70" height="115" rx="8"/><circle cx="95" cy="180" r="5"/><circle cx="95" cy="205" r="5"/><circle cx="95" cy="230" r="5"/><circle cx="95" cy="255" r="5"/><circle cx="135" cy="180" r="5"/><circle cx="135" cy="205" r="5"/><circle cx="135" cy="230" r="5"/><circle cx="135" cy="255" r="5"/></g>
              <g class="connector connector-b"><rect x="455" y="120" width="105" height="180" rx="14"/><rect x="470" y="138" width="75" height="145" rx="8"/><circle cx="488" cy="158" r="5"/><circle cx="488" cy="185" r="5"/><circle cx="488" cy="212" r="5"/><circle cx="488" cy="239" r="5"/><circle cx="528" cy="158" r="5"/><circle cx="528" cy="185" r="5"/><circle cx="528" cy="212" r="5"/><circle cx="528" cy="239" r="5"/></g>
              <path class="wire wire-1" d="M150 180 C240 180 290 95 475 158"/><path class="wire wire-2" d="M150 205 C250 205 320 150 475 185"/><path class="wire wire-3" d="M150 230 C245 230 320 255 475 212"/><path class="wire wire-4" d="M150 255 C250 255 350 330 475 239"/>
              <path class="wire wire-5" d="M165 285 C250 350 365 365 475 270"/>
              <circle class="scan-node" cx="300" cy="205" r="9"/><circle class="scan-node" cx="350" cy="280" r="9"/>
              <g class="scan-label"><rect x="225" y="60" width="145" height="38" rx="19"/><text x="297" y="84" text-anchor="middle">AI • WIRE MAP</text></g>
              <g class="pulse-ring"><circle cx="300" cy="205" r="24"/><circle cx="350" cy="280" r="24"/></g>
            </svg>
            <div class="visual-footer"><span><i class="fa-solid fa-circle-check"></i> Geometry</span><span><i class="fa-solid fa-circle-check"></i> Connectors</span><span><i class="fa-solid fa-circle-check"></i> Wire paths</span></div>
          </div>
        </div>
        <section class="landing-modules" id="landingModules"><div class="modules-heading"><div><span>PLATEFORME COMPLÈTE</span><h2>Tous les modules, au même endroit</h2></div><p>Choisissez un module directement ou entrez dans le Dashboard pour suivre le workflow complet.</p></div><div class="landing-grid">${featureHtml}</div></section>
        <footer class="landing-footer"><span>© MUSTER BAW • SEBN • PPE</span><span>Analyse → Compréhension → Validation → Résultats</span></footer>
      </div>`;
    document.body.appendChild(gate);
    $('#landingEnter',gate).onclick=()=>close();
    $('#landingTour',gate).onclick=()=>$('#landingModules',gate)?.scrollIntoView({behavior:'smooth',block:'start'});
    gate.querySelectorAll('[data-landing-page]').forEach(b=>b.addEventListener('click',()=>{const p=b.dataset.landingPage;close();setTimeout(()=>showPage(p),60)}));
  }
  function refresh(){render()}
  window.addEventListener('DOMContentLoaded',()=>setTimeout(refresh,80));
  window.MusterOnboarding={show:render,remove:close,refresh,isAuthorized:()=>true};
})();
