/* MUSTER BAW — First visit onboarding / access gate */
"use strict";
(() => {
  const $=(s,p=document)=>p.querySelector(s);
  const session=()=>{try{return JSON.parse(localStorage.getItem("muster_baw_session_v1")||"null")}catch{return null}};
  const users=()=>{try{return JSON.parse(localStorage.getItem("muster_baw_users_v1")||"[]")}catch{return []}};
  const currentUser=()=>{const s=session();if(!s?.userId||s.userId==='LEADER')return null;return users().find(u=>u.id===s.userId)||null};
  const isPublicRoute=()=>["account","leader-approvals"].includes(location.hash.slice(1));
  const isAuthorized=()=>{const s=session();if(s?.role==='leader'&&s?.userId==='LEADER')return true;const u=currentUser();return !!(u&&u.status==='approved')};

  function ensureAccessAssets(){
    if(!document.querySelector('link[data-auth-css]')){const l=document.createElement('link');l.rel='stylesheet';l.href='src/css/auth.css';l.dataset.authCss='1';document.head.appendChild(l);}
    if(!document.querySelector('link[data-onboarding-css]')){const l=document.createElement('link');l.rel='stylesheet';l.href='src/css/onboarding.css';l.dataset.onboardingCss='1';document.head.appendChild(l);}
    if(!window.MusterAuth){const s=document.createElement('script');s.src='src/js/auth.js';s.onload=()=>{if(location.hash==='#account')window.MusterAuth?.renderAccountPage?.();if(location.hash==='#leader-approvals')window.MusterAuth?.renderLeaderPage?.();};document.head.appendChild(s);}
  }

  function ensurePages(){
    const container=document.querySelector('.page-container');
    if(!container)return;
    if(!document.getElementById('page-account')){const s=document.createElement('section');s.className='page';s.id='page-account';container.appendChild(s);}
    if(!document.getElementById('page-leader-approvals')){const s=document.createElement('section');s.className='page';s.id='page-leader-approvals';container.appendChild(s);}
  }

  function remove(){document.querySelector('.onboarding-gate')?.remove();document.body.classList.remove('onboarding-locked');}
  function go(hash){ensureAccessAssets();ensurePages();location.hash=hash;remove();setTimeout(()=>{if(hash==='#account')window.MusterAuth?.renderAccountPage?.();if(hash==='#leader-approvals')window.MusterAuth?.renderLeaderPage?.();},120);}

  function show(){
    if(isAuthorized()||isPublicRoute()||document.querySelector('.onboarding-gate'))return;
    ensureAccessAssets();ensurePages();
    document.body.classList.add('onboarding-locked');
    const gate=document.createElement('div');gate.className='onboarding-gate';
    gate.innerHTML=`<div class="onboarding-shell"><div class="onboarding-copy"><div class="onboarding-brand"><div class="onboarding-logo">MB</div><div><strong>MUSTER BAW</strong><div style="color:#94a3b8;font-size:.78rem">SEBN • PPE</div></div></div><div class="onboarding-kicker">WIRE HARNESS ANALYSIS PLATFORM</div><div class="onboarding-required">🔐 COMPTE OBLIGATOIRE AVANT ACCÈS</div><h1>Bienvenue dans <span>MUSTER BAW</span>.</h1><p>Une plateforme de travail dédiée à l’analyse des drawings de câblage automobile. Importez un Drawing, analysez sa géométrie, identifiez les connecteurs et pins, reconstruisez les relations de câblage, validez les résultats et préparez vos livrables.</p><div class="onboarding-features"><div class="onboarding-feature"><strong>📊 Dashboard</strong><span>Vue globale du projet, analyses récentes et état du workflow.</span></div><div class="onboarding-feature"><strong>📁 Gestion des projets</strong><span>Créez, organisez et suivez vos projets de câblage.</span></div><div class="onboarding-feature"><strong>📄 Drawing Scanner</strong><span>Import PDF, PNG ou JPG avec aperçu et traitement local.</span></div><div class="onboarding-feature"><strong>🧠 Analyseur IA</strong><span>OCR + computer vision pour le texte et la géométrie.</span></div><div class="onboarding-feature"><strong>🔌 Connecteurs</strong><span>Références, connecteurs candidats et éléments détectés.</span></div><div class="onboarding-feature"><strong>🧊 Vue 3D</strong><span>Visualisation du connecteur, orientation et mapping des pins.</span></div><div class="onboarding-feature"><strong>📐 Pinout & Cavités</strong><span>Correspondance des pins et cavités pour la validation.</span></div><div class="onboarding-feature"><strong>🧵 Wire List</strong><span>Wire, couleur, section, longueur, direction et terminal.</span></div><div class="onboarding-feature"><strong>🔗 Terminaux & Contacts</strong><span>Suivi des contacts et compatibilités techniques.</span></div><div class="onboarding-feature"><strong>🛡️ Compatibilité</strong><span>Contrôle Wire ↔ Terminal ↔ Connector.</span></div><div class="onboarding-feature"><strong>✅ Validation humaine</strong><span>Validation obligatoire avant usage industriel.</span></div><div class="onboarding-feature"><strong>📦 BOM & Rapports</strong><span>Génération des résultats, historique et exports.</span></div><div class="onboarding-feature"><strong>🗃️ Base de données</strong><span>Références connecteurs, fils, terminaux et composants.</span></div><div class="onboarding-feature"><strong>⚙️ Paramètres</strong><span>Préférences, environnement et configuration du compte.</span></div></div><div class="onboarding-actions"><button class="btn btn-primary" id="onboardingRegister">Créer mon compte</button><button class="btn btn-secondary" id="onboardingLogin">J’ai déjà un compte</button></div><div class="onboarding-note">Pour un Agent, l’accès au système reste bloqué jusqu’à l’approbation du Group Leader. Après approbation, la barre de navigation et tous les modules deviennent accessibles.</div></div><div class="onboarding-side"><div class="onboarding-card"><h3>Comment ça fonctionne ?</h3><div class="onboarding-step"><span class="n">1</span><div><strong>Créer votre compte</strong><div style="color:#94a3b8;font-size:.82rem">Nom, email professionnel, matricule et équipe.</div></div></div><div class="onboarding-step"><span class="n">2</span><div><strong>Validation Group Leader</strong><div style="color:#94a3b8;font-size:.82rem">Votre demande passe en attente jusqu’à validation.</div></div></div><div class="onboarding-step"><span class="n">3</span><div><strong>Accéder à la plateforme</strong><div style="color:#94a3b8;font-size:.82rem">Après approbation : Dashboard, Scanner, Analyse IA, Wire List, Validation, BOM et tous les modules.</div></div></div><hr style="border:0;border-top:1px solid rgba(148,163,184,.16);margin:20px 0"><strong>Parcours recommandé</strong><div style="color:#94a3b8;font-size:.8rem;line-height:1.9;margin-top:8px">Projet → Drawing → OCR & Vision → Connecteurs → Wire List → Compatibilité → Validation → BOM → Rapport</div></div></div></div>`;
    document.body.appendChild(gate);
    $('#onboardingRegister',gate).onclick=()=>go('#account');
    $('#onboardingLogin',gate).onclick=()=>go('#account');
  }

  function refresh(){ensurePages();if(isAuthorized())remove();else if(!isPublicRoute())show();else remove();}
  window.addEventListener('DOMContentLoaded',()=>setTimeout(refresh,120));
  window.addEventListener('hashchange',()=>setTimeout(refresh,80));
  window.MusterOnboarding={show,remove,refresh,isAuthorized};
})();