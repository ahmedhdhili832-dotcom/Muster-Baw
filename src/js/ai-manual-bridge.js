/* MUSTER BAW — Vision AI → Manual Wiring bridge
 * Promotes the latest Vision AI result into the interactive manual editor.
 */
"use strict";
(() => {
  const AI_KEY = "musterLastAiAnalysis";
  const PIN_KEY = "musterManualPins";
  const $ = (s, p=document) => p.querySelector(s);
  const esc = v => String(v ?? "").replace(/[&<>\"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));

  function readAI(){
    try { return JSON.parse(localStorage.getItem(AI_KEY) || "null"); } catch { return null; }
  }
  function uid(){ return crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
  function pctFromLocation(location, fallbackX, fallbackY){
    const s = String(location || "");
    const pair = s.match(/(?:x\s*[=:]\s*)?(\d{1,3}(?:\.\d+)?)\s*[,;x×]\s*(?:y\s*[=:]\s*)?(\d{1,3}(?:\.\d+)?)/i);
    if (pair) return {x:Math.min(96,Math.max(4,Number(pair[1]))), y:Math.min(96,Math.max(4,Number(pair[2])))};
    return {x:fallbackX,y:fallbackY};
  }
  function promote(){
    const ai = readAI();
    const result = ai?.result;
    if (!result || !Array.isArray(result.connectors) || !result.connectors.length) return false;

    const currentFile = ai.file || localStorage.getItem("musterLastDrawingFile") || "Drawing";
    const previous = (() => { try { return JSON.parse(localStorage.getItem(PIN_KEY) || "[]"); } catch { return []; } })();
    const manualPins = [];
    let index = 0;

    result.connectors.forEach((connector, cIndex) => {
      const pins = Array.isArray(connector.pins) ? connector.pins : [];
      const angle = (Math.PI * 2 * cIndex / Math.max(1,result.connectors.length)) - Math.PI / 2;
      const cx = connector.location ? 50 + Math.cos(angle) * 34 : 24 + (cIndex % 3) * 26;
      const cy = connector.location ? 50 + Math.sin(angle) * 30 : 28 + Math.floor(cIndex / 3) * 28;
      pins.forEach((pinName, pinIndex) => {
        const spread = Math.min(18, Math.max(7, pins.length * 1.7));
        const y = Math.min(94, Math.max(6, cy + (pinIndex - (pins.length-1)/2) * spread));
        const p = pctFromLocation(connector.location, cx, y);
        manualPins.push({
          id:`AI-${uid()}`,
          source:"vision-ai",
          drawing:currentFile,
          connector:String(connector.reference || "UNKNOWN"),
          connectorType:String(connector.type || "unknown"),
          pin:String(pinName || "unknown"),
          location:String(connector.location || "unknown"),
          confidence:Number(connector.confidence) || 0,
          x:p.x, y:p.y,
          label:`${connector.reference || "UNKNOWN"} • ${pinName || "unknown"}`
        });
        index++;
      });
    });

    // Preserve manually created pins, but replace the previous AI-generated set for this Drawing.
    const manualOnly = previous.filter(p => p?.source !== "vision-ai" || p?.drawing !== currentFile);
    localStorage.setItem(PIN_KEY, JSON.stringify([...manualOnly, ...manualPins]));
    localStorage.setItem("musterManualSource", JSON.stringify({source:"vision-ai", file:currentFile, updatedAt:new Date().toISOString(), connectors:result.connectors.length, pins:index, confidence:result.confidence ?? null}));
    window.dispatchEvent(new CustomEvent("muster:vision-ready", {detail:{file:currentFile,connectors:result.connectors.length,pins:index}}));
    return true;
  }

  function renderSourceBadge(root){
    const host = $("#manualEditorStatus", root);
    const meta = (() => { try{return JSON.parse(localStorage.getItem("musterManualSource")||"null")}catch{return null} })();
    if (!host || !meta) return;
    host.innerHTML = `<span></span>Vision AI : ${esc(meta.connectors)} connecteur(s), ${esc(meta.pins)} pin(s) — ${esc(meta.file)}`;
  }

  function refreshPins(){
    const page = $("#page-manual-analysis");
    if (!page || !page.classList.contains("active")) return;
    const pins = (()=>{try{return JSON.parse(localStorage.getItem(PIN_KEY)||"[]")}catch{return[]}})();
    const list = $("#manualPinList", page);
    const layer = $(".manual-pin-layer", page);
    if (!list || !layer) return;
    const existingIds = new Set([...layer.querySelectorAll(".manual-pin")].map(x=>x.dataset.pinId));
    layer.innerHTML = "";
    pins.forEach(pin => {
      const el = document.createElement("button");
      el.type = "button"; el.className = "manual-pin"; el.dataset.pinId = pin.id;
      el.style.left = `${pin.x}%`; el.style.top = `${pin.y}%`;
      el.title = `${pin.connector} • ${pin.pin} (${Math.round((pin.confidence||0)*100)}%)`;
      el.innerHTML = `<span class="manual-pin-tag">${esc(pin.connector)} · ${esc(pin.pin)}</span>`;
      el.addEventListener("click", () => selectById(pin.id));
      layer.appendChild(el);
    });
    list.innerHTML = pins.map(pin => `<div class="manual-pin-row" data-ai-pin="${esc(pin.id)}"><span class="manual-pin-dot"></span><div><strong>${esc(pin.connector)} • ${esc(pin.pin)}</strong><small>${esc(pin.connectorType || "Connector")} · ${Math.round((pin.confidence||0)*100)}% · ${esc(pin.location)}</small></div></div>`).join("") || `<div style="padding:12px;color:var(--text-light);font-size:8px">Aucun Pin détecté.</div>`;
    list.querySelectorAll("[data-ai-pin]").forEach(row => row.addEventListener("click", () => selectById(row.dataset.aiPin)));
    renderSourceBadge(page);
  }

  function selectById(id){
    const stage = $("#manualDrawingStage");
    const pin = (()=>{try{return JSON.parse(localStorage.getItem(PIN_KEY)||"[]").find(x=>x.id===id)}catch{return null}})();
    if (!stage || !pin) return;
    const form = $("#manualForm");
    if (!form) return;
    const selected = stage.querySelectorAll(".manual-pin"); selected.forEach(x=>x.classList.remove("selected"));
    const el = stage.querySelector(`.manual-pin[data-pin-id="${CSS.escape(id)}"]`); el?.classList.add("selected");
    const current = form.dataset.fromAiPin;
    if (!current) {
      form.dataset.fromAiPin = id;
      form.dataset.fromPin = id;
      form.querySelector('[name="connector"]')?.setAttribute("value", pin.connector);
      form.connector.value = pin.connector;
      form.pin.value = pin.pin;
      const status=$("#manualEditorStatus",page); if(status)status.innerHTML=`<span></span>Départ IA sélectionné : ${esc(pin.connector)} / ${esc(pin.pin)} — choisissez le Pin destination.`;
      return;
    }
    if (current === id) return;
    const to = pin;
    form.dataset.toPin = id;
    const from = (()=>{try{return JSON.parse(localStorage.getItem(PIN_KEY)||"[]").find(x=>x.id===current)}catch{return null}})();
    if (!from) { form.dataset.fromAiPin=""; return; }
    form.wire.value = `W-${String((JSON.parse(localStorage.getItem("musterManualWires")||"[]").length)+1).padStart(3,"0")}`;
    form.connector.value = `${from.connector} → ${to.connector}`;
    form.pin.value = `${from.pin} → ${to.pin}`;
    form.dataset.fromPin=from.id; form.dataset.toPin=to.id; form.dataset.fromAiPin="";
    const status=$("#manualEditorStatus",page); if(status)status.innerHTML=`<span></span>Relation IA préparée : ${esc(from.connector)} / ${esc(from.pin)} → ${esc(to.connector)} / ${esc(to.pin)}`;
  }

  function observe(){
    const page=$("#page-manual-analysis");
    if(!page || !page.classList.contains("active")) return;
    if (!promote()) {
      refreshPins();
      return;
    }
    refreshPins();
  }

  window.MusterAiManualBridge={promote,refreshPins};
  window.addEventListener("muster:vision-ready", refreshPins);
  window.addEventListener("storage", e => { if(e.key===AI_KEY || e.key===PIN_KEY) setTimeout(observe,50); });
  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(observe, 150);
    new MutationObserver(() => setTimeout(observe,60)).observe(document.body,{attributes:true,attributeFilter:["class"],subtree:true});
  });
})();
