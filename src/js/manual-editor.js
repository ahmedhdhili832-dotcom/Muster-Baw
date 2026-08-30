/* MUSTER BAW — Manual Wiring Editor
 * Client-side interactive editor layered on top of the existing SPA.
 */
"use strict";
(() => {
  const $ = (s, p = document) => p.querySelector(s);
  const $$ = (s, p = document) => [...p.querySelectorAll(s)];
  const KEY = "musterManualWires";
  const PIN_KEY = "musterManualPins";
  let selectedStart = null;
  let draftLine = null;

  function rows() { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; } }
  function save(v) { localStorage.setItem(KEY, JSON.stringify(v)); window.dispatchEvent(new CustomEvent("muster:wires-changed")); }
  function esc(v) { return String(v ?? "").replace(/[&<>\"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c])); }
  function uid() { return crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`; }

  function injectCss() {
    if ($("#manualEditorCss")) return;
    const st = document.createElement("style"); st.id = "manualEditorCss";
    st.textContent = `
      .manual-workbench{display:grid;grid-template-columns:minmax(0,1fr) 310px;gap:16px;margin-top:18px}
      .manual-canvas-card{min-height:640px;position:relative;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow-sm);overflow:hidden}
      .manual-canvas-toolbar{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:11px 14px;border-bottom:1px solid var(--border);background:var(--bg-card);position:relative;z-index:4}
      .manual-toolbar-left,.manual-toolbar-right{display:flex;align-items:center;gap:7px;flex-wrap:wrap}.manual-toolbar-label{font-size:9px;color:var(--text-light);font-weight:700;text-transform:uppercase;letter-spacing:.7px}
      .manual-drawing-stage{position:relative;min-height:585px;background:linear-gradient(180deg,#f8fafc,#eef2f7);overflow:hidden}
      body.dark-mode .manual-drawing-stage{background:linear-gradient(180deg,#0b1220,#0a0f1a)}
      .manual-stage-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(37,99,235,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(37,99,235,.07) 1px,transparent 1px);background-size:24px 24px}
      .manual-stage-empty{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:30px;color:var(--text-secondary)}
      .manual-stage-empty i{font-size:38px;color:var(--primary);margin-bottom:12px}.manual-stage-empty h3{font-size:15px;color:var(--text-main)}.manual-stage-empty p{font-size:10px;max-width:430px;line-height:1.7;margin-top:7px}
      .manual-drawing-wrap{position:absolute;inset:18px;display:flex;align-items:center;justify-content:center;overflow:auto}.manual-drawing-wrap img{max-width:none;max-height:none;transform-origin:center;box-shadow:0 8px 26px rgba(15,23,42,.18);background:#fff}
      .manual-drawing-wrap iframe{width:100%;height:100%;border:0;background:#fff;min-height:540px;border-radius:8px}
      .manual-pin-layer{position:absolute;inset:0;pointer-events:none}.manual-pin{position:absolute;transform:translate(-50%,-50%);pointer-events:auto;width:17px;height:17px;border:2px solid #fff;border-radius:50%;background:var(--primary);box-shadow:0 2px 10px rgba(37,99,235,.45);cursor:pointer;z-index:3}.manual-pin:hover{transform:translate(-50%,-50%) scale(1.25)}.manual-pin.selected{background:var(--success);box-shadow:0 0 0 5px rgba(22,163,74,.15)}
      .manual-pin-tag{position:absolute;left:14px;top:-5px;white-space:nowrap;padding:3px 6px;border-radius:5px;background:var(--bg-card);border:1px solid var(--border);color:var(--text-main);font-size:7px;font-weight:800;box-shadow:var(--shadow-sm)}
      .manual-svg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:2}.manual-svg path{fill:none;stroke-width:3;stroke-linecap:round}.manual-svg path.pending{stroke:var(--warning);stroke-dasharray:7 6}
      .manual-side-card{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden}.manual-side-header{padding:15px;border-bottom:1px solid var(--border)}.manual-side-header h3{font-size:12px}.manual-side-header p{font-size:8px;color:var(--text-light);margin-top:4px}
      .manual-pin-list{padding:9px;max-height:380px;overflow:auto}.manual-pin-row{display:flex;align-items:center;gap:9px;padding:9px;border:1px solid transparent;border-radius:9px;cursor:pointer}.manual-pin-row:hover,.manual-pin-row.selected{background:var(--bg-main);border-color:var(--border)}.manual-pin-dot{width:10px;height:10px;border-radius:50%;background:var(--primary);flex:none}.manual-pin-row strong{font-size:9px;display:block}.manual-pin-row small{font-size:7px;color:var(--text-light);display:block;margin-top:2px}
      .manual-toolbox{padding:13px;border-top:1px solid var(--border);display:grid;gap:8px}.manual-toolbox label{font-size:8px;color:var(--text-secondary);font-weight:700}.manual-toolbox input,.manual-toolbox select{width:100%;height:34px;border:1px solid var(--border);border-radius:8px;padding:0 9px;background:var(--bg-main);color:var(--text-main);font-size:9px;outline:none}.manual-toolbox input:focus,.manual-toolbox select:focus{border-color:var(--primary);box-shadow:0 0 0 3px rgba(37,99,235,.08)}
      .manual-connect-status{padding:10px 13px;background:var(--blue-soft);color:var(--primary);font-size:8px;line-height:1.6;border-top:1px solid var(--border)}
      .manual-mini-stat{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;padding:10px}.manual-mini-stat div{padding:9px;background:var(--bg-main);border:1px solid var(--border);border-radius:8px}.manual-mini-stat span{display:block;color:var(--text-light);font-size:7px}.manual-mini-stat strong{display:block;margin-top:3px;font-size:14px}
      .manual-floating-tools{position:absolute;right:12px;top:12px;display:flex;gap:6px;z-index:5}.manual-floating-tools .btn{backdrop-filter:blur(8px)}
      @media(max-width:1050px){.manual-workbench{grid-template-columns:1fr}.manual-side-card{display:grid;grid-template-columns:1fr 1fr}.manual-side-header,.manual-connect-status{grid-column:1/-1}.manual-pin-list{max-height:260px}}
      @media(max-width:700px){.manual-workbench{gap:10px}.manual-drawing-stage{min-height:480px}.manual-side-card{display:block}.manual-side-header,.manual-connect-status{grid-column:auto}.manual-pin-list{max-height:220px}.manual-canvas-toolbar{align-items:flex-start;flex-direction:column}}
    `; document.head.appendChild(st);
  }

  function getDrawingFile() { return window.MusterReliableScanner?.getFile?.() || window.MusterDrawingFile || null; }
  function mountDrawing(stage, wrap) {
    const file = getDrawingFile();
    if (!file) return false;
    wrap.innerHTML = "";
    const url = URL.createObjectURL(file);
    if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) {
      const iframe = document.createElement("iframe"); iframe.src = `${url}#toolbar=1&navpanes=0&view=FitH`; iframe.title = file.name; wrap.appendChild(iframe);
    } else {
      const img = document.createElement("img"); img.src = url; img.alt = file.name; img.id = "manualDrawingImage"; wrap.appendChild(img);
      img.addEventListener("load", () => { addDrawingPins(stage, img); });
    }
    return true;
  }
  function addDrawingPins(stage, img) {
    const layer = $(".manual-pin-layer", stage); if (!layer) return;
    layer.innerHTML = "";
    const pins = getPins();
    pins.forEach(pin => createPin(stage, layer, pin));
    renderWires(stage);
  }
  function getPins() { try { return JSON.parse(localStorage.getItem(PIN_KEY) || "[]"); } catch { return []; } }
  function savePins(pins) { localStorage.setItem(PIN_KEY, JSON.stringify(pins)); }
  function seedPins() {
    const pins = getPins(); if (pins.length) return pins;
    const seed = [
      {id:uid(), connector:"CON-A12", pin:"A1", x:34, y:39, label:"CON-A12 • A1"},
      {id:uid(), connector:"CON-A12", pin:"A2", x:34, y:52, label:"CON-A12 • A2"},
      {id:uid(), connector:"CON-B07", pin:"B1", x:69, y:42, label:"CON-B07 • B1"},
      {id:uid(), connector:"CON-B07", pin:"B2", x:69, y:56, label:"CON-B07 • B2"}
    ]; savePins(seed); return seed;
  }
  function createPin(stage, layer, pin) {
    const el = document.createElement("button"); el.type = "button"; el.className = "manual-pin"; el.style.left = `${pin.x}%`; el.style.top = `${pin.y}%`; el.dataset.pinId = pin.id; el.title = `${pin.connector} • ${pin.pin}`;
    el.innerHTML = `<span class="manual-pin-tag">${esc(pin.connector)} · ${esc(pin.pin)}</span>`;
    el.addEventListener("click", e => { e.stopPropagation(); selectPin(pin, el, stage); }); layer.appendChild(el);
  }
  function selectPin(pin, el, stage) {
    $$(".manual-pin", stage).forEach(x => x.classList.remove("selected")); el.classList.add("selected");
    if (!selectedStart) { selectedStart = pin; setStatus(`Départ sélectionné : ${pin.connector} / ${pin.pin}. Cliquez sur un deuxième Pin.`); drawDraft(stage, pin); return; }
    if (selectedStart.id === pin.id) { selectedStart = null; removeDraft(); setStatus("Sélection annulée."); return; }
    const form = $("#manualForm"); if (!form) return;
    form.wire.value = `W-${String(rows().length + 1).padStart(3,"0")}`;
    form.connector.value = `${selectedStart.connector} → ${pin.connector}`;
    form.pin.value = `${selectedStart.pin} → ${pin.pin}`;
    form.dataset.fromPin = selectedStart.id; form.dataset.toPin = pin.id;
    selectedStart = null; removeDraft(); $$(".manual-pin", stage).forEach(x => x.classList.remove("selected"));
    form.scrollIntoView({behavior:"smooth",block:"center"}); setStatus("Relation préparée : complétez couleur, section et longueur puis cliquez sur Ajouter.");
  }
  function setStatus(t) { const el = $("#manualEditorStatus"); if (el) el.textContent = t; }
  function drawDraft(stage, pin) {
    const svg = $(".manual-svg", stage); const pinEl = $(`.manual-pin[data-pin-id="${CSS.escape(pin.id)}"]`, stage); if (!svg || !pinEl) return;
    const b = stage.getBoundingClientRect(), p = pinEl.getBoundingClientRect(); const x = p.left - b.left + p.width/2, y = p.top - b.top + p.height/2;
    removeDraft(); draftLine = document.createElementNS("http://www.w3.org/2000/svg","path"); draftLine.classList.add("pending"); draftLine.setAttribute("d", `M ${x} ${y} L ${x+90} ${y+10}`); svg.appendChild(draftLine);
  }
  function removeDraft(){draftLine?.remove();draftLine=null;}
  function renderWires(stage) {
    const svg = $(".manual-svg", stage); if (!svg) return; svg.innerHTML = "";
    const pinMap = Object.fromEntries(getPins().map(p => [p.id,p]));
    rows().forEach((r,i) => { if (!r.fromPin || !r.toPin || !pinMap[r.fromPin] || !pinMap[r.toPin]) return; const a=pinMap[r.fromPin],b=pinMap[r.toPin]; const p1=$(`.manual-pin[data-pin-id="${CSS.escape(a.id)}"]`,stage),p2=$(`.manual-pin[data-pin-id="${CSS.escape(b.id)}"]`,stage); if(!p1||!p2)return; const root=stage.getBoundingClientRect(),ra=p1.getBoundingClientRect(),rb=p2.getBoundingClientRect(); const x1=ra.left-root.left+8,y1=ra.top-root.top+8,x2=rb.left-root.left+8,y2=rb.top-root.top+8; const mid=(x1+x2)/2; const path=document.createElementNS("http://www.w3.org/2000/svg","path"); path.setAttribute("d",`M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`); path.style.stroke = wireColor(r.color); path.title=`${r.wire} • ${r.color}`; svg.appendChild(path); });
  }
  function wireColor(v){ const s=String(v||"").toUpperCase(); if(s.includes("RD")||s.includes("ROUGE"))return "#ef4444"; if(s.includes("BK")||s.includes("NOIR"))return "#111827"; if(s.includes("BU")||s.includes("BLUE"))return "#2563eb"; if(s.includes("GN")||s.includes("GREEN"))return "#16a34a"; if(s.includes("YE")||s.includes("JAUNE"))return "#eab308"; if(s.includes("WH")||s.includes("BLANC"))return "#94a3b8"; return "#7c3aed"; }

  function renderPinList(root) {
    const list = $("#manualPinList", root), pins = seedPins(); if (!list) return;
    list.innerHTML = pins.map(p => `<div class="manual-pin-row" data-pin-id="${p.id}"><span class="manual-pin-dot"></span><div><strong>${esc(p.connector)} • ${esc(p.pin)}</strong><small>${esc(p.label || "Cavité")}</small></div></div>`).join("");
    $$(".manual-pin-row", list).forEach(row => row.addEventListener("click", () => { const pin=pins.find(x=>x.id===row.dataset.pinId); const stage=$("#manualDrawingStage"); const el=$(`.manual-pin[data-pin-id="${CSS.escape(pin.id)}"]`,stage); if(pin&&el) selectPin(pin,el,stage); }));
  }

  function mount() {
    const page = $("#page-manual-analysis"); if (!page || !page.classList.contains("active") || $("#manualWorkbench", page)) return;
    injectCss();
    const work = document.createElement("div"); work.id="manualWorkbench"; work.className="manual-workbench";
    work.innerHTML = `<div class="manual-canvas-card"><div class="manual-canvas-toolbar"><div class="manual-toolbar-left"><span class="manual-toolbar-label">Drawing / Wiring Editor</span><span id="manualEditorStatus" class="ai-status"><span></span>Sélectionnez un Pin de départ</span></div><div class="manual-toolbar-right"><button class="btn btn-small" id="manualLoadDrawing"><i class="fa-solid fa-file-import"></i>Charger le Drawing</button><button class="btn btn-small" id="manualFitDrawing"><i class="fa-solid fa-expand"></i>Ajuster</button></div></div><div class="manual-drawing-stage" id="manualDrawingStage"><div class="manual-stage-grid"></div><div class="manual-drawing-wrap" id="manualDrawingWrap"></div><svg class="manual-svg" aria-hidden="true"></svg><div class="manual-pin-layer"></div><div class="manual-stage-empty" id="manualStageEmpty"><i class="fa-solid fa-draw-polygon"></i><h3>Aucun Drawing actif</h3><p>Importez d'abord un PDF ou une image dans « Scanner le Drawing », puis revenez ici pour construire les relations de câblage.</p></div></div><div class="manual-mini-stat"><div><span>Fils</span><strong id="editorWireCount">0</strong></div><div><span>Connecteurs</span><strong id="editorConnectorCount">0</strong></div><div><span>Validés</span><strong id="editorValidatedCount">0</strong></div></div></div><aside class="manual-side-card"><div class="manual-side-header"><h3>Connecteurs & Pins</h3><p>Cliquez sur un Pin puis sur son Pin destination.</p></div><div id="manualPinList" class="manual-pin-list"></div><div class="manual-toolbox"><label>Créer un Pin de repérage</label><input id="newPinConnector" placeholder="Connecteur · ex. CON-C03"><input id="newPinNumber" placeholder="Pin / Cavité · ex. C1"><div style="display:grid;grid-template-columns:1fr 1fr;gap:7px"><input id="newPinX" type="number" min="2" max="98" placeholder="X %"><input id="newPinY" type="number" min="2" max="98" placeholder="Y %"></div><button class="btn btn-primary" id="addManualPin"><i class="fa-solid fa-location-dot"></i>Placer le Pin</button></div><div id="manualEditorHelp" class="manual-connect-status"><strong>Mode connexion :</strong> choisissez deux Pins pour préparer automatiquement le Wire dans le formulaire ci-dessus.</div></aside></div>`;
    const tableCard = $(`#manualTableBody`, page)?.closest(".dashboard-card"); page.insertBefore(work, tableCard || null);
    renderPinList(page);
    const stage=$("#manualDrawingStage",work), wrap=$("#manualDrawingWrap",work), empty=$("#manualStageEmpty",work);
    const hasDrawing = mountDrawing(stage,wrap); empty.hidden=hasDrawing;
    updateStats();
    $("#manualLoadDrawing",work).onclick=()=>{ const ok=mountDrawing(stage,wrap); empty.hidden=ok; if(!ok) setStatus("Aucun Drawing chargé. Ouvrez Scanner le Drawing et importez un fichier.",); };
    $("#manualFitDrawing",work).onclick=()=>{const img=$("#manualDrawingImage",wrap);if(img)img.style.maxWidth="100%",img.style.maxHeight="540px"};
    $("#addManualPin",work).onclick=()=>{const connector=$("#newPinConnector",work).value.trim(),pin=$("#newPinNumber",work).value.trim(),x=Number($("#newPinX",work).value),y=Number($("#newPinY",work).value);if(!connector||!pin||!(x>1&&x<99)||!(y>1&&y<99))return setStatus("Renseignez Connecteur, Pin et X/Y valides.");const all=getPins();const p={id:uid(),connector,pin,x,y,label:`${connector} • ${pin}`};all.push(p);savePins(all);renderPinList(page);addDrawingPins(stage,$("#manualDrawingImage",stage));setStatus(`Pin ${connector} / ${pin} ajouté.`);};
    window.addEventListener("muster:wires-changed",()=>{updateStats();renderWires(stage);});
    window.dispatchEvent(new CustomEvent("muster:manual-mounted"));
  }
  function updateStats(){const rs=rows();const a=$("#editorWireCount"),b=$("#editorConnectorCount"),c=$("#editorValidatedCount");if(a)a.textContent=rs.length;if(b)b.textContent=new Set(rs.map(r=>r.connector)).size;if(c)c.textContent=rs.filter(r=>r.validated).length;}
  const observer=new MutationObserver(()=>{if($("#page-manual-analysis")?.classList.contains("active"))mount();});
  document.addEventListener("DOMContentLoaded",()=>{observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:["class"]});if($("#page-manual-analysis")?.classList.contains("active"))mount();});
  window.MusterManualEditor={mount,refresh:()=>{const stage=$("#manualDrawingStage");if(stage){renderPinList($("#page-manual-analysis"));renderWires(stage);updateStats();}}};
})();