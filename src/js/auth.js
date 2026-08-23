/* MUSTER BAW — Account & Group Leader Approval workflow
   Frontend demo state only. Production deployment requires a server-side auth/database layer. */
"use strict";

(() => {
  const USERS_KEY = "muster_baw_users_v1";
  const SESSION_KEY = "muster_baw_session_v1";
  const REQUESTS_KEY = "muster_baw_approval_requests_v1";
  const CONFIG_KEY = "muster_baw_security_config_v1";

  const $ = (s, p = document) => p.querySelector(s);
  const $$ = (s, p = document) => [...p.querySelectorAll(s)];

  const safeRead = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch { return fallback; }
  };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const uid = (prefix = "USR") => `${prefix}-${crypto?.randomUUID?.() || Date.now().toString(36)}-${Math.random().toString(36).slice(2,7).toUpperCase()}`;
  const toast = (msg, type = "success") => window.Toast?.show?.(msg, type);

  const defaults = {
    leaderName: "Group Leader",
    leaderEmail: "group.leader@sebn.example",
    leaderCode: "MUSTER-LEADER-DEMO"
  };

  function config() {
    const current = safeRead(CONFIG_KEY, null);
    if (current) return current;
    write(CONFIG_KEY, defaults);
    return defaults;
  }

  function users() { return safeRead(USERS_KEY, []); }
  function saveUsers(value) { write(USERS_KEY, value); }
  function requests() { return safeRead(REQUESTS_KEY, []); }
  function saveRequests(value) { write(REQUESTS_KEY, value); }
  function session() { return safeRead(SESSION_KEY, null); }
  function saveSession(value) { write(SESSION_KEY, value); }

  function statusLabel(status) {
    return ({pending: "En attente du Group Leader", approved: "Compte approuvé", rejected: "Demande refusée", suspended: "Compte suspendu"})[status] || status;
  }

  function currentUser() {
    const s = session();
    if (!s?.userId) return null;
    return users().find(u => u.id === s.userId) || null;
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
    toast("Session fermée.", "warning");
    window.location.hash = "#dashboard";
    renderUserState();
  }

  function register(form) {
    const data = Object.fromEntries(new FormData(form).entries());
    const email = String(data.email || "").trim().toLowerCase();
    const name = String(data.name || "").trim();
    const team = String(data.team || "PPE").trim();
    const employeeId = String(data.employeeId || "").trim();
    if (!name || !email || !employeeId) return toast("Nom, email et matricule sont obligatoires.", "error");
    if (!/^\S+@\S+\.\S+$/.test(email)) return toast("Adresse email invalide.", "error");
    const list = users();
    if (list.some(u => u.email === email)) return toast("Un compte existe déjà avec cet email.", "error");

    const user = { id: uid("USR"), name, email, employeeId, team, role: "agent", status: "pending", createdAt: new Date().toISOString() };
    list.push(user); saveUsers(list);

    const reqs = requests();
    reqs.push({ id: uid("REQ"), userId: user.id, requester: {name, email, employeeId, team}, status: "pending", requestedAt: new Date().toISOString(), approvedBy: null, approvedAt: null, rejectionReason: null });
    saveRequests(reqs);

    toast("Demande envoyée au Group Leader.");
    window.location.hash = "#account";
    setTimeout(() => renderAccountPage(), 50);
  }

  function signIn(form) {
    const data = Object.fromEntries(new FormData(form).entries());
    const email = String(data.email || "").trim().toLowerCase();
    const employeeId = String(data.employeeId || "").trim();
    const leaderCode = String(data.leaderCode || "").trim();

    if (leaderCode) {
      if (leaderCode !== config().leaderCode) return toast("Code Group Leader incorrect.", "error");
      saveSession({ userId: "LEADER", role: "leader", createdAt: new Date().toISOString() });
      toast("Mode Group Leader activé.");
      window.location.hash = "#leader-approvals";
      return;
    }

    const user = users().find(u => u.email === email && u.employeeId === employeeId);
    if (!user) return toast("Compte introuvable. Vérifiez email et matricule.", "error");
    if (user.status === "pending") return toast("Votre compte attend l'approbation du Group Leader.", "warning");
    if (user.status !== "approved") return toast(`Accès refusé : ${statusLabel(user.status)}.`, "error");

    saveSession({ userId: user.id, role: user.role, createdAt: new Date().toISOString() });
    toast(`Bienvenue ${user.name}.`);
    window.location.hash = "#dashboard";
    renderUserState();
  }

  function leaderApprove(requestId) {
    const reqs = requests();
    const idx = reqs.findIndex(r => r.id === requestId);
    if (idx < 0) return;
    reqs[idx].status = "approved";
    reqs[idx].approvedBy = config().leaderName;
    reqs[idx].approvedAt = new Date().toISOString();
    saveRequests(reqs);
    const list = users();
    const user = list.find(u => u.id === reqs[idx].userId);
    if (user) { user.status = "approved"; user.approvedAt = reqs[idx].approvedAt; user.approvedBy = reqs[idx].approvedBy; }
    saveUsers(list);
    toast("Compte approuvé.");
    renderLeaderPage();
  }

  function leaderReject(requestId) {
    const reason = prompt("Motif du refus :", "Demande à compléter");
    if (reason === null) return;
    const reqs = requests();
    const idx = reqs.findIndex(r => r.id === requestId);
    if (idx < 0) return;
    reqs[idx].status = "rejected";
    reqs[idx].rejectionReason = reason || "Aucun motif fourni";
    saveRequests(reqs);
    const list = users();
    const user = list.find(u => u.id === reqs[idx].userId);
    if (user) { user.status = "rejected"; user.rejectionReason = reqs[idx].rejectionReason; }
    saveUsers(list);
    toast("Demande refusée.", "warning");
    renderLeaderPage();
  }

  function renderAccountPage() {
    const page = document.getElementById("page-account");
    if (!page) return;
    const u = currentUser();
    const pending = users().find(x => x.status === "pending");
    const body = u ? `<div class="account-status-card"><div class="account-avatar">${(u.name||"U").slice(0,2).toUpperCase()}</div><div><h3>${u.name}</h3><p>${u.email} • ${u.employeeId}</p><span class="account-status ${u.status}">${statusLabel(u.status)}</span></div></div>` : `<div class="auth-grid"><div class="auth-card"><h3>Créer un compte</h3><p>Votre demande doit être approuvée par le Group Leader avant l’accès au système.</p><form id="registerForm" class="auth-form"><label>Nom complet<input name="name" required placeholder="Prénom Nom"></label><label>Email professionnel<input name="email" type="email" required placeholder="prenom.nom@sebn... "></label><label>Matricule / ID<input name="employeeId" required placeholder="PPE-0001"></label><label>Équipe<select name="team"><option>PPE</option><option>Engineering</option><option>Quality</option><option>Production</option></select></label><button class="btn btn-primary" type="submit">Envoyer la demande</button></form></div><div class="auth-card"><h3>Connexion</h3><p>Utilisez votre email professionnel + matricule.</p><form id="loginForm" class="auth-form"><label>Email<input name="email" type="email" required></label><label>Matricule / ID<input name="employeeId" required></label><button class="btn btn-secondary" type="submit">Se connecter</button><hr><h4>Group Leader</h4><label>Code leader<input name="leaderCode" placeholder="Code configuré par l'administrateur"></label><button class="btn btn-primary" type="button" id="leaderLoginBtn">Entrer en mode leader</button></form></div></div>`;
    page.innerHTML = `<div class="page-header"><div><span class="page-label">ACCÈS SÉCURISÉ</span><h2>Compte MUSTER BAW</h2><p>Création de compte avec validation obligatoire par le Group Leader.</p></div>${u ? `<button class="btn btn-secondary" id="logoutBtn">Déconnexion</button>` : ""}</div>${body}`;
    $("#registerForm")?.addEventListener("submit", e => { e.preventDefault(); register(e.currentTarget); });
    $("#loginForm")?.addEventListener("submit", e => { e.preventDefault(); signIn(e.currentTarget); });
    $("#leaderLoginBtn")?.addEventListener("click", () => signIn($("#loginForm")));
    $("#logoutBtn")?.addEventListener("click", logout);
  }

  function renderLeaderPage() {
    const page = document.getElementById("page-leader-approvals");
    if (!page) return;
    const s = session();
    if (s?.role !== "leader") {
      page.innerHTML = `<div class="page-header"><div><span class="page-label">LEADERSHIP</span><h2>Accès Group Leader</h2><p>Connectez-vous avec le code leader configuré.</p></div></div><div class="auth-card"><button class="btn btn-primary" data-page-link="account">Ouvrir l'accès sécurisé</button></div>`;
      return;
    }
    const reqs = requests();
    const pending = reqs.filter(r => r.status === "pending");
    page.innerHTML = `<div class="page-header"><div><span class="page-label">APPROBATIONS</span><h2>Validation des comptes</h2><p>${pending.length} demande(s) en attente.</p></div><span class="ai-status"><span></span>Group Leader</span></div><div class="dashboard-card"><div class="table-container"><table class="data-table"><thead><tr><th>Demandeur</th><th>Email</th><th>Matricule</th><th>Équipe</th><th>Date</th><th>État</th><th>Action</th></tr></thead><tbody>${pending.map(r => `<tr><td><strong>${r.requester.name}</strong></td><td>${r.requester.email}</td><td>${r.requester.employeeId}</td><td>${r.requester.team}</td><td>${new Date(r.requestedAt).toLocaleString("fr-FR")}</td><td><span class="status-badge analysis">En attente</span></td><td><button class="btn btn-small btn-primary" data-approve="${r.id}">Approuver</button> <button class="btn btn-small" data-reject="${r.id}">Refuser</button></td></tr>`).join("") || `<tr><td colspan="7">Aucune demande en attente.</td></tr>`}</tbody></table></div></div>`;
    $$("[data-approve]", page).forEach(b => b.addEventListener("click", () => leaderApprove(b.dataset.approve)));
    $$("[data-reject]", page).forEach(b => b.addEventListener("click", () => leaderReject(b.dataset.reject)));
  }

  function renderUserState() {
    const u = currentUser();
    const profile = document.querySelector(".user-profile");
    if (!profile) return;
    const name = profile.querySelector("strong");
    const sub = profile.querySelector("span");
    if (u) { if(name) name.textContent = u.name; if(sub) sub.textContent = u.team; }
    else { if(name) name.textContent = "Utilisateur PPE"; if(sub) sub.textContent = "Non connecté"; }
  }

  function init() {
    renderUserState();
    window.addEventListener("hashchange", () => {
      const p = location.hash.slice(1);
      if (p === "account") renderAccountPage();
      if (p === "leader-approvals") renderLeaderPage();
      renderUserState();
    });
    if (location.hash.slice(1) === "account") renderAccountPage();
    if (location.hash.slice(1) === "leader-approvals") renderLeaderPage();
  }

  window.MusterAuth = { register, signIn, logout, currentUser, renderAccountPage, renderLeaderPage, leaderApprove, leaderReject, config };
  window.addEventListener("DOMContentLoaded", init);
})();
