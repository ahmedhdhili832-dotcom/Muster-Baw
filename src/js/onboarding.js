/* MUSTER BAW — First visit onboarding / access gate */
"use strict";
(() => {
  const $=(s,p=document)=>p.querySelector(s);
  const session=()=>{try{return JSON.parse(localStorage.getItem("muster_baw_session_v1")||"null")}catch{return null}};
  const isPublicRoute=()=>["account","leader-approvals"].includes(location.hash.slice(1));
  function remove(){document.querySelector(".onboarding-gate")?.remove();document.body.classList.remove("onboarding-locked");}
  function go(hash){location.hash=hash;remove();}
  function show(){
    if(session()?.userId || isPublicRoute() || document.querySelector(".onboarding-gate")) return;
    document.body.classList.add("onboarding-locked");
    const gate=document.createElement("div");
    gate.className="onboarding-gate";
    gate.innerHTML=`<div class="onboarding-shell"><div class="onboarding-copy"><div class="onboarding-brand"><div class="onboarding-logo">MB</div><div><strong>MUSTER BAW</strong><div style="color:#94a3b8;font-size:.78rem">SEBN • PPE</div></div></div><div class="onboarding-kicker">WIRE HARNESS ANALYSIS PLATFORM</div><h1>Analysez vos <span>drawings</span> plus intelligemment.</h1><p>MUSTER BAW est une plateforme dédiée à l’analyse des schémas de câblage : import de Drawing, OCR, vision géométrique, détection de connecteurs et pins, reconstruction des relations de câblage, validation humaine, Wire List et résultats exportables.</p><div class="onboarding-features"><div class="onboarding-feature"><strong>📄 Drawing Scanner</strong><span>PDF, PNG et JPG avec traitement local.</span></div><div class="onboarding-feature"><strong>🧠 Analyse IA</strong><span>OCR + computer vision pour les éléments du schéma.</span></div><div class="onboarding-feature"><strong>🔌 Connecteurs & Pinout</strong><span>Références, pins, cavités et candidats.</span></div><div class="onboarding-feature"><strong>🧵 Wire List</strong><span>Couleur, section, longueur, terminal et relations.</span></div><div class="onboarding-feature"><strong>🛡️ Validation</strong><span>Contrôle humain avant de considérer un résultat fiable.</span></div><div class="onboarding-feature"><strong>📦 BOM & Rapports</strong><span>Préparation des résultats et exports.</span></div></div><div class="onboarding-actions"><button class="btn btn-primary" id="onboardingRegister">Créer mon compte</button><button class="btn btn-secondary" id="onboardingLogin">J’ai déjà un compte</button></div><div class="onboarding-note">L’accès agent est activé uniquement après approbation du Group Leader. Cette version GitHub Pages utilise un état local de démonstration ; une authentification serveur sera nécessaire pour la production.</div></div><div class="onboarding-side"><div class="onboarding-card"><h3>Comment ça fonctionne ?</h3><div class="onboarding-step"><span class="n">1</span><div><strong>Créer un compte</strong><div style="color:#94a3b8;font-size:.82rem">Nom, email professionnel, matricule et équipe.</div></div></div><div class="onboarding-step"><span class="n">2</span><div><strong>Approbation Group Leader</strong><div style="color:#94a3b8;font-size:.82rem">La demande reste en attente jusqu’à validation.</div></div></div><div class="onboarding-step"><span class="n">3</span><div><strong>Accéder à MUSTER BAW</strong><div style="color:#94a3b8;font-size:.82rem">Scanner, analyser, valider et exporter.</div></div></div><hr style="border:0;border-top:1px solid rgba(148,163,184,.16);margin:20px 0"><strong>Modules disponibles</strong><div style="color:#94a3b8;font-size:.8rem;line-height:1.9;margin-top:8px">Dashboard • Projects • Drawing Scanner • Analyseur IA • Connecteurs • Vue 3D • Pinout • Wire List • Compatibilité • Validation • BOM • Rapports • Base de données • Paramètres</div></div></div></div>`;
    document.body.appendChild(gate);
    $("#onboardingRegister",gate).onclick=()=>go("#account");
    $("#onboardingLogin",gate).onclick=()=>go("#account");
  }
  function refresh(){ if(session()?.userId) remove(); else if(!isPublicRoute()) show(); else remove(); }
  window.addEventListener("DOMContentLoaded",()=>setTimeout(refresh,100));
  window.addEventListener("hashchange",()=>setTimeout(refresh,50));
  window.MusterOnboarding={show,remove,refresh};
})();