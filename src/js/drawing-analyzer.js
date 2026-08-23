/* MUSTER BAW — Engineering Drawing Analyzer
   OCR + geometric line/junction detection + connector/pin association.
   Browser-side heuristic analysis; human validation remains mandatory. */
"use strict";

(() => {
  const STORE = "muster_baw_analysis_v2";
  const PDFJS = "https://cdn.jsdelivr.net/npm/pdfjs-dist@6.1.200/build/pdf.mjs";
  const PDFWORKER = "https://cdn.jsdelivr.net/npm/pdfjs-dist@6.1.200/build/pdf.worker.mjs";
  const TESS = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
  const CV = "https://docs.opencv.org/4.x/opencv.js";
  const THREE_CDN = "https://cdn.jsdelivr.net/npm/three@0.179.1/build/three.module.js";
  const $ = (s,p=document)=>p.querySelector(s);
  const uniq = arr=>[...new Set(arr.filter(Boolean))];
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const norm=t=>String(t||"").replace(/\s+/g," ").trim();
  const round=(n,d=1)=>Number(n.toFixed(d));
  const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
  const save=data=>localStorage.setItem(STORE,JSON.stringify(data));
  const load=()=>{try{return JSON.parse(localStorage.getItem(STORE)||"null")}catch{return null}};

  const patterns={
    connectors:[/\b(?:CON|CN|C|X|J|P)[-_ ]?[A-Z]?\d{1,4}\b/gi,/\b[A-Z]{1,4}-\d{2,5}\b/g],
    wires:[/\b(?:W|WIRE|FIL)[-_ ]?\d{1,5}\b/gi,/\b\d{2,5}\s*WIRE\b/gi],
    sections:/\b\d+(?:[.,]\d+)?\s*(?:mm2|mm²)\b/gi,
    lengths:/\b\d+(?:[.,]\d+)?\s*(?:mm|cm|m)\b/gi,
    pins:/\b(?:PIN|CAV|CAVITY)[-_ ]?\d{1,4}\b/gi,
    terminals:/\b(?:TE|AMP|TYCO|MCON|MQS|TAB|FEMALE|MALE)[-_ /A-Z0-9]{0,18}\b/gi
  };
  const colorMap=[["RD/BK","Rouge / Noir"],["BK","Noir"],["WH","Blanc"],["RD","Rouge"],["BU","Bleu"],["GN","Vert"],["YE","Jaune"],["GY","Gris"],["BN","Brun"],["VT","Violet"],["OR","Orange"],["PK","Rose"],["RED","Rouge"],["BLACK","Noir"],["BLUE","Bleu"],["GREEN","Vert"],["YELLOW","Jaune"]];
  const state={file:null,text:"",words:[],pages:[],connectors:[],wires:[],pins:[],sections:[],lengths:[],terminals:[],colors:[],geometry:{lines:[],junctions:[],boxes:[],endpoints:[],associations:[],pages:[]},confidence:0};

  function loadScript(src,ready){return new Promise((resolve,reject)=>{if(ready?.())return resolve();const e=document.querySelector(`script[src="${src}"]`);if(e){e.addEventListener("load",resolve,{once:true});e.addEventListener("error",reject,{once:true});return;}const s=document.createElement("script");s.src=src;s.async=true;s.onload=resolve;s.onerror=()=>reject(new Error(`Impossible de charger ${src}`));document.head.appendChild(s);});}
  const fileToDataUrl=file=>new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file)});
  const dataURLToImage=url=>new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=url});
  const extract=(text,re,limit=300)=>uniq([...String(text||"").matchAll(re)].map(m=>norm(m[0]))).slice(0,limit);

  function parseText(text){
    const t=String(text||"");state.text=t;
    state.connectors=uniq(patterns.connectors.flatMap(r=>extract(t,r))).slice(0,150);
    state.wires=uniq(patterns.wires.flatMap(r=>extract(t,r))).slice(0,800);
    state.pins=extract(t,patterns.pins,300);state.sections=extract(t,patterns.sections,150);state.lengths=extract(t,patterns.lengths,150);state.terminals=extract(t,patterns.terminals,150);
    state.colors=uniq(colorMap.filter(([abbr,name])=>new RegExp(`\\b${abbr.replace('/','\\/')}\\b|\\b${name}\\b`,"i").test(t)).map(([abbr,label])=>({abbr,label})));
  }

  async function ocrImage(input,progress){
    await loadScript(TESS,()=>!!window.Tesseract);
    const worker=await window.Tesseract.createWorker("eng",1,{logger:m=>{if(m.status==="recognizing text")progress(m.progress||0)}});
    try{
      const r=await worker.recognize(input);
      const words=(r?.data?.words||[]).filter(w=>norm(w.text)).map(w=>({text:norm(w.text),confidence:Number(w.confidence||0),bbox:w.bbox?{x0:w.bbox.x0,y0:w.bbox.y0,x1:w.bbox.x1,y1:w.bbox.y1}:null}));
      return {text:r?.data?.text||"",words};
    }finally{await worker.terminate()}
  }

  async function renderPdf(file,progress){
    const pdfjs=await import(PDFJS);pdfjs.GlobalWorkerOptions.workerSrc=PDFWORKER;
    const pdf=await pdfjs.getDocument({data:await file.arrayBuffer()}).promise;const pages=[];const max=Math.min(pdf.numPages,8);
    for(let p=1;p<=max;p++){const page=await pdf.getPage(p);const viewport=page.getViewport({scale:2.2});const canvas=document.createElement("canvas");canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);await page.render({canvasContext:canvas.getContext("2d"),viewport}).promise;pages.push({pageNumber:p,dataUrl:canvas.toDataURL("image/png")});progress(p/max)}
    return {pages,totalPages:pdf.numPages};
  }

  async function openCv(){
    if(window.cv?.Mat)return window.cv;
    await loadScript(CV,()=>!!window.cv);
    await new Promise(resolve=>{const check=()=>window.cv?.Mat?resolve():setTimeout(check,60);check()});
    return window.cv;
  }

  function pointToSegmentDistance(px,py,x1,y1,x2,y2){const dx=x2-x1,dy=y2-y1;if(!dx&&!dy)return Math.hypot(px-x1,py-y1);const t=clamp(((px-x1)*dx+(py-y1)*dy)/(dx*dx+dy*dy),0,1);return Math.hypot(px-(x1+t*dx),py-(y1+t*dy))}

  async function geometricAnalyze(dataUrl,words){
    const cv=await openCv();const img=await dataURLToImage(dataUrl);const canvas=document.createElement("canvas");canvas.width=img.naturalWidth||img.width;canvas.height=img.naturalHeight||img.height;canvas.getContext("2d").drawImage(img,0,0);
    const src=cv.imread(canvas),gray=new cv.Mat(),edges=new cv.Mat(),lines=new cv.Mat(),contours=new cv.MatVector(),hierarchy=new cv.Mat();
    try{
      cv.cvtColor(src,gray,cv.COLOR_RGBA2GRAY,0);cv.GaussianBlur(gray,gray,new cv.Size(3,3),0);cv.Canny(gray,edges,50,150,3,false);cv.HoughLinesP(edges,lines,1,Math.PI/180,55,Math.max(30,Math.round(Math.min(src.cols,src.rows)*.035)),10);
      const segments=[];for(let i=0;i<lines.rows;i++){const x1=lines.data32S[i*4],y1=lines.data32S[i*4+1],x2=lines.data32S[i*4+2],y2=lines.data32S[i*4+3],len=Math.hypot(x2-x1,y2-y1),angle=Math.atan2(y2-y1,x2-x1)*180/Math.PI;if(len>=Math.min(src.cols,src.rows)*.035)segments.push({x1,y1,x2,y2,lengthPx:round(len),angleDeg:round(angle)})}
      const endpoints=segments.flatMap((s,i)=>[{x:s.x1,y:s.y1,segment:i},{x:s.x2,y:s.y2,segment:i}]);const radius=Math.max(8,Math.round(Math.min(src.cols,src.rows)*.008));const junctions=[];
      endpoints.forEach(pt=>{const hits=endpoints.filter(q=>Math.hypot(q.x-pt.x,q.y-pt.y)<=radius).length;if(hits>=3)junctions.push({x:round(pt.x),y:round(pt.y),degree:hits})});
      const clustered=[];junctions.forEach(j=>{if(!clustered.some(c=>Math.hypot(c.x-j.x,c.y-j.y)<=radius))clustered.push(j)});
      cv.findContours(edges,contours,hierarchy,cv.RETR_EXTERNAL,cv.CHAIN_APPROX_SIMPLE);const boxes=[];
      for(let i=0;i<contours.size();i++){const r=cv.boundingRect(contours.get(i)),area=r.width*r.height;if(area>src.cols*src.rows*.00015&&r.width>20&&r.height>20)boxes.push({x:r.x,y:r.y,width:r.width,height:r.height,area})}
      const associations=[];(words||[]).forEach(w=>{if(!w.bbox)return;const cx=(w.bbox.x0+w.bbox.x1)/2,cy=(w.bbox.y0+w.bbox.y1)/2;let nearestLine=null,nearestDist=Infinity;segments.forEach((s,i)=>{const d=pointToSegmentDistance(cx,cy,s.x1,s.y1,s.x2,s.y2);if(d<nearestDist){nearestDist=d;nearestLine=i}});let nearestBox=null,boxDist=Infinity;boxes.forEach((b,i)=>{const dx=Math.max(b.x-cx,0,cx-(b.x+b.width)),dy=Math.max(b.y-cy,0,cy-(b.y+b.height)),d=Math.hypot(dx,dy);if(d<boxDist){boxDist=d;nearestBox=i}});const role=/^(?:W|WIRE|FIL)/i.test(w.text)?"wire-label":/^(?:CON|CN|C|X|J|P)/i.test(w.text)?"connector-label":/^(?:PIN|CAV)/i.test(w.text)?"pin-label":"text";associations.push({text:w.text,role,lineIndex:nearestDist<80?nearestLine:null,boxIndex:boxDist<120?nearestBox:null,lineDistancePx:round(nearestDist),boxDistancePx:round(boxDist)})});
      return {width:src.cols,height:src.rows,lines:segments.slice(0,1500),endpoints:endpoints.slice(0,3000),junctions:clustered.slice(0,600),boxes:boxes.slice(0,800),associations:associations.slice(0,1500)};
    }finally{[src,gray,edges,lines,contours,hierarchy].forEach(m=>{try{m.delete()}catch{}})}
  }

  function buildWireRelations(){
    const wl=state.geometry.associations.filter(a=>a.role==="wire-label"),cl=state.geometry.associations.filter(a=>a.role==="connector-label"),pl=state.geometry.associations.filter(a=>a.role==="pin-label");
    return state.wires.map(wire=>{const label=wl.find(x=>x.text.toUpperCase()===wire.toUpperCase()),line=label?.lineIndex!=null?state.geometry.lines[label.lineIndex]:null;const near=cl.map(c=>({c,d:line&&c.lineIndex!=null&&state.geometry.lines[c.lineIndex]?Math.hypot(state.geometry.lines[c.lineIndex].x1-line.x1,state.geometry.lines[c.lineIndex].y1-line.y1):Infinity})).sort((a,b)=>a.d-b.d).slice(0,2).map(x=>x.c.text);const pins=pl.filter(p=>label?.lineIndex!=null&&p.lineIndex!=null&&Math.abs(p.lineIndex-label.lineIndex)<=2).slice(0,4).map(p=>p.text);const branch=line?state.geometry.junctions.filter(j=>pointToSegmentDistance(j.x,j.y,line.x1,line.y1,line.x2,line.y2)<18).reduce((m,j)=>Math.max(m,j.degree),0):0;return {id:wire,lineIndex:label?.lineIndex??null,geometry:line,connectorCandidates:uniq(near),pinCandidates:uniq(pins),branchDegree:branch,confidence:line?round(clamp(60+near.length*12+pins.length*8,0,98)):35}})
  }

  function drawOverlay(root,imageUrl,g){
    root.innerHTML="";const wrap=document.createElement("div");wrap.className="geometry-overlay";const img=document.createElement("img");img.src=imageUrl;img.alt="Drawing";const c=document.createElement("canvas");wrap.append(img,c);root.appendChild(wrap);
    const draw=()=>{const r=img.getBoundingClientRect();c.width=r.width;c.height=r.height;const sx=r.width/(g.width||img.naturalWidth),sy=r.height/(g.height||img.naturalHeight),ctx=c.getContext("2d");ctx.clearRect(0,0,c.width,c.height);ctx.lineWidth=1.4;ctx.strokeStyle="rgba(37,99,235,.72)";g.lines.slice(0,500).forEach(s=>{ctx.beginPath();ctx.moveTo(s.x1*sx,s.y1*sy);ctx.lineTo(s.x2*sx,s.y2*sy);ctx.stroke()});ctx.fillStyle="rgba(220,38,38,.9)";g.junctions.slice(0,200).forEach(j=>{ctx.beginPath();ctx.arc(j.x*sx,j.y*sy,3,0,Math.PI*2);ctx.fill()});ctx.strokeStyle="rgba(16,185,129,.75)";g.boxes.slice(0,150).forEach(b=>ctx.strokeRect(b.x*sx,b.y*sy,b.width*sx,b.height*sy))};img.onload=draw;window.addEventListener("resize",draw,{passive:true})
  }

  const download=(name,text,type)=>{const b=new Blob([text],{type}),a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),600)};
  const kpi=(label,value)=>`<div class="analysis-kpi"><small>${label}</small><strong>${value}</strong></div>`;
  const chips=(title,items,cls)=>`<div class="result-section"><h4>${title}</h4><div class="result-list">${(items||[]).slice(0,40).map(x=>`<span class="result-chip ${cls}">${esc(typeof x==='string'?x:x.label||x.abbr||x.value)}</span>`).join("")||'<span class="result-chip gray">Aucune détection</span>'}</div></div>`;

  const ui={
    mount(){const page=$("#page-drawing-scanner");if(!page||page.dataset.analyzerMounted)return;page.dataset.analyzerMounted="1";page.innerHTML=`<div class="page-header"><div><span class="page-label">COMPUTER VISION</span><h2>Scanner & analyse géométrique</h2><p>Détection du texte, des lignes, des jonctions et des relations Wire ↔ Connector ↔ Pin.</p></div></div><div class="analyzer-shell"><div class="dashboard-card"><div class="analyzer-dropzone" id="drawingDropzone"><div class="upload-zone-icon"><i class="fa-solid fa-cloud-arrow-up"></i></div><h3>Déposez votre Drawing ici</h3><p>PDF, PNG ou JPG — traitement local dans le navigateur.</p><label class="btn btn-primary" for="drawingFile"><i class="fa-solid fa-file-import"></i>Choisir un fichier</label><input id="drawingFile" type="file" accept="application/pdf,image/png,image/jpeg" hidden></div><div class="analyzer-progress" id="analyzerProgress"><strong id="analyzerProgressLabel">Prêt</strong><div class="analyzer-progress-bar"><span id="analyzerProgressBar"></span></div><span id="analyzerPercent">0%</span></div></div><div id="analysisResult" hidden></div></div>`;const input=$("#drawingFile",page),drop=$("#drawingDropzone",page);input.onchange=()=>input.files[0]&&start(input.files[0]);["dragenter","dragover"].forEach(e=>drop.addEventListener(e,x=>{x.preventDefault();drop.classList.add("dragover")}));["dragleave","drop"].forEach(e=>drop.addEventListener(e,x=>{x.preventDefault();drop.classList.remove("dragover")}));drop.addEventListener("drop",e=>{const f=e.dataTransfer.files[0];if(f)start(f)})},
    progress(label,pct){const b=$("#analyzerProgress"),bar=$("#analyzerProgressBar"),t=$("#analyzerProgressLabel"),p=$("#analyzerPercent");if(!b)return;b.classList.add("active");t.textContent=label;bar.style.width=`${pct}%`;p.textContent=`${Math.round(pct)}%`},
    render(preview){const root=$("#analysisResult");if(!root)return;root.hidden=false;const wr=buildWireRelations();root.innerHTML=`<div class="analysis-summary">${kpi("Connecteurs",state.connectors.length)}${kpi("Wires",state.wires.length)}${kpi("Lignes détectées",state.geometry.lines.length)}${kpi("Jonctions",state.geometry.junctions.length)}${kpi("Zones",state.geometry.boxes.length)}${kpi("Confiance",state.confidence+"%")}</div><div class="analysis-layout" style="margin-top:18px"><div class="preview-card"><div class="preview-head"><strong>Analyse géométrique</strong><span class="detected-status"><i class="fa-solid fa-vector-square"></i> Vision active</span></div><div class="preview-stage" id="previewStage"></div><div class="geometry-legend"><span><i class="line-key"></i>Lignes</span><span><i class="junction-key"></i>Jonctions</span><span><i class="box-key"></i>Zones candidates</span></div></div><div class="results-card"><div class="results-head"><strong>Relations détectées</strong><div class="analyzer-toolbar"><button class="btn btn-small" id="exportJson">JSON</button><button class="btn btn-small" id="exportCsv">CSV</button></div></div><div class="results-body">${chips("Connecteurs",state.connectors,"blue")}${chips("Pins / cavités",state.pins,"purple")}${chips("Couleurs",state.colors.map(x=>x.label),"green")}<div class="engineering-metrics"><div><span>Segments</span><strong>${state.geometry.lines.length}</strong></div><div><span>Jonctions</span><strong>${state.geometry.junctions.length}</strong></div><div><span>Endpoints</span><strong>${state.geometry.endpoints.length}</strong></div><div><span>Associations OCR</span><strong>${state.geometry.associations.length}</strong></div></div><div class="analysis-note"><strong>Validation humaine :</strong> la géométrie détectée est une base d'analyse et doit être vérifiée sur le Drawing avant usage industriel.</div></div></div></div><div class="dashboard-card" style="margin-top:18px"><div class="card-header"><div><h3>Wire List reconstruite</h3><p>Segment, connecteurs/pins candidats et degré de branchement.</p></div><span class="ai-status"><span></span>Engineering pass</span></div><div class="table-container"><table class="analysis-table"><thead><tr><th>Wire</th><th>Segment</th><th>Connecteurs</th><th>Pins</th><th>Branch</th><th>Confidence</th></tr></thead><tbody>${wr.slice(0,100).map(w=>`<tr><td><strong>${esc(w.id)}</strong></td><td>${w.geometry?`${round(w.geometry.x1)},${round(w.geometry.y1)} → ${round(w.geometry.x2)},${round(w.geometry.y2)}`:"—"}</td><td>${w.connectorCandidates.map(esc).join(", ")||"—"}</td><td>${w.pinCandidates.map(esc).join(", ")||"—"}</td><td>${w.branchDegree||0}</td><td><span class="confidence-badge">${w.confidence}%</span></td></tr>`).join("")||'<tr><td colspan="6">Aucun wire label explicite détecté.</td></tr>'}</tbody></table></div></div>`;if(preview)drawOverlay($("#previewStage"),preview,state.geometry);const p=()=>({project:"MUSTER BAW SEBN • PPE",file:state.file?.name||"",createdAt:new Date().toISOString(),ocrText:state.text,connectors:state.connectors,pins:state.pins,wires:wr,geometry:state.geometry,sections:state.sections,lengths:state.lengths,terminals:state.terminals,colors:state.colors});$("#exportJson")?.addEventListener("click",()=>download("muster-baw-engineering-analysis.json",JSON.stringify(p(),null,2),"application/json"));$("#exportCsv")?.addEventListener("click",()=>download("muster-baw-engineering-wirelist.csv",["Wire,Segment,Connectors,Pins,Branch,Confidence",...wr.map(w=>[w.id,w.geometry?`${w.geometry.x1},${w.geometry.y1}->${w.geometry.x2},${w.geometry.y2}`:"",w.connectorCandidates.join(" | "),w.pinCandidates.join(" | "),w.branchDegree,w.confidence].map(v=>`"${String(v).replace(/"/g,'""')}"`).join(","))].join("\n"),"text/csv;charset=utf-8"))}
  };

  async function start(file){state.file=file;state.text="";state.words=[];state.connectors=[];state.wires=[];state.pins=[];state.sections=[];state.lengths=[];state.terminals=[];state.colors=[];state.geometry={lines:[],junctions:[],boxes:[],endpoints:[],associations:[],pages:[]};try{ui.progress("Vérification…",2);if(file.size>50*1024*1024)throw new Error("Fichier supérieur à 50 MB.");let pages=[];if(file.type==="application/pdf"){ui.progress("Rendu du PDF…",8);pages=(await renderPdf(file,p=>ui.progress("Rendu PDF…",8+p*18))).pages}else if(file.type.startsWith("image/")){pages=[{pageNumber:1,dataUrl:await fileToDataUrl(file)}]}else throw new Error("Format non supporté. Utilisez PDF, PNG ou JPG.");state.pages=pages;for(let i=0;i<pages.length;i++){const base=28+(i/pages.length)*38;ui.progress(`OCR page ${pages[i].pageNumber}/${pages.length}…`,base);const r=await ocrImage(pages[i].dataUrl,p=>ui.progress(`OCR page ${pages[i].pageNumber}/${pages.length}…`,base+p*12));state.text+=`\n${r.text}`;state.words.push(...r.words.map(w=>({...w,page:i})))}parseText(state.text);ui.progress("Détection géométrique…",70);const gs=[];for(let i=0;i<pages.length;i++){const g=await geometricAnalyze(pages[i].dataUrl,state.words.filter(w=>w.page===i));gs.push(g);ui.progress(`Vision géométrique ${i+1}/${pages.length}…`,70+(i+1)/pages.length*24)}const g=gs[0]||{width:0,height:0,lines:[],endpoints:[],junctions:[],boxes:[],associations:[]};state.geometry={width:g.width,height:g.height,lines:g.lines,endpoints:g.endpoints,junctions:g.junctions,boxes:g.boxes,associations:g.associations,pages:gs.map((x,i)=>({page:i+1,width:x.width,height:x.height,lines:x.lines.length,junctions:x.junctions.length,boxes:x.boxes.length}))};const gscr=state.geometry.lines.length?Math.min(1,state.geometry.lines.length/120):0,ascr=state.geometry.associations.length?Math.min(1,state.geometry.associations.length/80):0,oscr=state.text.length?Math.min(1,state.text.length/2500):0;state.confidence=Math.round(45+gscr*25+ascr*20+oscr*10);ui.progress("Construction Wire ↔ Connector ↔ Pin…",96);save({project:"MUSTER BAW SEBN • PPE",file:state.file?.name||"",createdAt:new Date().toISOString(),ocrText:state.text,geometry:state.geometry,wires:buildWireRelations(),connectors:state.connectors,pins:state.pins});ui.progress("Analyse terminée",100);ui.render(pages[0]?.dataUrl||null)}catch(e){console.error(e);ui.progress("Erreur d'analyse",0);if(window.Toast?.show)window.Toast.show(e.message||"Erreur d'analyse","error");else alert(e.message||"Erreur d'analyse")}}

  async function mount3D(container){if(!container||container.dataset.threeReady)return;container.dataset.threeReady="1";try{const THREE=await import(THREE_CDN);const scene=new THREE.Scene();scene.background=new THREE.Color(0x0f172a);const w=Math.max(container.clientWidth,600),h=Math.max(container.clientHeight,520);const camera=new THREE.PerspectiveCamera(45,w/h,.1,2000);camera.position.set(260,180,300);const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(2,devicePixelRatio));renderer.setSize(w,h);container.appendChild(renderer.domElement);scene.add(new THREE.HemisphereLight(0xffffff,0x334155,2.2));const dl=new THREE.DirectionalLight(0xffffff,2.4);dl.position.set(120,220,180);scene.add(dl);const group=new THREE.Group();scene.add(group);group.add(new THREE.Mesh(new THREE.BoxGeometry(220,120,120),new THREE.MeshStandardMaterial({color:0x334155,metalness:.25,roughness:.35})));const pins=Math.max(4,Math.min(32,state.pins.length||8)),cols=Math.ceil(Math.sqrt(pins));for(let i=0;i<pins;i++){const x=((i%cols)-(cols-1)/2)*25,y=(Math.floor(i/cols)-((Math.ceil(pins/cols)-1)/2))*25,pin=new THREE.Mesh(new THREE.CylinderGeometry(4,4,28,16),new THREE.MeshStandardMaterial({color:0x22c55e,metalness:.7,roughness:.22}));pin.rotation.z=Math.PI/2;pin.position.set(112,y,x);group.add(pin)}const ring=new THREE.Mesh(new THREE.TorusGeometry(150,3,16,64),new THREE.MeshBasicMaterial({color:0x2563eb,transparent:true,opacity:.35}));ring.rotation.x=Math.PI/2;group.add(ring);const grid=new THREE.GridHelper(600,30,0x334155,0x1e293b);grid.position.y=-90;scene.add(grid);let drag=false,lx=0,ly=0;renderer.domElement.onpointerdown=e=>{drag=true;lx=e.clientX;ly=e.clientY};window.addEventListener("pointerup",()=>drag=false);window.addEventListener("pointermove",e=>{if(!drag)return;group.rotation.y+=(e.clientX-lx)*.008;group.rotation.x+=(e.clientY-ly)*.008;lx=e.clientX;ly=e.clientY},{passive:true});const loop=()=>{requestAnimationFrame(loop);ring.rotation.z+=.002;renderer.render(scene,camera)};loop();window.addEventListener("resize",()=>{const ww=Math.max(container.clientWidth,600),hh=Math.max(container.clientHeight,520);camera.aspect=ww/hh;camera.updateProjectionMatrix();renderer.setSize(ww,hh)},{passive:true});container.insertAdjacentHTML("beforeend",`<div class="viewer-3d-label"><strong>Connector mapping</strong><span>${esc(state.connectors[0]||"Detected Connector")} • ${pins} pins</span></div>`)}catch(e){console.error(e)}}

  const observer=new MutationObserver(()=>{const s=$("#page-drawing-scanner");if(s?.classList.contains("active"))ui.mount();const v=$(".viewer-3d");if(v?.classList.contains("active"))mount3D(v)});observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:["class"]});window.addEventListener("DOMContentLoaded",()=>{ui.mount();const v=$(".viewer-3d");if(v)mount3D(v)});window.MusterDrawingAnalyzer={start,getLast:load,mount3D};
})();