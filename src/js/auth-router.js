"use strict";
(() => {
  const loadOnboarding=()=>{
    if(window.MusterOnboarding || document.querySelector('script[data-onboarding-script]')) return;
    const s=document.createElement('script'); s.src='src/js/onboarding.js'; s.dataset.onboardingScript='1';
    s.onload=()=>window.MusterOnboarding?.refresh?.();
    document.body.appendChild(s);
  };
  function init(){ loadOnboarding(); }
  window.addEventListener('DOMContentLoaded',init);
  window.MusterAuthRouter={go:()=>{}};
})();