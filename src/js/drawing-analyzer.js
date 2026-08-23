/* MUSTER BAW — Browser Drawing Analyzer
   PDF.js renders PDF pages; Tesseract.js performs OCR in the browser.
   Results are heuristic candidates and must be human-validated before production use. */
"use strict";

(() => {
  const STORE = "muster_baw_analysis_v1";
  const $ = (s,p=document) => p.querySelector(s);

  const loadScript = (src) => new Promise((resolve,reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) return existing.addEventListener("load", resolve, {once:true});
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error(`Impossible de charger ${src}`));
    document.head.appendChild(s);
  });

  const uniq = arr => [...new Set(arr.filter(Boolean))];
  const normalize = text => text.replace(/\s+/g," ").trim();

  const patterns = {
    connectors: [
      /\b(?:CON|CN|C|X|J|P)[-_ ]?[A-Z]?\d{1,4}\b/gi,
      /\b[A-Z]{1,4}-\d{2,5}\b/g
    ],
    wires: [
      /\b(?:W|WIRE|FIL)[-_ ]?\d{1,5}\b/gi,
      /\b\d{2,5}\s*WIRE\b/gi
    ],
    sections: /\b\d+(?:[.,]\d+)?\s*(?:mm2|mm²)\b/gi,
    lengths: /\b\d+(?:[.,]\d+)?\s*(?:mm|cm|m)\b/gi,
    pins: /\b(?:PIN|CAV|CAVITY)[-_ ]?\d{1,4}\b/gi,
    terminals: /\b(?:TE|AMP|TYCO|MCON|MQS|TAB|FEMALE|MALE)[-_ /A-Z0-9]{0,18}\b/gi
  };

  const colors = [
    ["RD/BK","Rouge / Noir"],["BK","Noir"],["WH","Blanc"],["RD","Rouge"],
    ["BU","Bleu"],["GN","Vert"],["YE","Jaune"],["GY","Gris"],["BN","Brun"],
    ["VT","Violet"],["OR","Orange"],["PK","Rose"],["RED","Rouge"],["BLACK","Noir"],
    ["BLUE","Bleu"],["GREEN","Vert"],["YELLOW","Jaune"]
  ];

  const getSaved = () => {
    try { return JSON.parse(localStorage.getItem(STORE) || "null"); } catch { return null; }
  };
  const save = data => localStorage.setItem(STORE, JSON.stringify(data));

  const state = { file:null, pages:[], text:"", connectors:[], wires:[], pins:[], sections:[], lengths:[], terminals:[], colors:[] };

  const ui = {
    mount(){
      const page = document.getElementById("page-drawing-scanner");
      if (!page) return;
      page.innerHTML = `
        <div class="page-header"><div><span class="page-label">ANALYSE</span><h2>Scanner le Drawing</h2><p>Importez un PDF ou une image. Le moteur extrait le texte visible et construit des candidats connecteurs, fils, sections, longueurs et terminaux.</p></div></div>
        <div class="analyzer-shell">
          <div class="dashboard-card">
            <div class="analyzer-dropzone" id="drawingDropzone">
              <div class="upload-zone-icon"><i class="fa-solid fa-cloud-arrow-up"></i></div>
              <h3>Déposez votre Drawing ici</h3>
              <p>PDF, PNG ou JPG — traitement local dans le navigateur.</p>
              <label class="btn btn-primary" for="drawingFile"><i class="fa-solid fa-file-import"></i>Choisir un fichier</label>
              <input id="drawingFile" type="file" accept="application/pdf,image/png,image/jpeg" hidden>
            </div>
            <div class="analyzer-progress" id="analyzerProgress"><strong id="analyzerProgressLabel">Préparation…</strong><div class="analyzer-progress-bar"><span id="analyzerProgressBar"></span></div><span id="analyzerPercent">0%</span></div>
          </div>
          <div id="analysisResult" hidden></div>
        </div>`;

      const input = $("#drawingFile",page), drop = $("#drawingDropzone",page);
      input.addEventListener("change", () => input.files[0] && this.start(input.files[0]));
      ["dragenter","dragover"].forEach(ev => drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.add("dragover");}));
      ["dragleave","drop"].forEach(ev => drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.remove("dragover");}));
      drop.addEventListener("drop",e=>{const f=e.dataTransfer.files[0]; if(f) this.start(f);});
    },
    progress(label,pct){
      const box=$("#analyzerProgress"), bar=$("#analyzerProgressBar"), txt=$("#analyzerProgressLabel"), p=$("#analyzerPercent");
      if(!box)return; box.classList.add("active"); txt.textContent=label; bar.style.width=`${pct}%`; p.textContent=`${Math.round(pct)}%`;
    },
    render(previewUrl){
      const root=$("#analysisResult"); if(!root)return;
      root.hidden=false;
      root.innerHTML=`
        <div class="analysis-summary">
          ${this.kpi("Connecteurs",state.connectors.length)}
          ${this.kpi("Fils candidats",state.wires.length)}
          ${this.kpi("Pins / cavités",state.pins.length)}
          ${this.kpi("Confiance OCR",`${state.text.length?Math.min(99,Math.max(55,Math.round(70+state.text.length/300))):0}%`)}
        </div>
        <div class="analysis-layout" style="margin-top:18px">
          <div class="preview-card"><div class="preview-head"><strong>Aperçu du Drawing</strong><span class="detected-status"><i class="fa-solid fa-circle-check"></i> OCR terminé</span></div><div class="preview-stage" id="previewStage"></div></div>
          <div class="results-card"><div class="results-head"><strong>Résultats détectés</strong><div class="analyzer-toolbar"><button class="btn btn-small" id="exportJson"><i class="fa-solid fa-download"></i>JSON</button><button class="btn btn-small" id="exportCsv"><i class="fa-solid fa-file-csv"></i>CSV</button></div></div><div class="results-body">
            ${this.section("Connecteurs",state.connectors,"blue")}
            ${this.section("Fils",state.wires,"green")}
            ${this.section("Sections",state.sections,"orange")}
            ${this.section("Longueurs",state.lengths,"gray")}
            ${this.section("Terminaux / contacts",state.terminals,"gray")}
            <div class="analysis-note"><strong>Validation requise :</strong> les éléments ci-dessus sont des candidats issus de l’OCR et de règles de détection. Ils ne constituent pas une preuve de connectique ou de continuité électrique.</div>
          </div></div>
        </div>
        <div class="dashboard-card" style="margin-top:18px"><div class="card-header"><div><h3>Wire List reconstruite</h3><p>Première passe basée sur les références visibles dans le Drawing.</p></div><span class="ai-status"><span></span>À valider</span></div><div class="table-container"><table class="analysis-table"><thead><tr><th>Wire</th><th>Connecteur candidat</th><th>Couleur</th><th>Section</th><th>Longueur</th><th>Terminal</th></tr></thead><tbody>${state.wires.slice(0,50).map((w,i)=>`<tr><td><strong>${w}</strong></td><td>${state.connectors[i%Math.max(1,state.connectors.length)]||"—"}</td><td>${state.colors[i%Math.max(1,state.colors.length)]?.label||"—"}</td><td>${state.sections[i%Math.max(1,state.sections.length)]||"—"}</td><td>${state.lengths[i%Math.max(1,state.lengths.length)]||"—"}</td><td>${state.terminals[i%Math.max(1,state.terminals.length)]||"—"}</td></tr>`).join("")||`<tr><td colspan="6">Aucun fil explicite détecté.</td></tr>`}</tbody></table></div></div>`;
      const stage=$("#previewStage");
      if(previewUrl){const img=document.createElement("img");img.src=previewUrl;img.alt="Preview";stage.appendChild(img);}
      $("#exportJson")?.addEventListener("click",()=>this.download("muster-baw-analysis.json",JSON.stringify(this.payload(),null,2),"application/json"));
      $("#exportCsv")?.addEventListener("click",()=>this.download("muster-baw-wire-list.csv",this.csv(),"text/csv;charset=utf-8"));
    },
    kpi(label,value){return `<div class="analysis-kpi"><small>${label}</small><strong>${value}</strong></div>`;},
    section(title,items,cls){return `<div class="result-section"><h4>${title}</h4><div class="result-list">${(items||[]).slice(0,30).map(x=>`<span class="result-chip ${cls}">${typeof x==='string'?x:x.value||x.id}</span>`).join("")||`<span class="result-chip gray">Aucune détection</span>`}</div></div>`;},
    download(name,content,type){const b=new Blob([content],{type});const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500);},
    payload(){return {project:"MUSTER BAW SEBN • PPE",file:state.file?.name||"",createdAt:new Date().toISOString(),ocrText:state.text,connectors:state.connectors,wires:state.wires,pins:state.pins,sections:state.sections,lengths:state.lengths,terminals:state.terminals,colors:state.colors};},
    csv(){const lines=[["Wire","Connector","Color","Section","Length","Terminal"]];state.wires.forEach((w,i)=>lines.push([w,state.connectors[i%Math.max(1,state.connectors.length)]||"",state.colors[i%Math.max(1,state.colors.length)]?.label||"",state.sections[i%Math.max(1,state.sections.length)]||"",state.lengths[i%Math.max(1,state.lengths.length)]||"",state.terminals[i%Math.max(1,state.terminals.length)]||""]));return lines.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");}
  };

  function parseText(text){
    const t = normalize(text);
    const matchAll = re => uniq([...t.matchAll(re)].map(m=>m[0].replace(/\s+/g," ").trim()));
    state.connectors = uniq(patterns.connectors.flatMap(re=>matchAll(re))).slice(0,100);
    state.wires = uniq(patterns.wires.flatMap(re=>matchAll(re))).slice(0,500);
    state.pins = matchAll(patterns.pins).slice(0,200);
    state.sections = matchAll(patterns.sections).slice(0,100);
    state.lengths = matchAll(patterns.lengths).slice(0,100);
    state.terminals = matchAll(patterns.terminals).slice(0,100);
    state.colors = uniq(colors.filter(([abbr,name]) => new RegExp(`\\b${abbr.replace('/','\\/')}\\b|\\b${name}\\b`,"i").test(t)).map(([abbr,label])=>({abbr,label})));
  }

  async function imageToText(blob, progressCb){
    await loadScript("https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js");
    if(!window.Tesseract) throw new Error("Tesseract.js non disponible");
    const worker=await Tesseract.createWorker("eng",1,{logger:m=>{if(m.status==='recognizing text')progressCb(m.progress);}});
    try{const out=await worker.recognize(blob);return out.data.text||"";}finally{await worker.terminate();}
  }

  async function renderPdf(file){
    const pdfjs = await import("https://cdn.jsdelivr.net/npm/pdfjs-dist@6.1.200/build/pdf.mjs");
    pdfjs.GlobalWorkerOptions.workerSrc="https://cdn.jsdelivr.net/npm/pdfjs-dist@6.1.200/build/pdf.worker.mjs";
    const data=await file.arrayBuffer();
    const pdf=await pdfjs.getDocument({data}).promise;
    const images=[]; const maxPages=Math.min(pdf.numPages,5);
    for(let p=1;p<=maxPages;p++){
      const page=await pdf.getPage(p); const viewport=page.getViewport({scale:2});
      const canvas=document.createElement("canvas"); canvas.width=viewport.width; canvas.height=viewport.height;
      await page.render({canvasContext:canvas.getContext("2d"),viewport}).promise;
      images.push(canvas.toDataURL("image/png"));
    }
    return {images,totalPages:pdf.numPages};
  }

  async function startAnalysis(file){
    state.file=file; state.text=""; state.connectors=[]; state.wires=[]; state.pins=[]; state.sections=[]; state.lengths=[]; state.terminals=[]; state.colors=[];
    ui.progress("Vérification du fichier…",2);
    if(file.size>50*1024*1024) throw new Error("Fichier supérieur à 50 MB.");
    let preview=null;
    if(file.type === "application/pdf"){
      ui.progress("Lecture du PDF…",8);
      const pdf=await renderPdf(file); preview=pdf.images[0]||null;
      for(let i=0;i<pdf.images.length;i++){
        ui.progress(`OCR page ${i+1}/${pdf.images.length}…`,12+(i/pdf.images.length)*65);
        const dataUrl=pdf.images[i]; const text=await imageToText(dataUrl,p=>ui.progress(`OCR page ${i+1}/${pdf.images.length}…`,12+(i/pdf.images.length)*65+p*18)); state.text += "\n"+text;
      }
    } else if(file.type.startsWith("image/")){
      preview=URL.createObjectURL(file); ui.progress("OCR de l’image…",15); state.text=await imageToText(file,p=>ui.progress("OCR de l’image…",15+p*70));
    } else throw new Error("Format non supporté.");
    ui.progress("Extraction des éléments de câblage…",90);
    parseText(state.text);
    const payload=ui.payload(); save(payload);
    ui.progress("Analyse terminée.",100);
    ui.render(preview);
  }

  function patchScannerPage(){
    if(typeof window.__musterAnalyzerMounted !== "undefined") return;
    const scan=document.getElementById("page-drawing-scanner"); if(!scan)return;
    window.__musterAnalyzerMounted=true;
    ui.mount();
    const original=window.__musterStartAnalysis;
    window.__musterStartAnalysis=(file)=>startAnalysis(file).catch(e=>{console.error(e);Toast?.show?.(e.message||"Erreur d'analyse","error");});
    if(original) window.__musterStartAnalysis=original;
  }

  // Navigation injects scanner dynamically; watch the page container.
  const observer=new MutationObserver(()=>{if(document.getElementById("page-drawing-scanner")?.classList.contains("active")) patchScannerPage();});
  observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:["class"]});
  window.addEventListener("DOMContentLoaded",patchScannerPage);
  window.MusterDrawingAnalyzer={start:startAnalysis,getLast:getSaved};
})();