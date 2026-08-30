/* MUSTER BAW — Vision AI → Manual Wiring bridge */
"use strict";
(() => {
  const AI_KEY="musterLastAiAnalysis", PIN_KEY="musterManualPins";
  const $=(s,p=document)=>p.querySelector(s);
  const esc=v=>String(v??"").replace(/[&<>\"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  const readPins=()=>{try{return JSON.parse(localStorage.getItem(PIN_KEY)||"[]")}catch{return[]}};
  const readAI=()=>{try{return JSON.parse(localStorage.getItem(AI_KEY)||"null")}catch{return null}};
  const uid=()=>crypto.randomUUID?.()||`${Date.now()}-${Math.random().toString(16).slice(2)}`;
  function position(location,cx,cy){const m=String(location||"").match(/(?:x\s*[=:]\s*)?(\d+(?:\.\d+)?)\s*[,;x×]\s*(?:y\s*[=:]\s*)?(\d+(?:\.\d+)?)/i);return m?{x:Math.min(96,Math.max(4,+m[1])),y:Math.min(96,Math.max(4,+m[2]))}:{x:cx,y:cy};}
  function promote(){
    const ai=readAI(), r=ai?.result; if(!r||!Array.isArray(r.connectors)||!r.connectors.length)return false;
    const file=ai.file||localStorage.getItem("musterLastDrawingFile")||"Drawing", old=readPins(), generated=[];
    r.connectors.forEach((c,ci)=>{
      const ps=Array.isArray(c.pins)?c.pins:[], angle=2*Math.PI*ci/Math.max(1,r.connectors.length)-Math.PI/2;
      const cx=50+Math.cos(angle)*34, cy=50+Math.sin(angle)*30;
      ps.forEach((p,pi)=>{const y=Math.min(94,Math.max(6,cy+(pi-(ps.length-1)/2)*Math.min(18,Math.max(7,ps.length*1.7)))),q=position(c.location,cx,y);generated.push({id:`AI-${uid()}`,source:"vision-ai",drawing:file,connector:String(c.reference||"UNKNOWN"),connectorType:String(c.type||"unknown"),pin:String(p||"unknown"),location:String(c.location||"unknown"),confidence:Number(c.confidence)||0,x:q.x,y:q.y,label:`${c.reference||"UNKNOWN"} • ${p||"unknown"}`})});
    });
    const manualOnly=old.filter(p=>p?.source!=="vision-ai"||p?.drawing!==file);
    localStorage.setItem(PIN_KEY,JSON.stringify([...manualOnly,...generated]));
    localStorage.setItem("musterManualSource",JSON.stringify({source:"vision-ai",file,updatedAt:new Date().toISOString(),connectors:r.connectors.length,pins:generated.length,confidence:r.confidence??null}));
    window.dispatchEvent(new CustomEvent("muster:vision-ready",{detail:{file,connectors:r.connectors.length,pins:generated.length}})); return true;
  }
  function refreshPins(){
    const page=$("#page-manual-analysis"); if(!page||!page.classList.contains("active"))return;
    const pins=readPins(), list=$("#manualPinList",page), layer=$(".manual-pin-layer",page); if(!list||!layer)return;
    layer.innerHTML="";
    pins.forEach(p=>{const el=document.createElement("button");el.type="button";el.className="manual-pin";el.dataset.pinId=p.id;el.style.left=`${p.x}%`;el.style.top=`${p.y}%`;el.title=`${p.connector} • ${p.pin} (${Math.round((p.confidence||0)*100)}%)`;el.innerHTML=`<span class="manual-pin-tag">${esc(p.connector)} · ${esc(p.pin)}</span>`;el.addEventListener("click",()=>selectPin(p.id));layer.appendChild(el)});
    list.innerHTML=pins.map(p=>`<div class="manual-pin-row" data-ai-pin="${esc(p.id)}"><span class="manual-pin-dot"></span><div><strong>${esc(p.connector)} • ${esc(p.pin)}</strong><small>${esc(p.connectorType||"Connector")} · ${Math.round((p.confidence||0)*100)}% · ${esc(p.location)}</small></div></div>`).join("")||`<div style="padding:12px;color:var(--text-light);font-size:8px">Aucun Pin détecté.</div>`;
    list.querySelectorAll("[data-ai-pin]").forEach(row=>row.addEventListener("click",()=>selectPin(row.dataset.aiPin)));
    const meta=(()=>{try{return JSON.parse(localStorage.getItem("musterManualSource")||"null")}catch{return null}})(),status=$("#manualEditorStatus",page);if(meta&&status)status.innerHTML=`<span></span>Vision AI : ${meta.connectors} connecteur(s), ${meta.pins} pin(s) — ${esc(meta.file)}`;
  }
  function selectPin(id){
    const page=$("#page-manual-analysis"),form=$("#manualForm",page),pin=readPins().find(p=>p.id===id);if(!form||!pin)return;
    document.querySelectorAll(".manual-pin",page).forEach(x=>x.classList.remove("selected"));page.querySelector(`.manual-pin[data-pin-id="${CSS.escape(id)}"]`)?.classList.add("selected");
    const fromId=form.dataset.fromPin;
    if(!fromId){form.dataset.fromPin=id;form.querySelector('[name="connector"]').value=pin.connector;form.querySelector('[name="pin"]').value=pin.pin;return;}
    if(fromId===id){form.dataset.fromPin="";form.dataset.toPin="";return;}
    const from=readPins().find(p=>p.id===fromId);if(!from)return;
    form.dataset.toPin=id;form.wire.value=`W-${String(readManualRows().length+1).padStart(3,"0")}`;form.connector.value=`${from.connector} → ${pin.connector}`;form.pin.value=`${from.pin} → ${pin.pin}`;
    const status=$("#manualEditorStatus",page);if(status)status.innerHTML=`<span></span>Relation prête : ${esc(from.connector)}/${esc(from.pin)} → ${esc(pin.connector)}/${esc(pin.pin)}. Complétez les propriétés du fil.`;
    document.querySelectorAll(".manual-pin",page).forEach(x=>x.classList.remove("selected"));
  }
  function readManualRows(){try{return JSON.parse(localStorage.getItem("musterManualWires")||"[]")}catch{return[]}}
  function observe(){const page=$("#page-manual-analysis");if(!page||!page.classList.contains("active"))return;promote();refreshPins()}
  window.MusterAiManualBridge={promote,refreshPins};
  window.addEventListener("muster:vision-ready",refreshPins);
  window.addEventListener("storage",e=>{if(e.key===AI_KEY||e.key===PIN_KEY)setTimeout(observe,50)});
  document.addEventListener("DOMContentLoaded",()=>{setTimeout(observe,180);new MutationObserver(()=>setTimeout(observe,80)).observe(document.body,{attributes:true,attributeFilter:["class"],subtree:true})});
})();
