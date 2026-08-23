/* MUSTER BAW — Reliable drawing intake fallback
   Guarantees that PNG/JPG drawings open immediately and provides a lightweight
   color-wire analysis when OCR/OpenCV dependencies fail or are too slow. */
"use strict";
(() => {
  const $ = (s,p=document) => p.querySelector(s);
  const STORE = "muster_baw_reliable_drawing_v1";
  const toast = (m,t="success") => window.Toast?.show?.(m,t);
  let bound = false;

  const rgbName = (r,g,b) => {
    const max=Math.max(r,g,b), min=Math.min(r,g,b), d=max-min;
    if(max<70) return "Noir / sombre";
    if(d<28 && max>185) return "Blanc / gris clair";
    if(r>145 && r>g*1.35 && r>b*1.35) return "Rouge";
    if(g>115 && g>r*1.18 && g>b*1.12) return "Vert";
    if(b>125 && b>r*1.18 && b>g*1.05) return "Bleu";
    if(r>105 && b>90 && r>g*1.05) return "Violet / magenta";
    if(r>95 && g>65 && b<70 && r>b*1.35) return "Brun / orange";
    if(r>110 && g>110 && b<100) return "Jaune";
    return null;
  };

  function analyzeColors(canvas){
    const ctx=canvas.getContext("2d",{willReadFrequently:true});
    const w=canvas.width,h=canvas.height;
    const step=Math.max(2,Math.floor(Math.min(w,h)/500));
    const data=ctx.getImageData(0,0,w,h).data;
    const counters={};
    let colored=0;
    for(let y=0;y<h;y+=step){
      for(let x=0;x<w;x+=step){
        const i=(y*w+x)*4;
        const n=rgbName(data[i],data[i+1],data[i+2]);
        if(n && !/^Blanc|^Noir/.test(n)){ counters[n]=(counters[n]||0)+1; colored++; }
      }
    }
    const total=Math.max(1,colored);
    return Object.entries(counters).sort((a,b)=>b[1]-a[1]).map(([color,count])=>({color,count,ratio:Math.round(count/total*1000)/10}));
  }

  function extractLabelsFromBasicOCR(text){
    const t=String(text||"");
    const pick=(re)=>[...t.matchAll(re)].map(m=>m[0].trim()).filter(Boolean).slice(0,100);
    return {
      connectors:[...new Set(pick(/\b(?:CON|CN|X|J|C)\s*[-_]?[A-Z]?\d{1,4}\b/gi))],
      wires:[...new Set(pick(/\b(?:W|WIRE|FIL)\s*[-_]?\d{1,5}\b/gi))],
      pins:[...new Set(pick(/\b(?:PIN|CAV|CAVITY)\s*[-_]?\d{1,4}\b/gi))]
    };
  }

  async function lightweightOCR(dataUrl){
    try{
      if(!window.Tesseract){
        await new Promise((resolve,reject)=>{
          const s=document.createElement("script");
          s.src="https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
          s.onload=resolve;s.onerror=reject;document.head.appendChild(s);
        });
      }
      const worker=await window.Tesseract.createWorker("eng",1);
      try { const r=await worker.recognize(dataUrl); return r?.data?.text||""; }
      finally { await worker.terminate(); }
    }catch{return "";}
  }

  async function renderPdf(file){
    try{
      const mod=await import("https://cdn.jsdelivr.net/npm/pdfjs-dist@6.1.200/build/pdf.mjs");
      mod.GlobalWorkerOptions.workerSrc="https://cdn.jsdelivr.net/npm/pdfjs-dist@6.1.200/build/pdf.worker.mjs";
      const pdf=await mod.getDocument({data:await file.arrayBuffer()}).promise;
      const page=await pdf.getPage(1);
      const viewport=page.getViewport({scale:2});
      const c=document.createElement("canvas"); c.width=Math.ceil(viewport.width); c.height=Math.ceil(viewport.height);
      await page.render({canvasContext:c.getContext("2d"),viewport}).promise;
      return {dataUrl:c.toDataURL("image/png"),pages:pdf.numPages};
    }catch(e){throw new Error("Impossible de lire ce PDF dans le navigateur. Essayez de l'exporter en PNG/JPG ou vérifiez le PDF.");}
  }

  async function start(file){
    if(!file) return;
    const allowed=["application/pdf","image/png","image/jpeg"];
    if(!allowed.includes(file.type)){toast("Format non supporté. Utilisez PDF, PNG ou JPG.","error");return;}
    if(file.size>50*1024*1024){toast("Le Drawing dépasse 50 MB.","error");return;}

    const stage=document.getElementById("reliableDrawingStage");
    const status=document.getElementById("reliableDrawingStatus");
    const progress=document.getElementById("reliableDrawingProgress");
    if(status) status.textContent="Ouverture du Drawing…";
    if(progress) progress.style.width="12%";

    let pageData;
    let pages=1;
    try{
      if(file.type==="application/pdf") { const p=await renderPdf(file); pageData=p.dataUrl; pages=p.pages; }
      else pageData=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);});
    }catch(e){ if(status) status.textContent="Échec de lecture"; toast(e.message,"error"); return; }

    const img=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=pageData;});
    const canvas=document.createElement("canvas");
    canvas.width=img.naturalWidth||img.width;canvas.height=img.naturalHeight||img.height;
    canvas.getContext("2d").drawImage(img,0,0);
    if(progress) progress.style.width="45%";
    const colors=analyzeColors(canvas);
    if(status) status.textContent="Lecture des couleurs de câblage…";
    const ocr=await lightweightOCR(pageData);
    if(progress) progress.style.width="78%";
    const labels=extractLabelsFromBasicOCR(ocr);
    const result={file:file.name,type:file.type,pages,width:canvas.width,height:canvas.height,colors,labels,createdAt:new Date().toISOString(),mode:"reliable-intake"};
    localStorage.setItem(STORE,JSON.stringify(result));

    if(stage){
      stage.innerHTML=`<div class="reliable-preview-wrap"><img src="${pageData}" alt="Drawing importé"><div class="reliable-badge"><i class="fa-solid fa-circle-check"></i> Drawing chargé</div></div>`;
    }
    const resultBox=document.getElementById("reliableDrawingResults");
    if(resultBox){
      resultBox.hidden=false;
      resultBox.innerHTML=`<div class="reliable-kpis"><div><small>Pages</small><strong>${pages}</strong></div><div><small>Couleurs détectées</small><strong>${colors.length}</strong></div><div><small>Connecteurs candidats</small><strong>${labels.connectors.length}</strong></div><div><small>Wire labels</small><strong>${labels.wires.length}</strong></div></div><div class="reliable-grid"><div><h3>Couleurs de câblage</h3><div class="reliable-chips">${colors.map(x=>`<span>${x.color}<b>${x.ratio}%</b></span>`).join("")||"Aucune couleur fiable détectée."}</div></div><div><h3>Références OCR</h3><p><strong>Connecteurs :</strong> ${labels.connectors.join(", ")||"Aucune détection"}</p><p><strong>Wires :</strong> ${labels.wires.join(", ")||"Aucun label explicite"}</p><p><strong>Pins :</strong> ${labels.pins.join(", ")||"Aucun pin explicite"}</p></div></div><div class="reliable-note">Le Drawing est maintenant ouvert et lisible. Le moteur principal peut ensuite effectuer l'analyse géométrique détaillée et la validation humaine.</div>`;
    }
    if(progress) progress.style.width="100%";
    if(status) status.textContent=`Drawing prêt — ${file.name}`;
    toast(`Drawing « ${file.name} » chargé.`);
  }

  function bind(){
    const input=$("#drawingFile");
    if(!input || bound) return;
    bound=true;
    input.addEventListener("change",()=>start(input.files?.[0]));
    window.addEventListener("muster:drawing-ready",()=>bind());
  }

  function ensureUI(){
    const page=$("#page-drawing-scanner"); if(!page) return;
    if(!document.getElementById("reliableDrawingStage")){
      const card=document.createElement("div");card.className="dashboard-card reliable-intake-card";
      card.innerHTML=`<div class="card-header"><div><h3>Prévisualisation fiable du Drawing</h3><p>Ouverture immédiate de votre image/PDF avant l'analyse avancée.</p></div><span class="ai-status"><span></span><span id="reliableDrawingStatus">Prêt</span></span></div><div class="reliable-progress"><span id="reliableDrawingProgress"></span></div><div id="reliableDrawingStage" class="reliable-stage"><div class="reliable-empty"><i class="fa-solid fa-image"></i><strong>Votre Drawing apparaîtra ici</strong><span>Importez un fichier ci-dessus.</span></div></div><div id="reliableDrawingResults" class="reliable-results" hidden></div>`;
      page.appendChild(card);
    }
    bind();
  }

  const observer=new MutationObserver(()=>{if(document.getElementById("page-drawing-scanner")?.classList.contains("active")){ensureUI();setTimeout(bind,50);}});
  observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:["class"]});
  window.addEventListener("DOMContentLoaded",()=>{ensureUI();setTimeout(bind,100);});
  window.MusterReliableDrawing={start,ensureUI};
})();
