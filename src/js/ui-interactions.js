/* MUSTER BAW — Global UI interactions */
"use strict";

(() => {
  const $ = (s, p = document) => p.querySelector(s);
  const $$ = (s, p = document) => [...p.querySelectorAll(s)];
  const toast = (message, type = "success") => window.Toast?.show?.(message, type);

  const pageRoutes = {
    dashboard: "dashboard", projects: "projects", "drawing-scanner": "drawing-scanner",
    "ai-analyzer": "ai-analyzer", "manual-analysis": "manual-analysis", connectors: "connectors",
    "connector-3d": "connector-3d", pinout: "pinout", "wire-list": "wire-list",
    "wire-details": "wire-details", terminals: "terminals", compatibility: "compatibility",
    validation: "validation", bom: "bom", reports: "reports", database: "database", settings: "settings"
  };

  function go(page) {
    if (!page) return;
    if (window.Navigation?.go) window.Navigation.go(page);
    else window.location.hash = `#${page}`;
    const sidebar = $("#sidebar");
    sidebar?.classList.remove("mobile-open");
  }

  function modal(title, body, actions = "") {
    document.querySelector(".muster-modal")?.remove();
    const root = document.createElement("div");
    root.className = "muster-modal-backdrop";
    root.innerHTML = `<div class="muster-modal" role="dialog" aria-modal="true"><div class="muster-modal-head"><strong>${title}</strong><button class="modal-close" aria-label="Fermer">×</button></div><div class="muster-modal-body">${body}</div><div class="muster-modal-actions">${actions || '<button class="btn btn-primary modal-close">Fermer</button>'}</div></div>`;
    document.body.appendChild(root);
    const close = () => root.remove();
    root.addEventListener("click", e => { if (e.target === root || e.target.closest(".modal-close")) close(); });
    document.addEventListener("keydown", function esc(e){ if(e.key === "Escape"){close();document.removeEventListener("keydown",esc);} });
    setTimeout(() => root.querySelector(".muster-modal")?.classList.add("show"), 10);
  }

  function setupSearch() {
    const button = $("#searchButton");
    if (!button || button.dataset.bound) return;
    button.dataset.bound = "1";
    button.addEventListener("click", () => {
      modal("Recherche MUSTER BAW", `<input id="globalSearchInput" class="global-search-input" type="search" placeholder="Rechercher un module, Wire, Connector, Pin…" autofocus><div id="globalSearchResults" class="global-search-results"></div>`);
      const input = $("#globalSearchInput");
      const results = $("#globalSearchResults");
      const items = [
        ["Dashboard", "dashboard"], ["Drawing Scanner", "drawing-scanner"], ["Analyseur IA", "ai-analyzer"],
        ["Connecteurs détectés", "connectors"], ["Vue 3D", "connector-3d"], ["Pinout & Cavités", "pinout"],
        ["Wire List", "wire-list"], ["Détails des fils", "wire-details"], ["Terminaux & Contacts", "terminals"],
        ["Compatibilité", "compatibility"], ["Validation humaine", "validation"], ["BOM", "bom"],
        ["Rapports", "reports"], ["Base de données", "database"], ["Paramètres", "settings"]
      ];
      const render = value => {
        const q = value.trim().toLowerCase();
        results.innerHTML = items.filter(([label]) => label.toLowerCase().includes(q)).map(([label, page]) => `<button class="search-result" data-search-page="${page}"><i class="fa-solid fa-arrow-right"></i><span>${label}</span></button>`).join("") || `<p class="muted">Aucun résultat.</p>`;
      };
      input.addEventListener("input", () => render(input.value));
      results.addEventListener("click", e => { const b=e.target.closest("[data-search-page]"); if(!b)return; document.querySelector(".muster-modal-backdrop")?.remove(); go(b.dataset.searchPage); });
      render("");
    });
  }

  function setupNotifications() {
    const b = $("#notificationButton");
    if (!b || b.dataset.bound) return;
    b.dataset.bound = "1";
    b.addEventListener("click", () => modal("Notifications", `<div class="notification-list"><div><strong>Analyse terminée</strong><span>BAW-001.pdf est prêt à être validé.</span></div><div><strong>Validation requise</strong><span>3 relations Wire ↔ Connector nécessitent une vérification.</span></div><div><strong>Export prêt</strong><span>La dernière Wire List peut être téléchargée.</span></div></div>`));
  }

  function setupUserProfile() {
    const b = $(".user-profile");
    if (!b || b.dataset.bound) return;
    b.dataset.bound = "1";
    b.addEventListener("click", () => go("settings"));
  }

  function setupButtons() {
    document.addEventListener("click", e => {
      const p = e.target.closest("[data-page-link]");
      if (p) { e.preventDefault(); go(p.dataset.pageLink); }

      const action = e.target.closest("[data-action]");
      if (!action) return;
      const kind = action.dataset.action;
      if (kind === "new-project") modal("Nouveau projet", `<div class="form-stack"><label>Nom du projet<input id="newProjectName" placeholder="BAW Harness 2026"></label><label>Référence<input id="newProjectRef" placeholder="PRJ-001"></label></div>`, `<button class="btn btn-secondary modal-close">Annuler</button><button class="btn btn-primary" id="createProjectBtn">Créer</button>`);
      if (kind === "help") modal("Aide rapide", `<p>Workflow recommandé : <strong>Drawing → Analyse IA → Validation → Wire List → BOM</strong>.</p><p>Tu peux importer un PDF ou une image depuis <strong>Scanner le Drawing</strong>, puis contrôler chaque relation avant export.</p>`);
      if (kind === "reset") { localStorage.removeItem("muster_baw_analysis_v2"); toast("Données locales de démonstration réinitialisées.", "warning"); }
    });
  }

  function setupKeyboardShortcuts() {
    document.addEventListener("keydown", e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); $("#searchButton")?.click(); }
      if (e.key === "Escape") document.querySelector(".muster-modal-backdrop")?.remove();
    });
  }

  function injectStyles() {
    if ($("#muster-ui-interactions-style")) return;
    const style = document.createElement("style");
    style.id = "muster-ui-interactions-style";
    style.textContent = `
      .muster-modal-backdrop{position:fixed;inset:0;z-index:3000;background:rgba(15,23,42,.48);backdrop-filter:blur(5px);display:grid;place-items:center;padding:20px}.muster-modal{width:min(620px,100%);background:#fff;border:1px solid #dbe4ee;border-radius:20px;box-shadow:0 30px 80px rgba(15,23,42,.22);transform:translateY(8px) scale(.98);opacity:0;transition:.22s ease}.muster-modal.show{transform:none;opacity:1}.muster-modal-head{display:flex;justify-content:space-between;align-items:center;padding:18px 20px;border-bottom:1px solid #e2e8f0}.muster-modal-body{padding:20px}.muster-modal-actions{display:flex;justify-content:flex-end;gap:10px;padding:16px 20px;border-top:1px solid #e2e8f0}.modal-close{background:none;border:0;font-size:1.5rem;cursor:pointer;color:#64748b}.global-search-input{width:100%;padding:14px 16px;border:1px solid #cbd5e1;border-radius:12px;font:inherit;outline:none}.global-search-input:focus{border-color:#2563eb;box-shadow:0 0 0 4px rgba(37,99,235,.08)}.global-search-results{display:grid;gap:8px;margin-top:14px;max-height:330px;overflow:auto}.search-result{display:flex;gap:10px;align-items:center;text-align:left;padding:12px 14px;border:1px solid #e2e8f0;background:#f8fafc;border-radius:11px;cursor:pointer}.search-result:hover{background:#eff6ff;border-color:#bfdbfe}.notification-list{display:grid;gap:12px}.notification-list>div{padding:14px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc}.notification-list strong,.notification-list span{display:block}.notification-list span{margin-top:4px;color:#64748b;font-size:.82rem}.form-stack{display:grid;gap:14px}.form-stack label{display:grid;gap:6px;font-weight:700;color:#334155}.form-stack input{padding:12px;border:1px solid #cbd5e1;border-radius:10px;font:inherit}.muted{color:#64748b}.dark-mode .muster-modal{background:#0f172a;color:#e2e8f0;border-color:#334155}.dark-mode .muster-modal-head,.dark-mode .muster-modal-actions{border-color:#334155}.dark-mode .search-result,.dark-mode .notification-list>div{background:#111827;border-color:#334155;color:#e2e8f0}.dark-mode .global-search-input,.dark-mode .form-stack input{background:#0b1220;color:#e2e8f0;border-color:#475569}
    `;
    document.head.appendChild(style);
  }

  function init() {
    injectStyles(); setupSearch(); setupNotifications(); setupUserProfile(); setupButtons(); setupKeyboardShortcuts();
    $$('button:not([type="submit"]):not([data-bound])').forEach(btn => {
      if (!btn.dataset.page && !btn.dataset.pageLink && btn.id !== "searchButton" && btn.id !== "notificationButton" && btn.id !== "themeToggle" && btn.id !== "mobileMenuButton") btn.dataset.bound = "1";
    });
  }

  window.addEventListener("DOMContentLoaded", init);
  new MutationObserver(init).observe(document.body, { childList:true, subtree:true });
})();