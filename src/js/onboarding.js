/* MUSTER BAW — First visit onboarding / access gate */
"use strict";
(() => {
  const $=(s,p=document)=>p.querySelector(s);
  const session=()=>{try{return JSON.parse(localStorage.getItem("muster_baw_session_v1")||"null")}catch{return null}};
  const isPublicRoute=()=>["account","leader-approvals"].includes(location.hash.slice(1));

  function ensureAccessAssets(){
    if(!document.querySelector('link[data-auth-css]')){const l=document.createElement('link');l.rel='stylesheet';l.href='src/css/auth.css';l.dataset.authCss='1';document.head.appendChild(l);}
    if(!document.querySelector('link[data-onboarding-css]')){const l=document.createElement('link');l.rel='stylesheet';l.href='src/css/onboarding.css';l.dataset.onboardingCss='1';document.head.appendChild(l);}
    if(!window.MusterAuth){const s=document.createElement('script');s.src='src/js/auth.js';s.onload=()=>{if(location.hash==='#account')window.MusterAuth?.renderAccountPage?.();if(location.hash==='#leader-approvals')window.MusterAuth?.renderLeaderPage?.();};document.head.appendChild(s);}
  }

  function ensurePages(){
    const container=document.querySelector('.page-container');
    if(!container) return;
    if(!document.getElementById('page-account')){const s=document.createElement('section');s.className='page';s.id='page-account';container.appendChild(s);}
    if(!document.getElementById('page-leader-approvals')){const s=document.createElement('section');s.className='page';s.id='page-leader-approvals';container.appendChild(s);}
  }

  function remove(){document.querySelector('.onboarding-gate')?.remove();document.body.classList.remove('onboarding-locked');}
  function go(hash){ensureAccessAssets();ensurePages();location.hash=hash;remove();setTimeout(()=>{if(hash==='#account')window.MusterAuth?.renderAccountPage?.();if(hash==='#leader-approvals')window.MusterAuth?.renderLeaderPage?.();},120);}

  function show(){
    if(session()?.userId || isPublicRoute() || document.querySelector('.onboarding-gate')) return;
    ensureAccessAssets();ensurePages();
    document.body.classList.add('onboarding-locked');
    const gate=document.createElement('div');gate.className='onboarding-gate';
    gate.innerHTML=`<div class="onboarding-shell"><div class="onboarding-copy"><div class="onboarding-brand"><div class="onboarding-logo">MB</div><div><strong>MUSTER BAW</strong><div style="color:#94a3b8;font-size:.78rem">SEBN • PPE</div></div></div><div class="onboarding-kicker">WIRE HARNESS ANALYSIS PLATFORM</div><h1>Bienvenue dans <span>MUSTER BAW</span>.</h1><p>Une plateforme de travail dédiée à l’analyse des drawings de câblage automobile. Importez un Drawing, détectez les éléments, construisez les relations de câblage, vérifiez les résultats et préparez vos livrables.</p><div class="onboarding-features"><div class="onboarding-feature"><strong>📄 Drawing Scanner</strong><span>PDF, PNG et JPG avec aperçu et traitement local.</span></div><div class="onboarding-feature"><strong>🧠 Computer Vision</strong><span>OCR, lignes, jonctions et zones candidates.</span></div><div class="onboarding-feature"><strong>🔌 Connecteurs & Pinout</strong><span>Références, pins et cavités détectés comme candidats.</span></div><div class="onboarding-feature"><strong>🧵 Wire List</strong><span>Relations, couleur, section, longueur et terminaux.</span></div><div class="onboarding-feature"><strong>🛡️ Validation</strong><span>Contrôle humain avant toute utilisation industrielle.</span></div><div class="onboarding-feature"><strong>📦 BOM & Rapports</strong><span>Préparation des exports et de l’historique.</span></div></div><div class="onboarding-actions"><button class="btn btn-primary" id="onboardingRegister">Créer mon compte</button><button class="btn btn-secondary" id="onboardingLogin">J’ai déjà un compte</button></div><div class="onboarding-note">Pour un agent, l’accès au système est accordé après approbation du Group Leader. La version actuelle sur GitHub Pages utilise un état local de démonstration ; l’authentification serveur sera nécessaire pour la production.</div></div><div class="onboarding-side"><div class="onboarding-card"><h3>Ce que vous allez trouver</h3><div class="onboarding-step"><span class="n">1</span><div><strong>Créer ou demander un accès</strong><div style="color:#94a3b8;font-size:.82rem">Profil agent, matricule, équipe et email professionnel.</div></div></div><div class="onboarding-step"><span class="n">2</span><div><strong>Attendre l’approbation</strong><div style="color:#94a3b8;font-size:.82rem">Le Group Leader valide ou refuse la demande.</div></div></div><div class="onboarding-step"><span class="n">3</span><div><strong>Découvrir le workflow</strong><div style="color:#94a3b8;font-size:.82rem">Dashboard → Drawing → Analyse → Validation → Wire List → BOM.</div></div></div><hr style="border:0;border-top:1px solid rgba(148,163,184,.16);margin:20px 0"><strong>Modules</strong><div style="color:#94a3b8;font-size:.8rem;line-height:1.9;margin-top:8px">Dashboard • Projects • Drawing Scanner • Analyseur IA • Connecteurs • Vue 3D • Pinout • Wire List • Compatibilité • Validation • BOM • Rapports • Base de données • Paramètres</div></div></div></div>`;
    document.body.appendChild(gate);
    $('#onboardingRegister',gate).onclick=()=>go('#account');
    $('#onboardingLogin',gate).onclick=()=>go('#account');
  }

  function refresh(){ensurePages();if(session()?.userId) remove();else if(!isPublicRoute()) show();else remove();}
  window.addEventListener('DOMContentLoaded',()=>setTimeout(refresh,120));
  window.addEventListener('hashchange',()=>setTimeout(refresh,80));
  window.MusterOnboarding={show,remove,refresh};
})();