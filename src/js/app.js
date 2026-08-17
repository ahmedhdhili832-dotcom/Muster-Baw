/* MUSTER BAW SEBN • PPE — application entry point */

"use strict";

const MusterBAW = (() => {
    const State = {
        currentPage: "dashboard",
        theme: localStorage.getItem("musterTheme") || "light",
        sidebarOpen: false,
        project: null,
        analysis: { status: "ready", drawing: null, connectors: [], wires: [], terminals: [], errors: [], confidence: 0 },
        cache: new Map()
    };

    const Config = {
        maxFileSize: 50 * 1024 * 1024,
        allowedFileTypes: ["application/pdf", "image/png", "image/jpeg", "image/jpg"],
        toastDuration: 3500,
        animationDuration: 250,
        pageTitles: {
            dashboard:"Tableau de bord",projects:"Gestion des projets","drawing-scanner":"Scanner le Drawing","ai-analyzer":"Analyseur IA","manual-analysis":"Analyse manuelle",connectors:"Connecteurs détectés","connector-3d":"Vue 3D Connecteur",pinout:"Pinout & Cavités","wire-list":"Wire List","wire-details":"Détails des fils",terminals:"Terminaux & Contacts",compatibility:"Compatibilité",validation:"Validation humaine",bom:"Génération BOM",reports:"Rapports & Historique",database:"Base de données",settings:"Paramètres"
        }
    };

    const DOM = {};
    function getCachedDOM(selector,id){ if(!DOM[id]) DOM[id]=document.getElementById(id)||document.querySelector(selector); return DOM[id]; }
    class AppError extends Error{constructor(message,code="UNKNOWN"){super(message);this.name="AppError";this.code=code;this.timestamp=new Date()}}
    const Logger={info:(m,d={})=>console.log(`[INFO] ${m}`,d),warn:(m,d={})=>console.warn(`[WARN] ${m}`,d),error:(m,d={})=>{console.error(`[ERROR] ${m}`,d);State.analysis.errors.push({message:m,timestamp:new Date(),...d})}};
    const Utils={
        escapeHTML(text){const div=document.createElement("div");div.textContent=text;return div.innerHTML},
        generateID(prefix="ID"){return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2,7).toUpperCase()}`},
        debounce(func,delay){let timeout;return(...args)=>{clearTimeout(timeout);timeout=setTimeout(()=>func(...args),delay)}},
        throttle(func,limit){let inThrottle;return(...args)=>{if(!inThrottle){func(...args);inThrottle=true;setTimeout(()=>inThrottle=false,limit)}}}
    };
    const Toast={show(message,type="success"){try{const container=getCachedDOM("#toastContainer","toastContainer");if(!container)return;const toast=document.createElement("div");toast.className=`toast ${type}`;toast.setAttribute("role","alert");toast.setAttribute("aria-live","polite");const icons={success:"fa-circle-check",error:"fa-circle-xmark",warning:"fa-triangle-exclamation",info:"fa-circle-info"};toast.innerHTML=`<i class="fa-solid ${icons[type]||icons.info}" aria-hidden="true"></i><span>${Utils.escapeHTML(message)}</span>`;container.appendChild(toast);requestAnimationFrame(()=>toast.classList.add("show"));setTimeout(()=>{toast.classList.remove("show");setTimeout(()=>toast.remove(),Config.animationDuration)},Config.toastDuration)}catch(err){Logger.error("Toast display error",{err})}}};
    const FileValidator={
        validate(file){if(!file)return{valid:false,message:"Aucun fichier sélectionné."};if(!Config.allowedFileTypes.includes(file.type))return{valid:false,message:"Format non supporté. Utilisez PDF, PNG ou JPG."};if(file.size>Config.maxFileSize)return{valid:false,message:`Fichier trop volumineux (max ${Config.maxFileSize/1024/1024}MB).`};return{valid:true,message:"Fichier valide."}},
        setDrawing(file){const validation=this.validate(file);if(!validation.valid){Toast.show(validation.message,"error");return false}State.analysis.drawing={name:file.name,type:file.type,size:file.size,file,importedAt:new Date()};Toast.show(`Drawing "${file.name}" importé avec succès.`);return true}
    };
    const Navigation={
        init(){document.querySelectorAll(".nav-item").forEach(item=>item.addEventListener("click",()=>{if(item.dataset.page)this.goTo(item.dataset.page)}));document.querySelectorAll("[data-page-link]").forEach(link=>link.addEventListener("click",()=>{if(link.dataset.pageLink)this.goTo(link.dataset.pageLink)}))},
        goTo(page){if(!Config.pageTitles[page]){Logger.warn(`Page inconnue : ${page}`);return}State.currentPage=page;document.querySelectorAll(".nav-item").forEach(item=>{item.classList.remove("active");item.setAttribute("aria-current","false")});const active=document.querySelector(`.nav-item[data-page="${page}"]`);if(active){active.classList.add("active");active.setAttribute("aria-current","page")}document.querySelectorAll(".page").forEach(section=>{section.classList.remove("active");section.setAttribute("hidden","")});const target=document.getElementById(`page-${page}`);if(target){target.classList.add("active");target.removeAttribute("hidden")}this.updateTitle();Sidebar.closeMobile();window.scrollTo({top:0,behavior:"smooth"});this.handlePageLoad(page)},
        updateTitle(){const title=getCachedDOM("#pageTitle","pageTitle");if(title)title.textContent=Config.pageTitles[State.currentPage]||"MUSTER BAW SEBN"},
        handlePageLoad(page){const modules={"drawing-scanner":Scanner,"ai-analyzer":Analyzer,connectors:Connectors,"wire-list":WireList,settings:Settings};if(modules[page])modules[page].init();else Logger.info(`Page ${page} loaded`)}
    };
    const Sidebar={
        init(){const btn=getCachedDOM("#mobileMenuButton","mobileMenuButton");if(btn)btn.addEventListener("click",this.toggleMobile);document.addEventListener("click",e=>{if(!State.sidebarOpen)return;const sidebar=getCachedDOM("#sidebar","sidebar");if(sidebar&&!sidebar.contains(e.target)&&!btn?.contains(e.target))this.closeMobile()})},
        toggleMobile(){State.sidebarOpen=!State.sidebarOpen;const sidebar=getCachedDOM("#sidebar","sidebar");if(sidebar)sidebar.classList.toggle("mobile-open",State.sidebarOpen)},
        closeMobile(){State.sidebarOpen=false;const sidebar=getCachedDOM("#sidebar","sidebar");if(sidebar)sidebar.classList.remove("mobile-open")}
    };
    const Theme={
        init(){this.apply(State.theme);const btn=getCachedDOM("#themeToggle","themeToggle");if(btn)btn.addEventListener("click",this.toggle)},
        toggle(){State.theme=State.theme==="dark"?"light":"dark";this.apply(State.theme);localStorage.setItem("musterTheme",State.theme);Toast.show(State.theme==="dark"?"Mode sombre activé.":"Mode clair activé.")},
        apply(theme){document.body.classList.toggle("dark-mode",theme==="dark");const btn=getCachedDOM("#themeToggle","themeToggle");if(btn){const icon=btn.querySelector("i");if(icon)icon.className=theme==="dark"?"fa-solid fa-sun":"fa-solid fa-moon";btn.setAttribute("aria-label",theme==="dark"?"Activer le mode clair":"Activer le mode sombre")}}
    };
    const Keyboard={init(){document.addEventListener("keydown",e=>{if(e.ctrlKey&&e.key.toLowerCase()==="k"){e.preventDefault();Toast.show("Recherche globale disponible prochainement.","info")}if(e.ctrlKey&&e.key.toLowerCase()==="b"){e.preventDefault();Sidebar.toggleMobile()}if(e.key==="Escape")Sidebar.closeMobile()})}};
    const Scanner={init(){Logger.info("Scanner initialized")}},Analyzer={init(){Logger.info("Analyzer initialized")}},Connectors={init(){Logger.info("Connectors initialized")}},WireList={init(){Logger.info("WireList initialized")}},Settings={init(){Logger.info("Settings initialized")}};
    const Models={createWire(data={})=>({id:data.id||Utils.generateID("W"),pin:data.pin||null,connector:data.connector||null,color:data.color||"Non déterminée",section:data.section||"Non déterminée",length:data.length||null,terminal:data.terminal||null,contact:data.contact||null,direction:data.direction||"Non déterminée",confidence:{pin:data.confidence?.pin??null,color:data.confidence?.color??null,section:data.confidence?.section??null,length:data.confidence?.length??null},status:data.status||"pending"}),createConnector(data={})=>({id:data.id||Utils.generateID("CON"),reference:data.reference||"UNKNOWN",type:data.type||"Unknown",pins:data.pins||0,orientation:data.orientation||"Unknown",locking:data.locking??null,cavities:data.cavities||[],confidence:data.confidence||null,status:data.status||"pending"}),createProject(data={})=>({id:data.id||Utils.generateID("PRJ"),name:data.name||"Nouveau projet",drawingReference:data.drawingReference||"",client:data.client||"SEBN",version:data.version||"V1",createdAt:new Date(),status:"draft"})};
    const DataExport={exportJSON(data,filename="muster-baw-data.json"){try{const blob=new Blob([JSON.stringify(data,null,4)],{type:"application/json"});const url=URL.createObjectURL(blob);const link=document.createElement("a");link.href=url;link.download=filename;document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);Toast.show("Données exportées avec succès.")}catch(err){Logger.error("Export failed",{err});Toast.show("Erreur lors de l'export.","error")}},print(){window.print()}};
    return {init(){document.addEventListener("DOMContentLoaded",()=>{try{Sidebar.init();Theme.init();Navigation.init();Keyboard.init();Navigation.updateTitle();Logger.info("MUSTER BAW SEBN • PPE initialized successfully")}catch(err){Logger.error("Initialization failed",{err});Toast.show("Erreur lors de l'initialisation de l'application.","error")}})},State,Config,Logger,Toast,FileValidator,Navigation,Theme,Models,DataExport};
})();
MusterBAW.init();
