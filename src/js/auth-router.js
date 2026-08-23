"use strict";
(() => {
  const $ = (s,p=document) => p.querySelector(s);
  const ensurePage = id => {
    const wrap = $('.page-container');
    if (!wrap) return null;
    let page = document.getElementById(`page-${id}`);
    if (!page) { page=document.createElement('section'); page.className='page'; page.id=`page-${id}`; wrap.appendChild(page); }
    return page;
  };
  const addNav = () => {
    const nav = $('.sidebar-navigation');
    if (!nav || nav.dataset.authNav) return;
    nav.dataset.authNav='1';
    const section=document.createElement('div'); section.className='nav-section auth-nav-section';
    section.innerHTML='<div class="nav-title">ACCÈS</div><button class="nav-item" data-auth-page="account"><i class="fa-solid fa-user-shield"></i><span>Mon compte</span></button><button class="nav-item leader-only" data-auth-page="leader-approvals"><i class="fa-solid fa-user-check"></i><span>Approbations Leader</span></button>';
    nav.appendChild(section);
    section.addEventListener('click', e => { const b=e.target.closest('[data-auth-page]'); if(!b)return; e.preventDefault(); go(b.dataset.authPage); });
  };
  const go = page => {
    if(!['account','leader-approvals'].includes(page)) return;
    ensurePage(page);
    document.querySelectorAll('.page').forEach(x=>{ const active=x.id===`page-${page}`; x.classList.toggle('active',active); active?x.removeAttribute('hidden'):x.setAttribute('hidden',''); });
    document.querySelectorAll('.nav-item').forEach(x=>x.classList.remove('active'));
    const btn=document.querySelector(`[data-auth-page="${page}"]`); if(btn)btn.classList.add('active');
    const title=$('#pageTitle'); if(title) title.textContent=page==='account'?'Mon compte':'Approbations Group Leader';
    history.replaceState({page},'',`#${page}`);
    if(page==='account') window.MusterAuth?.renderAccountPage?.();
    if(page==='leader-approvals') window.MusterAuth?.renderLeaderPage?.();
    window.scrollTo({top:0,behavior:'smooth'});
  };
  function init(){ addNav(); if(location.hash==='#account') go('account'); if(location.hash==='#leader-approvals') go('leader-approvals'); }
  window.addEventListener('hashchange',()=>{ const p=location.hash.slice(1); if(['account','leader-approvals'].includes(p)) go(p); });
  new MutationObserver(addNav).observe(document.body,{childList:true,subtree:true});
  window.MusterAuthRouter={go};
  window.addEventListener('DOMContentLoaded',init);
})();
