(() => {
"use strict";

const SUPABASE_URL = "https://qsnlwppbcczjwxwuhbkv.supabase.co";
const SUPABASE_KEY = "sb_publishable_R0Y-88wMebNVn580N5DvlQ_1xYezwhU";
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});
let currentUser = null;
let cloudReady = false;
let saveTimer = null;

const KEY = "dla_kalkulator_v3";
const APP_VERSION = "3.0.1";
const VERSION_KEY = "dla_app_version";
if (localStorage.getItem(VERSION_KEY) !== APP_VERSION) {
  if ("caches" in window) {
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))).catch(() => {});
  }
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then(regs => {
      regs.forEach(reg => reg.unregister());
    }).catch(() => {});
  }
  localStorage.setItem(VERSION_KEY, APP_VERSION);
}

const defaults = {
  settings:{
    profit:30,hourly:0,machine3d:0.5,laserGravur:0.1,laserSchnitt:0.15,
    plotter:0.1,presse:0.15,reserve:5,packaging:0,rounding:0.1
  },
  materials:[],projects:[],templates:[],activeModule:"3d",lastPrice:null,timer:{running:false,startedAt:null,elapsed:0},
  machines:[
    {id:"xtool-f2-diode",name:"xTool F2 – Diode",type:"laser",engraveRate:0.10,cutRate:0.15,active:true},
    {id:"xtool-f2-ir",name:"xTool F2 – IR",type:"laser",engraveRate:0.10,cutRate:0.15,active:true},
    {id:"atomstack-x70",name:"Atomstack X70 Pro",type:"laser",engraveRate:0.10,cutRate:0.15,active:true},
    {id:"anycubic-k3",name:"Anycubic K3 Combo",type:"3d",hourlyRate:0.50,active:true},
    {id:"anycubic-kobra2plus",name:"Anycubic Kobra 2 Plus",type:"3d",hourlyRate:0.50,active:true}
  ]
};
const $ = id => document.getElementById(id);
const num = v => {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  return Number(String(v ?? "").replace(",", ".")) || 0;
};
const euro = v => new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR"}).format(num(v));
const uid = () => crypto.randomUUID ? crypto.randomUUID() : Date.now()+"-"+Math.random().toString(16).slice(2);
const esc = s => String(s ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));

const MATERIAL_CATEGORIES={
  "Laser":["Holz","Schiefer & Stein","Metall","Acryl & Kunststoff","Glas","Leder","Rohlinge","Sonstiges"],
  "3D-Druck":["Filament PLA","Filament PETG","Filament TPU","Filament ASA / ABS","Spezialfilament","Harz","Sonstiges"],
  "Vinylfolie":["Vinylfolie","Spezialfolie","Reflexfolie","Sonstiges"],
  "Übertragungsfolie":["Übertragungsfolie","Sonstiges"],
  "Textilfolie":["Textilfolie","Spezialfolie","Textilien","Rohlinge","Sonstiges"],
  "Sonstiges":["Kleber","Reinigung","Schleifen","Farbe & Finish","Abkleben","Wartung","Verpackung","Sonstiges"]
};
function inferMaterialCategory(m){
  if(m.category)return m.category;
  if(m.consumableRole)return m.consumableCategory||"Sonstiges";
  const n=String(m.name||"").toLowerCase();
  if(m.area==="3D-Druck"){
    if(n.includes("petg"))return "Filament PETG";if(n.includes("tpu"))return "Filament TPU";if(n.includes("asa")||n.includes("abs"))return "Filament ASA / ABS";if(n.includes("harz")||n.includes("resin"))return "Harz";if(n.includes("pla"))return "Filament PLA";return "Spezialfilament";
  }
  if(m.area==="Laser"){
    if(/holz|mdf|sperr|multiplex|pappel|birke|buche/.test(n))return "Holz";if(/schiefer|stein|marmor/.test(n))return "Schiefer & Stein";if(/acryl|kunststoff/.test(n))return "Acryl & Kunststoff";if(/metall|alu|edelstahl|messing|zippo/.test(n))return "Metall";if(n.includes("glas"))return "Glas";if(/leder|kork/.test(n))return "Leder";return "Sonstiges";
  }
  return (MATERIAL_CATEGORIES[m.area]||["Sonstiges"])[0];
}
function categoryOptions(area,selected=""){
  const cats=MATERIAL_CATEGORIES[area]||["Sonstiges"];
  return cats.map(c=>`<option ${c===selected?"selected":""}>${esc(c)}</option>`).join("");
}
let state = load();
state.templates=Array.isArray(state.templates)?state.templates:[];
state.projects=(state.projects||[]).map(p=>({...p,pinned:Boolean(p.pinned),status:["open","progress","payment","done"].includes(p.status)?p.status:"open",tags:Array.isArray(p.tags)?p.tags:(p.tags?String(p.tags).split(",").map(x=>x.trim()).filter(Boolean):[]),images:Array.isArray(p.images)?p.images:(p.image?[p.image]:[]),priceHistory:Array.isArray(p.priceHistory)?p.priceHistory:[],workSeconds:num(p.workSeconds)}));
state.timer={...defaults.timer,...(state.timer||{})};

function load(){
  try{
    const saved=JSON.parse(localStorage.getItem(KEY));
    const merged={...defaults,...saved,settings:{...defaults.settings,...(saved?.settings||{})}};
    merged.materials=(merged.materials||[]).map(m=>({
      ...m,
      mainRole:m.mainRole!==false,
      consumableRole:Boolean(m.consumableRole||m.area==="Sonstiges"),
      consumableCategory:m.consumableCategory||"Sonstiges",
      defaultConsumption:num(m.defaultConsumption),
      autoAdd:Boolean(m.autoAdd),
      favorite:Boolean(m.favorite),
      category:inferMaterialCategory(m),supplier:m.supplier||"",image:m.image||"",lastUsed:m.lastUsed||null,
      width:num(m.width),height:num(m.height),dimensionUnit:m.dimensionUnit||"cm",sheetCount:num(m.sheetCount)||1,
      consumableModules:Array.isArray(m.consumableModules)&&m.consumableModules.length?m.consumableModules:["3d","laser","vinyl","textil"],
      scaleWithSize:Boolean(m.scaleWithSize),
      workshopUnit:m.workshopUnit||m.unit||"Einheit",
      workshopUnitAmount:num(m.workshopUnitAmount)||1,
      consumptionLevels:{
        small:num(m.consumptionLevels?.small)||(Boolean(m.scaleWithSize)?num(m.defaultConsumption)*(num(m.sizeFactors?.small)||0.5):num(m.defaultConsumption)),
        medium:num(m.consumptionLevels?.medium)||num(m.defaultConsumption),
        large:num(m.consumptionLevels?.large)||(Boolean(m.scaleWithSize)?num(m.defaultConsumption)*(num(m.sizeFactors?.large)||2):num(m.defaultConsumption))
      },
      sizeFactors:{small:num(m.sizeFactors?.small)||0.5,medium:num(m.sizeFactors?.medium)||1,large:num(m.sizeFactors?.large)||2}
    }));
    merged.machines=Array.isArray(merged.machines)&&merged.machines.length?merged.machines:structuredClone(defaults.machines);
    return merged;
  }catch{return structuredClone(defaults)}
}
function save(){
  localStorage.setItem(KEY,JSON.stringify(state));
  updateHome();
  scheduleCloudSave();
}
function setSyncStatus(text, kind=""){
  const el=$("syncStatus");
  if(!el)return;
  el.textContent=text;
  el.className="sync-status "+kind;
}
function scheduleCloudSave(){
  if(!cloudReady || !currentUser)return;
  clearTimeout(saveTimer);
  setSyncStatus("Speichert …","busy");
  saveTimer=setTimeout(saveCloudState,500);
}
async function saveCloudState(){
  if(!currentUser)return;
  const { error } = await db.from("app_state").upsert({
    user_id: currentUser.id,
    data: state,
    updated_at: new Date().toISOString()
  }, { onConflict: "user_id" });
  if(error){
    console.error(error);
    setSyncStatus("Fehler","error");
  }else{
    setSyncStatus("Gespeichert","ok");
  }
}
async function loadCloudState(){
  setSyncStatus("Synchronisiert …","busy");
  const { data, error } = await db.from("app_state").select("data").eq("user_id",currentUser.id).maybeSingle();
  if(error){
    console.error(error);
    setSyncStatus("DB-Fehler","error");
    return false;
  }
  if(data?.data){
    state={...defaults,...data.data,settings:{...defaults.settings,...(data.data.settings||{})}};
    state.templates=Array.isArray(state.templates)?state.templates:[];
    state.projects=(state.projects||[]).map(p=>({...p,pinned:Boolean(p.pinned),status:["open","progress","payment","done"].includes(p.status)?p.status:"open",tags:Array.isArray(p.tags)?p.tags:(p.tags?String(p.tags).split(",").map(x=>x.trim()).filter(Boolean):[]),images:Array.isArray(p.images)?p.images:(p.image?[p.image]:[]),priceHistory:Array.isArray(p.priceHistory)?p.priceHistory:[],workSeconds:num(p.workSeconds)}));
    state.timer={...defaults.timer,...(state.timer||{})};
    state.materials=(state.materials||[]).map(m=>({
      ...m,mainRole:m.mainRole!==false,consumableRole:Boolean(m.consumableRole||m.area==="Sonstiges"),
      consumableCategory:m.consumableCategory||"Sonstiges",defaultConsumption:num(m.defaultConsumption),autoAdd:Boolean(m.autoAdd),favorite:Boolean(m.favorite),
      category:inferMaterialCategory(m),supplier:m.supplier||"",image:m.image||"",lastUsed:m.lastUsed||null,width:num(m.width),height:num(m.height),dimensionUnit:m.dimensionUnit||"cm",sheetCount:num(m.sheetCount)||1,
      consumableModules:Array.isArray(m.consumableModules)&&m.consumableModules.length?m.consumableModules:["3d","laser","vinyl","textil"],
      scaleWithSize:Boolean(m.scaleWithSize),
      workshopUnit:m.workshopUnit||m.unit||"Einheit",
      workshopUnitAmount:num(m.workshopUnitAmount)||1,
      consumptionLevels:{
        small:num(m.consumptionLevels?.small)||(Boolean(m.scaleWithSize)?num(m.defaultConsumption)*(num(m.sizeFactors?.small)||0.5):num(m.defaultConsumption)),
        medium:num(m.consumptionLevels?.medium)||num(m.defaultConsumption),
        large:num(m.consumptionLevels?.large)||(Boolean(m.scaleWithSize)?num(m.defaultConsumption)*(num(m.sizeFactors?.large)||2):num(m.defaultConsumption))
      },
      sizeFactors:{small:num(m.sizeFactors?.small)||0.5,medium:num(m.sizeFactors?.medium)||1,large:num(m.sizeFactors?.large)||2}
    }));
    state.machines=Array.isArray(state.machines)&&state.machines.length?state.machines:structuredClone(defaults.machines);
    localStorage.setItem(KEY,JSON.stringify(state));
  }else{
    await saveCloudState();
  }
  updateHome();
  renderCalculator();
  renderMaterials();
  renderProjects();
  fillSettings();
  setSyncStatus("Gespeichert","ok");
  return true;
}

function setScreen(id){
  document.querySelectorAll(".screen").forEach(s=>s.classList.toggle("active",s.id===id));
  document.querySelectorAll("[data-screen]").forEach(b=>b.classList.toggle("active",b.dataset.screen===id));
  if(id==="materials") renderMaterials();
  if(id==="projects") renderProjects();
  if(id==="settings") fillSettings();
  if(id==="calculator") renderCalculator();
  if(id==="tools") renderTools();
  if(id==="home") updateHome();
  window.scrollTo({top:0,behavior:"smooth"});
}
document.querySelectorAll("[data-screen]").forEach(b=>b.onclick=()=>{
  if(b.dataset.screen==="calculator") startNewOrder(); else setScreen(b.dataset.screen);
});
document.querySelectorAll("[data-open]").forEach(b=>b.onclick=()=>startNewOrder(b.dataset.open));
document.querySelectorAll("[data-open-tool]").forEach(b=>b.onclick=()=>{setScreen("tools");setTimeout(()=>document.querySelector(`[data-tool="${b.dataset.openTool}"]`)?.click(),0)});
document.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>{state.activeModule=b.dataset.tab;save();renderCalculator()});

function startNewOrder(module="3d"){
  state.activeModule=module||"3d";
  editingProjectId=null;
  consumableSelections=[];
  productSize="medium";
  state.timer={running:false,startedAt:null,elapsed:0};
  save();
  setScreen("calculator");
  renderCalculator(true);
}
function createTemplateFromProject(id){
  const p=state.projects.find(x=>x.id===id);if(!p)return;
  const name=prompt("Name der Vorlage:",p.title);if(!name)return;
  state.templates=state.templates||[];
  state.templates.unshift({id:uid(),name:name.trim(),module:p.module,type:p.type,machineId:p.machineId,productSize:p.productSize,consumables:p.consumables||[],fields:p.fields||{},notes:p.notes||"",created:new Date().toISOString()});
  save();updateHome();alert("Vorlage gespeichert.");
}
function useTemplate(id){
  const t=(state.templates||[]).find(x=>x.id===id);if(!t)return;
  state.activeModule=t.module||"3d";editingProjectId=null;setScreen("calculator");renderCalculator(true);
  productSize=t.productSize||"medium";
  consumableSelections=(t.consumables||[]).map(r=>({...r,auto:false}));renderConsumables();applyCalculatorFields(t.fields||{});
  $("projectName").value="";$("customerName").value="";if($("customerAddress"))$("customerAddress").value="";
  if($("projectNotes"))$("projectNotes").value=t.notes||"";if(t.machineId&&$("machineSelect"))$("machineSelect").value=t.machineId;
  calculate();
}
function renderTemplates(){
  const box=$("homeTemplates");if(!box)return;
  const items=state.templates||[];
  box.innerHTML=items.length?items.slice(0,8).map(t=>`<button class="template-card" type="button" data-use-template="${t.id}"><span>★</span><b>${esc(t.name)}</b><small>${esc(t.type||titles[t.module]||"")}</small></button>`).join(""):`<div class="empty-state template-empty">Noch keine Vorlagen. Öffne ein Projekt und wähle „Als Vorlage“.</div>`;
  box.querySelectorAll("[data-use-template]").forEach(b=>b.onclick=()=>useTemplate(b.dataset.useTemplate));
}
function updateHome(){
  const now=new Date(),month=now.getMonth(),year=now.getFullYear();
  const monthProjects=state.projects.filter(p=>{const d=new Date(p.created||p.updated);return d.getMonth()===month&&d.getFullYear()===year});
  const monthProfit=monthProjects.reduce((sum,p)=>sum+num(p.sale)-num(p.cost),0);
  $("homeMaterialCount").textContent=state.materials.length;
  $("homeOpenCount").textContent=state.projects.filter(p=>(p.status||"open")==="open").length;
  $("homeMonthProfit").textContent=euro(monthProfit);
  $("homeMonthOrders").textContent=`${monthProjects.length} ${monthProjects.length===1?"Auftrag":"Aufträge"}`;
  $("homeFavoriteCount").textContent=`${state.materials.filter(m=>m.favorite).length} Favoriten`;
  $("homeLastPrice").textContent=state.lastPrice==null?"–":euro(state.lastPrice);
  const greeting=now.getHours()<11?"Guten Morgen":now.getHours()<18?"Guten Tag":"Guten Abend";
  if($("dashboardGreeting")) $("dashboardGreeting").textContent=`${greeting}, Daniel`;
  const todayKey=now.toLocaleDateString("de-DE");
  const today=state.projects.filter(p=>new Date(p.created||p.updated).toLocaleDateString("de-DE")===todayKey);
  if($("homeTodayOrders")) $("homeTodayOrders").textContent=today.length;
  if($("homeTodayProfit")) $("homeTodayProfit").textContent=euro(today.reduce((a,p)=>a+num(p.sale)-num(p.cost),0));
  if($("homeTodayWork")){const mins=Math.round(today.reduce((a,p)=>a+num(p.workSeconds),0)/60);$("homeTodayWork").textContent=mins<60?`${mins} Min.`:`${Math.floor(mins/60)} Std. ${mins%60} Min.`;}
  renderTemplates();
  renderRecentProjects();
  const latest=state.projects.slice().sort((a,b)=>new Date(b.updated||b.created)-new Date(a.updated||a.created))[0];
  const continueBtn=$("continueLastProjectBtn"),continueText=$("continueLastProjectText");
  if(continueBtn&&continueText){
    continueBtn.disabled=!latest;
    continueText.textContent=latest?`${latest.title}${latest.customer?" · "+latest.customer:""}`:"Noch kein Projekt vorhanden";
    continueBtn.onclick=latest?()=>viewProject(latest.id):null;
  }
}
function renderRecentProjects(){
  const box=$("homeRecentProjects");if(!box)return;
  const items=state.projects.slice().sort((a,b)=>new Date(b.updated||b.created)-new Date(a.updated||a.created)).slice(0,3);
  box.innerHTML=items.length?items.map(p=>`<button class="recent-project" type="button" data-recent-id="${p.id}"><div><b>${esc(p.title)}</b><small>${esc(p.customer||p.type||"")} · ${new Date(p.updated||p.created).toLocaleDateString("de-DE")}</small></div><strong>${euro(p.sale)}</strong></button>`).join(""):`<div class="empty-state">Noch keine Projekte gespeichert.</div>`;
  box.querySelectorAll("[data-recent-id]").forEach(btn=>btn.onclick=()=>viewProject(btn.dataset.recentId));
}
updateHome();
if($("dashboardSearch")) $("dashboardSearch").oninput=e=>{
  const q=e.target.value.trim().toLowerCase(),box=$("dashboardSearchResults");
  if(!q){box.classList.add("hidden");box.innerHTML="";return}
  const found=state.projects.filter(p=>[p.title,p.customer,p.machineName,p.notes,...(p.tags||[])].join(" ").toLowerCase().includes(q)).slice(0,6);
  box.innerHTML=found.length?found.map(p=>`<button type="button" data-dash-project="${p.id}"><span><b>${esc(p.title)}</b><small>${esc(p.customer||p.type||"")}</small></span><strong>${euro(p.sale)}</strong></button>`).join(""):`<div class="empty-state">Kein passendes Projekt.</div>`;
  box.classList.remove("hidden");box.querySelectorAll("[data-dash-project]").forEach(btn=>btn.onclick=()=>{box.classList.add("hidden");viewProject(btn.dataset.dashProject)});
};

// MATERIALS
const dialog=$("materialDialog");
$("newMaterialBtn").onclick=()=>openMaterial();
$("closeMaterialBtn").onclick=()=>dialog.close();
$("materialSearch").oninput=renderMaterials;
$("materialAreaFilter").onchange=()=>{renderMaterialCategoryFilter();renderMaterials()};
$("materialCategoryFilter").onchange=renderMaterials;
let materialListMode="all";
$("showFavoritesBtn").onclick=()=>{materialListMode=materialListMode==="favorites"?"all":"favorites";updateMaterialModeButtons();renderMaterials()};
$("showRecentMaterialsBtn").onclick=()=>{materialListMode=materialListMode==="recent"?"all":"recent";updateMaterialModeButtons();renderMaterials()};
function updateMaterialModeButtons(){
  $("showFavoritesBtn").classList.toggle("active-filter",materialListMode==="favorites");
  $("showRecentMaterialsBtn").classList.toggle("active-filter",materialListMode==="recent");
}
function renderMaterialCategoryFilter(){
  const area=$("materialAreaFilter").value,old=$("materialCategoryFilter").value;
  const cats=[...new Set(state.materials.filter(m=>!area||m.area===area).map(m=>inferMaterialCategory(m)))].sort((a,b)=>a.localeCompare(b,"de"));
  $("materialCategoryFilter").innerHTML='<option value="">Alle Kategorien</option>'+cats.map(c=>`<option>${esc(c)}</option>`).join("");
  if(cats.includes(old))$("materialCategoryFilter").value=old;
}
["materialPrice","materialQuantity"].forEach(id=>$(id).oninput=previewUnit);
$("materialUnit").oninput=()=>{previewUnit();toggleMaterialAreaBox()};
$("materialConsumableRole").onchange=toggleConsumableFields;
$("materialArea").onchange=()=>{renderMaterialCategorySelect();toggleMaterialAreaBox()};
let materialImageData="";
$("materialImageInput").onchange=async e=>{const f=e.target.files?.[0];if(!f)return;materialImageData=await compressProjectImage(f);renderMaterialImagePreview()};
$("calculateMaterialAreaBtn").onclick=calculateMaterialPurchasedArea;
["materialWidth","materialHeight","materialDimensionUnit","materialSheetCount"].forEach(id=>$(id).oninput=updateMaterialAreaHint);
function renderMaterialCategorySelect(selected=""){$("materialCategory").innerHTML=categoryOptions($("materialArea").value,selected)}
function toggleMaterialAreaBox(){$("materialAreaDimensions").classList.toggle("hidden",!["cm²","m²"].includes($("materialUnit").value))}
function renderMaterialImagePreview(){const box=$("materialImagePreview");box.classList.toggle("hidden",!materialImageData);box.innerHTML=materialImageData?`<img src="${materialImageData}" alt="Materialbild"><button id="removeMaterialImageBtn" type="button">×</button>`:"";if(materialImageData)$("removeMaterialImageBtn").onclick=()=>{materialImageData="";renderMaterialImagePreview()}}
function dimensionToCm(v,u){return num(v)*(u==="mm"?.1:u==="m"?100:1)}
function updateMaterialAreaHint(){const area=dimensionToCm($("materialWidth").value,$("materialDimensionUnit").value)*dimensionToCm($("materialHeight").value,$("materialDimensionUnit").value)*Math.max(1,num($("materialSheetCount").value));$("materialAreaHint").textContent=area?`Gesamtfläche: ${area.toLocaleString("de-DE",{maximumFractionDigits:2})} cm² = ${(area/10000).toLocaleString("de-DE",{maximumFractionDigits:4})} m²`:""}
function calculateMaterialPurchasedArea(){const area=dimensionToCm($("materialWidth").value,$("materialDimensionUnit").value)*dimensionToCm($("materialHeight").value,$("materialDimensionUnit").value)*Math.max(1,num($("materialSheetCount").value));if(!area){alert("Bitte Breite und Höhe eingeben.");return}$("materialUnit").value=$("materialUnit").value==="m²"?"m²":"cm²";$("materialQuantity").value=$("materialUnit").value==="m²"?Number((area/10000).toFixed(6)):Number(area.toFixed(2));previewUnit();updateMaterialAreaHint()}
function toggleConsumableFields(){
  $("consumableSettings").classList.toggle("hidden",!$("materialConsumableRole").checked);
}

function openMaterial(m=null){
  $("materialDialogTitle").textContent=m?"Material bearbeiten":"Material hinzufügen";
  $("materialId").value=m?.id||"";
  $("materialName").value=m?.name||"";
  $("materialArea").value=m?.area||"3D-Druck";
  renderMaterialCategorySelect(m?.category||inferMaterialCategory(m||{area:"3D-Druck",name:""}));
  $("materialSupplier").value=m?.supplier||"";
  materialImageData=m?.image||"";renderMaterialImagePreview();
  $("materialWidth").value=m?.width||"";$("materialHeight").value=m?.height||"";$("materialDimensionUnit").value=m?.dimensionUnit||"cm";$("materialSheetCount").value=m?.sheetCount||1;
  $("materialPrice").value=m?.price??"";
  $("materialQuantity").value=m?.quantity??"";
  $("materialUnit").value=m?.unit||"g";
  $("materialNote").value=m?.note||"";
  $("materialMainRole").checked=m?m.mainRole!==false:true;
  $("materialConsumableRole").checked=m?Boolean(m.consumableRole):false;
  $("materialWorkshopUnit").value=m?.workshopUnit||m?.unit||"";
  $("materialWorkshopUnitAmount").value=m?.workshopUnitAmount??1;
  $("consumptionSmall").value=m?.consumptionLevels?.small??(m?.scaleWithSize?num(m?.defaultConsumption)*(num(m?.sizeFactors?.small)||0.5):m?.defaultConsumption??"");
  $("consumptionMedium").value=m?.consumptionLevels?.medium??m?.defaultConsumption??"";
  $("consumptionLarge").value=m?.consumptionLevels?.large??(m?.scaleWithSize?num(m?.defaultConsumption)*(num(m?.sizeFactors?.large)||2):m?.defaultConsumption??"");
  $("materialAutoAdd").checked=m?Boolean(m.autoAdd):false;
  $("materialFavorite").checked=m?Boolean(m.favorite):false;
  $("materialConsumableCategory").value=m?.consumableCategory||"Sonstiges";
  const modules=m?.consumableModules||["3d","laser","vinyl","textil"];
  document.querySelectorAll("[data-consumable-module]").forEach(cb=>cb.checked=modules.includes(cb.value));
  toggleConsumableFields();toggleMaterialAreaBox();updateMaterialAreaHint();
  previewUnit();
  dialog.showModal();
}
function previewUnit(){
  const q=num($("materialQuantity").value),p=num($("materialPrice").value);
  $("unitPreview").textContent=q>0?`${euro(p/q)} / ${$("materialUnit").value}`:"0,00 €";
}
$("materialForm").onsubmit=e=>{
  e.preventDefault();
  const name=$("materialName").value.trim(),price=num($("materialPrice").value),quantity=num($("materialQuantity").value);
  if(!name||quantity<=0){alert("Bitte Materialname und eine gültige Menge eingeben.");return}
  const modules=[...document.querySelectorAll("[data-consumable-module]:checked")].map(cb=>cb.value);
  const item={
    id:$("materialId").value||uid(),name,area:$("materialArea").value,category:$("materialCategory").value||"Sonstiges",supplier:$("materialSupplier").value.trim(),image:materialImageData,
    width:num($("materialWidth").value),height:num($("materialHeight").value),dimensionUnit:$("materialDimensionUnit").value,sheetCount:Math.max(1,num($("materialSheetCount").value)),
    price,quantity,unit:$("materialUnit").value,
    note:$("materialNote").value.trim(),unitPrice:price/quantity,mainRole:$("materialMainRole").checked,consumableRole:$("materialConsumableRole").checked,
    consumableCategory:$("materialConsumableCategory").value,defaultConsumption:num($("consumptionMedium").value),
    workshopUnit:$("materialWorkshopUnit").value.trim()||$("materialUnit").value,workshopUnitAmount:num($("materialWorkshopUnitAmount").value)||1,
    consumptionLevels:{small:num($("consumptionSmall").value),medium:num($("consumptionMedium").value),large:num($("consumptionLarge").value)},
    autoAdd:$("materialAutoAdd").checked,favorite:$("materialFavorite").checked,scaleWithSize:true,
    consumableModules:modules.length?modules:["3d","laser","vinyl","textil"],
    sizeFactors:{small:1,medium:1,large:1}
  };
  const i=state.materials.findIndex(x=>x.id===item.id); if(i>=0) state.materials[i]=item; else state.materials.push(item);
  save();dialog.close();renderMaterials();
};
function renderMaterials(){
  renderMaterialCategoryFilter();
  const term=$("materialSearch").value.toLowerCase().trim(),area=$("materialAreaFilter").value,category=$("materialCategoryFilter").value;
  let list=state.materials.filter(m=>{
    const hay=`${m.name} ${m.note||""} ${m.supplier||""} ${inferMaterialCategory(m)}`.toLowerCase();
    return (!term||hay.includes(term))&&(!area||m.area===area)&&(!category||inferMaterialCategory(m)===category);
  });
  if(materialListMode==="favorites")list=list.filter(m=>m.favorite);
  if(materialListMode==="recent")list=list.filter(m=>m.lastUsed).sort((a,b)=>new Date(b.lastUsed)-new Date(a.lastUsed));
  else list.sort((a,b)=>(b.favorite-a.favorite)||inferMaterialCategory(a).localeCompare(inferMaterialCategory(b),"de")||a.name.localeCompare(b.name,"de"));
  const groups=new Map();
  list.forEach(m=>{const c=inferMaterialCategory(m);if(!groups.has(c))groups.set(c,[]);groups.get(c).push(m)});
  $("materialList").innerHTML=list.length?[...groups.entries()].map(([cat,items],groupIndex)=>`
    <details class="material-category card" ${groupIndex<3?"open":""}>
      <summary><span>${esc(cat)}</span><small>${items.length} ${items.length===1?"Material":"Materialien"}</small></summary>
      <div class="material-category-items">${items.map(m=>`
        <article class="material-item-compact">
          ${m.image?`<img class="material-thumb" src="${m.image}" alt="">`:`<div class="material-thumb material-thumb-empty">${m.favorite?"★":"▦"}</div>`}
          <div class="material-main"><div class="item-title">${m.favorite?"★ ":""}${esc(m.name)}</div><div class="item-meta">${esc(m.area)}${m.supplier?" · "+esc(m.supplier):""}${m.note?" · "+esc(m.note):""}</div><div class="material-role-tags">${m.mainRole!==false?'<span>Hauptmaterial</span>':''}${m.consumableRole?'<span>Verbrauch</span>':''}${m.lastUsed?`<span>Zuletzt ${new Date(m.lastUsed).toLocaleDateString("de-DE")}</span>`:""}</div></div>
          <div class="material-price-block"><strong>${euro(m.unitPrice)}</strong><small>/${esc(m.unit)}</small></div>
          <div class="material-compact-actions"><button data-edit="${m.id}">Bearbeiten</button><button data-delete="${m.id}" class="danger">Löschen</button></div>
        </article>`).join("")}</div>
    </details>`).join(""):`<div class="empty-state">Keine passenden Materialien gefunden.</div>`;
  document.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>openMaterial(state.materials.find(m=>m.id===b.dataset.edit)));
  document.querySelectorAll("[data-delete]").forEach(b=>b.onclick=()=>{if(confirm("Material wirklich löschen?")){state.materials=state.materials.filter(m=>m.id!==b.dataset.delete);save();renderMaterials()}});
}
let editingProjectId=null;
function machineOptions(type,selected=""){
  const list=(state.machines||[]).filter(m=>m.type===type&&m.active!==false);
  return `<option value="">Keine Maschine ausgewählt</option>`+list.map(m=>`<option value="${m.id}" ${m.id===selected?"selected":""}>${esc(m.name)}</option>`).join("");
}
function getMachine(){
  const id=$("machineSelect")?.value;
  return (state.machines||[]).find(m=>m.id===id)||null;
}
function renderMachines(){
  const box=$("machineList");if(!box)return;
  box.innerHTML=(state.machines||[]).map(m=>`<div class="machine-row card"><div><strong>${esc(m.name)}</strong><small>${m.type==="laser"?"Laser":"3D-Druck"}</small></div>${m.type==="laser"?`<label>Gravur €/Min.<input data-machine-rate="engraveRate" data-machine-id="${m.id}" type="number" min="0" step="any" value="${num(m.engraveRate)}"></label><label>Schnitt €/Min.<input data-machine-rate="cutRate" data-machine-id="${m.id}" type="number" min="0" step="any" value="${num(m.cutRate)}"></label>`:`<label>Kosten €/Std.<input data-machine-rate="hourlyRate" data-machine-id="${m.id}" type="number" min="0" step="any" value="${num(m.hourlyRate)}"></label>`}</div>`).join("");
  document.querySelectorAll("[data-machine-rate]").forEach(el=>el.oninput=()=>{const m=state.machines.find(x=>x.id===el.dataset.machineId);if(m){m[el.dataset.machineRate]=num(el.value);save();}});
}
function captureCalculatorFields(){
  const fields={};
  document.querySelectorAll("#calcForm input,#calcForm select,#calcForm textarea").forEach(el=>{if(el.id)fields[el.id]=el.value;});
  return fields;
}
function applyCalculatorFields(fields={}){
  Object.entries(fields).forEach(([id,value])=>{const el=$(id);if(el)el.value=value;});
  calculate();
}
const titles={ "3d":"3D-Druck","laser":"Laser","vinyl":"Vinylfolie","textil":"Textilfolie" };
function options(area){
  return `<option value="">Material auswählen</option>`+state.materials.filter(m=>m.area===area&&m.mainRole!==false).map(m=>`<option value="${m.id}">${esc(m.name)} – ${euro(m.unitPrice)}/${esc(m.unit)}</option>`).join("");
}
function infoRow(label,id,unit){
  return `<div class="info-line">${label}: <strong id="${id}">0,00 €</strong> ${unit||""}</div>`;
}


let consumableSelections=[];
let productSize="medium";
function moduleApplies(mat,type=state.activeModule){return (mat.consumableModules||["3d","laser","vinyl","textil"]).includes(type);}
function sizeFactor(mat,size=productSize){
  if(size==="custom")return 1;
  return num(mat.sizeFactors?.[size])||({small:0.5,medium:1,large:2}[size]||1);
}
function defaultQty(mat,size=productSize){
  if(size==="custom")return num(mat.consumptionLevels?.medium)||num(mat.defaultConsumption);
  return num(mat.consumptionLevels?.[size])||num(mat.defaultConsumption);
}
function workshopUnit(mat){return mat?.workshopUnit||mat?.unit||"Einheit";}
function workshopCost(mat,quantity){return (mat?.unitPrice||0)*(num(mat?.workshopUnitAmount)||1)*num(quantity);}
function autoConsumables(type=state.activeModule){
  return state.materials.filter(m=>m.consumableRole&&m.autoAdd&&moduleApplies(m,type)).sort((a,b)=>(b.favorite-a.favorite)||a.name.localeCompare(b.name));
}
function initializeConsumables(force=false){
  if(force)consumableSelections=[];
  const existing=new Map(consumableSelections.map(r=>[r.materialId,r]));
  autoConsumables().forEach(mat=>{
    if(!existing.has(mat.id))consumableSelections.push({materialId:mat.id,quantity:defaultQty(mat),auto:true});
  });
  consumableSelections=consumableSelections.filter(r=>{
    const mat=state.materials.find(m=>m.id===r.materialId);
    return !r.auto || (mat&&mat.autoAdd&&moduleApplies(mat));
  });
}
function consumableOptions(selectedId=""){
  const items=state.materials.filter(m=>m.consumableRole&&moduleApplies(m)).sort((a,b)=>(b.favorite-a.favorite)||a.name.localeCompare(b.name));
  return `<option value="">Verbrauchsmaterial auswählen</option>`+items.map(m=>`<option value="${m.id}" ${m.id===selectedId?"selected":""}>${m.favorite?"★ ":""}${esc(m.name)} – ${euro(m.unitPrice)}/${esc(m.unit)}</option>`).join("");
}
function renderConsumables(){
  const box=$("consumableRows"); if(!box)return;
  if(!consumableSelections.length){box.innerHTML='<div class="consumable-empty">Noch kein Verbrauchsmaterial hinzugefügt.</div>';return;}
  box.innerHTML=consumableSelections.map((row,index)=>{
    const mat=state.materials.find(m=>m.id===row.materialId);
    return `<div class="consumable-row"><label>Material<select data-consumable-select="${index}">${consumableOptions(row.materialId)}</select>${mat?`<small>${esc(mat.consumableCategory||"Sonstiges")} · ${euro(workshopCost(mat,1))} je ${esc(workshopUnit(mat))}${row.auto?" · automatisch":""}</small>`:""}</label><label>${mat?esc(workshopUnit(mat)):"Menge"}<input data-consumable-qty="${index}" type="number" min="0" step="any" inputmode="decimal" value="${row.quantity}"></label><button type="button" class="remove-consumable" data-consumable-remove="${index}">×</button></div>`;
  }).join("");
  document.querySelectorAll("[data-consumable-select]").forEach(el=>el.oninput=()=>{
    const row=consumableSelections[+el.dataset.consumableSelect];row.materialId=el.value;row.auto=false;
    const mat=state.materials.find(m=>m.id===el.value);if(mat&&num(row.quantity)<=0)row.quantity=defaultQty(mat);
    renderConsumables();calculate();
  });
  document.querySelectorAll("[data-consumable-qty]").forEach(el=>el.oninput=()=>{const row=consumableSelections[+el.dataset.consumableQty];row.quantity=num(el.value);row.auto=false;calculate();});
  document.querySelectorAll("[data-consumable-remove]").forEach(btn=>btn.onclick=()=>{consumableSelections.splice(+btn.dataset.consumableRemove,1);renderConsumables();calculate();});
}
function consumablesCost(){return consumableSelections.reduce((sum,row)=>{const mat=state.materials.find(m=>m.id===row.materialId);return sum+workshopCost(mat,row.quantity);},0);}
$("addConsumableBtn").onclick=()=>{consumableSelections.push({materialId:"",quantity:0,auto:false});renderConsumables();};
function setProductSize(size){
  const previous=productSize;productSize=size;
  document.querySelectorAll("[data-product-size]").forEach(b=>b.classList.toggle("active",b.dataset.productSize===size));
  if(size!=="custom")consumableSelections.forEach(row=>{
    const mat=state.materials.find(m=>m.id===row.materialId);
    if(mat&&row.auto)row.quantity=defaultQty(mat,size);
  });
  renderConsumables();calculate();
}
document.querySelectorAll("[data-product-size]").forEach(b=>b.onclick=()=>setProductSize(b.dataset.productSize));
function renderCalculator(clear=false){
  const type=state.activeModule||"3d";
  if(clear){consumableSelections=[];productSize="medium";}
  initializeConsumables(clear);
  $("calcTitle").textContent=titles[type];
  document.querySelectorAll("[data-tab]").forEach(b=>b.classList.toggle("active",b.dataset.tab===type));
  document.querySelectorAll("[data-product-size]").forEach(b=>b.classList.toggle("active",b.dataset.productSize===productSize));
  $("projectName").value=clear?"":$("projectName").value;
  $("customerName").value=clear?"":$("customerName").value;
  if(clear){
    editingProjectId=null;
    if($("customerAddress")) $("customerAddress").value="";
    if($("projectNotes")) $("projectNotes").value="";
    if($("projectStatus")) $("projectStatus").value="open";
    if($("projectTags")) $("projectTags").value="";
    setTimerSeconds(0);
  }

  let html="";
  if(type==="3d") html=`
    <div class="group-title">MATERIAL & MASCHINE</div>
    <label>Drucker auswählen<select id="machineSelect">${machineOptions("3d")}</select></label>
    <label>Material auswählen<select id="matMain">${options("3D-Druck")}</select></label>
    ${infoRow("Preis aus Datenbank","priceMain")}
    <div class="field-grid">
      <label>Filamentverbrauch (g)<input id="usageMain" type="number" min="0" step="any" inputmode="decimal" value="${clear?"":129}"></label>
      <label>Druckdauer (Minuten)<input id="printMinutes" type="number" min="0" step="any" inputmode="decimal" value="${clear?"":400}"></label>
      <div class="machine-rate-display">Maschinenkosten: <strong id="machineRateDisplay">0,00 € / Std.</strong></div>
      <label>Arbeitszeit (Minuten)<input id="workMinutes" type="number" min="0" step="any" inputmode="decimal" value="${clear?"":0}"></label>
      <label>Stundenlohn (€/Stunde)<input id="hourlyRate" type="number" min="0" step="any" inputmode="decimal" value="${state.settings.hourly}"></label>
      <label>Verpackung (€)<input id="packaging" type="number" min="0" step="any" inputmode="decimal" value="${state.settings.packaging}"></label>
      <label>Sonstige Kosten (€)<input id="otherCosts" type="number" min="0" step="any" inputmode="decimal" value="${clear?"":0}"></label>
      <label>Fehlerreserve (%)<input id="reserve" type="number" min="0" step="any" inputmode="decimal" value="${state.settings.reserve}"></label>
      <label>Gewinnaufschlag (%)<input id="profit" type="number" min="0" step="any" inputmode="decimal" value="${state.settings.profit}"></label>
    </div>`;

  if(type==="laser") html=`
    <div class="group-title">MATERIAL & MASCHINE</div>
    <label>Laser auswählen<select id="machineSelect">${machineOptions("laser")}</select></label>
    <label>Material auswählen<select id="matMain">${options("Laser")}</select></label>
    ${infoRow("Preis aus Datenbank","priceMain")}
    <div class="field-grid">
      <label>Verbrauchte Fläche / Menge<input id="usageMain" type="number" min="0" step="any" inputmode="decimal" value="${clear?"":300}"></label>
      <label>Gravurdauer (Minuten)<input id="engraveMinutes" type="number" min="0" step="any" inputmode="decimal" value="${clear?"":20}"></label>
      <label>Schnittdauer (Minuten)<input id="cutMinutes" type="number" min="0" step="any" inputmode="decimal" value="${clear?"":10}"></label>
      <div class="machine-rate-display">Gravur: <strong id="engraveRateDisplay">0,00 € / Min.</strong></div>
      <div class="machine-rate-display">Schnitt: <strong id="cutRateDisplay">0,00 € / Min.</strong></div>
      <label>Arbeitszeit (Minuten)<input id="workMinutes" type="number" min="0" step="any" inputmode="decimal" value="${clear?"":10}"></label>
      <label>Stundenlohn (€/Stunde)<input id="hourlyRate" type="number" min="0" step="any" inputmode="decimal" value="${state.settings.hourly}"></label>
      <label>Verpackung (€)<input id="packaging" type="number" min="0" step="any" inputmode="decimal" value="${state.settings.packaging}"></label>
      <label>Sonstige Kosten (€)<input id="otherCosts" type="number" min="0" step="any" inputmode="decimal" value="${clear?"":0}"></label>
      <label>Fehlerreserve (%)<input id="reserve" type="number" min="0" step="any" inputmode="decimal" value="${state.settings.reserve}"></label>
      <label>Gewinnaufschlag (%)<input id="profit" type="number" min="0" step="any" inputmode="decimal" value="${state.settings.profit}"></label>
    </div>`;

  if(type==="vinyl") html=`
    <div class="group-title">VINYL & ÜBERTRAGUNGSFOLIE</div>
    <label>Vinyl auswählen<select id="matMain">${options("Vinylfolie")}</select></label>
    ${infoRow("Vinylpreis","priceMain")}
    <div class="field-grid">
      <label>Vinylfläche / Verbrauch<input id="usageMain" type="number" min="0" step="any" inputmode="decimal" value="${clear?"":400}"></label>
    </div>
    <label>Übertragungsfolie auswählen<select id="matTransfer">${options("Übertragungsfolie")}</select></label>
    ${infoRow("Preis Übertragungsfolie","priceTransfer")}
    <div class="field-grid">
      <label>Fläche Übertragungsfolie<input id="usageTransfer" type="number" min="0" step="any" inputmode="decimal" value="${clear?"":400}"></label>
      <label>Plottdauer (Minuten)<input id="plotMinutes" type="number" min="0" step="any" inputmode="decimal" value="${clear?"":5}"></label>
      <label>Plotterkosten (€/Minute)<input id="plotRate" type="number" min="0" step="any" inputmode="decimal" value="${state.settings.plotter}"></label>
      <label>Entgitterzeit (Minuten)<input id="weedMinutes" type="number" min="0" step="any" inputmode="decimal" value="${clear?"":15}"></label>
      <label>Montage-/Klebezeit (Minuten)<input id="mountMinutes" type="number" min="0" step="any" inputmode="decimal" value="${clear?"":10}"></label>
      <label>Stundenlohn (€/Stunde)<input id="hourlyRate" type="number" min="0" step="any" inputmode="decimal" value="${state.settings.hourly}"></label>
      <label>Verpackung (€)<input id="packaging" type="number" min="0" step="any" inputmode="decimal" value="${state.settings.packaging}"></label>
      <label>Sonstige Kosten (€)<input id="otherCosts" type="number" min="0" step="any" inputmode="decimal" value="${clear?"":0}"></label>
      <label>Fehlerreserve (%)<input id="reserve" type="number" min="0" step="any" inputmode="decimal" value="${state.settings.reserve}"></label>
      <label>Gewinnaufschlag (%)<input id="profit" type="number" min="0" step="any" inputmode="decimal" value="${state.settings.profit}"></label>
      <label>Stückzahl<input id="quantity" type="number" min="1" step="1" inputmode="numeric" value="${clear?"":1}"></label>
    </div>`;

  if(type==="textil") html=`
    <div class="group-title">TEXTIL & FOLIE</div>
    <div class="field-grid">
      <label>Textilpreis pro Stück (€)<input id="textilePrice" type="number" min="0" step="any" inputmode="decimal" value="${clear?"":5}"></label>
      <label>Stückzahl<input id="quantity" type="number" min="1" step="1" inputmode="numeric" value="${clear?"":1}"></label>
    </div>
    <label>Textilfolie auswählen<select id="matMain">${options("Textilfolie")}</select></label>
    ${infoRow("Folienpreis","priceMain")}
    <div class="field-grid">
      <label>Folienfläche je Farbe/Stück<input id="usageMain" type="number" min="0" step="any" inputmode="decimal" value="${clear?"":400}"></label>
      <label>Anzahl Farben<input id="colors" type="number" min="1" step="1" inputmode="numeric" value="${clear?"":1}"></label>
      <label>Plottdauer je Stück (Minuten)<input id="plotMinutes" type="number" min="0" step="any" inputmode="decimal" value="${clear?"":5}"></label>
      <label>Plotterkosten (€/Minute)<input id="plotRate" type="number" min="0" step="any" inputmode="decimal" value="${state.settings.plotter}"></label>
      <label>Entgitterzeit je Stück (Minuten)<input id="weedMinutes" type="number" min="0" step="any" inputmode="decimal" value="${clear?"":15}"></label>
      <label>Presszeit je Stück (Minuten)<input id="pressMinutes" type="number" min="0" step="any" inputmode="decimal" value="${clear?"":3}"></label>
      <label>Pressenkosten (€/Minute)<input id="pressRate" type="number" min="0" step="any" inputmode="decimal" value="${state.settings.presse}"></label>
      <label>Vor-/Nachbereitung je Stück (Minuten)<input id="prepMinutes" type="number" min="0" step="any" inputmode="decimal" value="${clear?"":10}"></label>
      <label>Stundenlohn (€/Stunde)<input id="hourlyRate" type="number" min="0" step="any" inputmode="decimal" value="${state.settings.hourly}"></label>
      <label>Verpackung gesamt (€)<input id="packaging" type="number" min="0" step="any" inputmode="decimal" value="${state.settings.packaging}"></label>
      <label>Sonstige Kosten (€)<input id="otherCosts" type="number" min="0" step="any" inputmode="decimal" value="${clear?"":0}"></label>
      <label>Fehlerreserve (%)<input id="reserve" type="number" min="0" step="any" inputmode="decimal" value="${state.settings.reserve}"></label>
      <label>Gewinnaufschlag (%)<input id="profit" type="number" min="0" step="any" inputmode="decimal" value="${state.settings.profit}"></label>
    </div>`;

  $("moduleFields").innerHTML=html;
  renderConsumables();
  document.querySelectorAll("#calcForm input,#calcForm select").forEach(el=>el.oninput=calculate);
  calculate();
}
$("resetCalcBtn").onclick=()=>{if(confirm("Aktuelle Eingaben wirklich leeren?"))startNewOrder(state.activeModule)};

function getMat(id){
  const el=$(id); if(!el) return null;
  return state.materials.find(m=>m.id===el.value)||null;
}
function rounded(v){
  const step=num(state.settings.rounding)||0.01;
  return Math.ceil(v/step)*step;
}
function calculate(){
  const type=state.activeModule;
  const main=getMat("matMain"),transfer=getMat("matTransfer");
  const unitMain=main?.unitPrice||0,unitTransfer=transfer?.unitPrice||0;
  if($("priceMain")) $("priceMain").textContent=main?`${euro(unitMain)} / ${main.unit}`:"0,00 €";
  if($("priceTransfer")) $("priceTransfer").textContent=transfer?`${euro(unitTransfer)} / ${transfer.unit}`:"0,00 €";

  let material=0,machine=0,work=0,extra=0,qty=1;
  const consumables=consumablesCost();

  if(type==="3d"){
    const selectedMachine=getMachine();
    const rate=num(selectedMachine?.hourlyRate);
    if($("machineRateDisplay")) $("machineRateDisplay").textContent=`${euro(rate)} / Std.`;
    material=unitMain*num($("usageMain")?.value);
    machine=(num($("printMinutes")?.value)/60)*rate;
    work=(num($("workMinutes")?.value)/60)*num($("hourlyRate")?.value);
    extra=num($("packaging")?.value)+num($("otherCosts")?.value);
  }
  if(type==="laser"){
    const selectedMachine=getMachine();
    const engraveRate=num(selectedMachine?.engraveRate),cutRate=num(selectedMachine?.cutRate);
    if($("engraveRateDisplay")) $("engraveRateDisplay").textContent=`${euro(engraveRate)} / Min.`;
    if($("cutRateDisplay")) $("cutRateDisplay").textContent=`${euro(cutRate)} / Min.`;
    material=unitMain*num($("usageMain")?.value);
    machine=num($("engraveMinutes")?.value)*engraveRate+num($("cutMinutes")?.value)*cutRate;
    work=(num($("workMinutes")?.value)/60)*num($("hourlyRate")?.value);
    extra=num($("packaging")?.value)+num($("otherCosts")?.value);
  }
  if(type==="vinyl"){
    qty=Math.max(1,num($("quantity")?.value));
    material=unitMain*num($("usageMain")?.value)+unitTransfer*num($("usageTransfer")?.value);
    machine=num($("plotMinutes")?.value)*num($("plotRate")?.value);
    work=((num($("weedMinutes")?.value)+num($("mountMinutes")?.value))/60)*num($("hourlyRate")?.value);
    extra=num($("packaging")?.value)+num($("otherCosts")?.value);
  }
  if(type==="textil"){
    qty=Math.max(1,num($("quantity")?.value));
    const colors=Math.max(1,num($("colors")?.value));
    material=(unitMain*num($("usageMain")?.value)*colors*qty)+(num($("textilePrice")?.value)*qty);
    machine=(num($("plotMinutes")?.value)*num($("plotRate")?.value)*qty)+(num($("pressMinutes")?.value)*num($("pressRate")?.value)*qty);
    work=((num($("weedMinutes")?.value)+num($("prepMinutes")?.value))*qty/60)*num($("hourlyRate")?.value);
    extra=num($("packaging")?.value)+num($("otherCosts")?.value);
  }

  const base=material+consumables+machine+work+extra;
  const reserve=base*num($("reserve")?.value)/100;
  const cost=base+reserve;
  const profit=cost*num($("profit")?.value)/100;
  const sale=rounded(cost+profit);

  $("resMaterial").textContent=euro(material);
  $("resConsumables").textContent=euro(consumables);
  $("resMachine").textContent=euro(machine);
  $("resWork").textContent=euro(work);
  $("resExtra").textContent=euro(extra);
  $("resReserve").textContent=euro(reserve);
  $("resCost").textContent=euro(cost);
  $("resProfit").textContent=euro(Math.max(0,sale-cost));
  $("resSale").textContent=euro(sale);
  $("resPerPiece").textContent=qty>1?`${euro(sale/qty)} je Stück`:"";
  $("calcForm").dataset.sale=sale;
  $("calcForm").dataset.cost=cost;
  $("calcForm").dataset.qty=qty;
}
$("calcForm").onsubmit=e=>{
  e.preventDefault();calculate();
  const title=$("projectName").value.trim()||`${titles[state.activeModule]} ${new Date().toLocaleDateString("de-DE")}`;
  const machine=getMachine();
  const existingProject=editingProjectId?state.projects.find(p=>p.id===editingProjectId):null;
  const saleNow=num($("calcForm").dataset.sale),costNow=num($("calcForm").dataset.cost);const history=[...(existingProject?.priceHistory||[])];if(!existingProject||num(existingProject.sale)!==saleNow||num(existingProject.cost)!==costNow)history.unshift({date:new Date().toISOString(),sale:saleNow,cost:costNow});
  const project={id:editingProjectId||uid(),title,customer:$("customerName").value.trim(),customerAddress:$("customerAddress")?.value.trim()||"",type:titles[state.activeModule],module:state.activeModule,machineId:machine?.id||"",machineName:machine?.name||"",notes:$("projectNotes")?.value.trim()||"",status:$("projectStatus")?.value||"open",tags:($("projectTags")?.value||"").split(",").map(x=>x.trim()).filter(Boolean),images:existingProject?.images||[],image:null,priceHistory:history,workSeconds:getTimerSeconds(),sale:saleNow,cost:costNow,qty:num($("calcForm").dataset.qty)||1,productSize,consumables:consumableSelections.filter(r=>r.materialId&&num(r.quantity)>0).map(r=>({materialId:r.materialId,quantity:num(r.quantity)})),fields:captureCalculatorFields(),created:editingProjectId?(state.projects.find(p=>p.id===editingProjectId)?.created||new Date().toISOString()):new Date().toISOString(),updated:new Date().toISOString()};
  const idx=state.projects.findIndex(p=>p.id===project.id);
  if(idx>=0)state.projects[idx]=project;else state.projects.unshift(project);
  const usedIds=[project.fields?.matMain,project.fields?.matTransfer,...project.consumables.map(r=>r.materialId)].filter(Boolean);
  state.materials.forEach(m=>{if(usedIds.includes(m.id))m.lastUsed=new Date().toISOString()});
  state.lastPrice=project.sale;editingProjectId=null;save();renderProjects();alert(idx>=0?"Projekt aktualisiert.":"Projekt gespeichert.");
};


function allMaterialOptions(){
  return `<option value="">Kein Material</option>`+
    state.materials
      .slice()
      .sort((a,b)=>a.name.localeCompare(b.name))
      .map(m=>`<option value="${m.id}">${esc(m.name)} – ${euro(m.unitPrice)}/${esc(m.unit)}</option>`)
      .join("");
}
function renderTools(){
  if($("qcMaterial")){
    const old=$("qcMaterial").value;
    $("qcMaterial").innerHTML=allMaterialOptions();
    if([...$("qcMaterial").options].some(o=>o.value===old)) $("qcMaterial").value=old;
    $("qcHourly").value=state.settings.hourly;
    $("qcReserve").value=state.settings.reserve;
    $("qcProfitPercent").value=state.settings.profit;
    $("qcPackaging").value=state.settings.packaging;
  }
  calculatePriceCheck();
  calculateProfitTool();
  calculateDiscountTool();
  calculateQuickTool();
  renderAreaMaterials();
  calculateAreaTool();
}
document.querySelectorAll("[data-tool]").forEach(btn=>btn.onclick=()=>{
  document.querySelectorAll("[data-tool]").forEach(b=>b.classList.toggle("active",b===btn));
  document.querySelectorAll(".tool-panel").forEach(p=>p.classList.toggle("active",p.id===btn.dataset.tool));
});
function calculatePriceCheck(){
  if(!$("pcCosts"))return;
  const costs=num($("pcCosts").value),price=num($("pcMaxPrice").value),target=num($("pcTargetMargin")?.value);
  const profit=price-costs;
  const margin=price>0?(profit/price)*100:0;
  const markup=costs>0?(profit/costs)*100:0;
  const minimum=target<100?costs/(1-target/100):0;
  $("pcProfit").textContent=euro(profit);
  $("pcMarkup").textContent=`${markup.toLocaleString("de-DE",{minimumFractionDigits:1,maximumFractionDigits:1})} %`;
  $("pcMargin").textContent=`${margin.toLocaleString("de-DE",{minimumFractionDigits:1,maximumFractionDigits:1})} %`;
  $("pcMinimum").textContent=euro(rounded(minimum));
  const status=$("pcStatus");status.className="";
  if(profit<0){status.textContent="Verlust";status.classList.add("status-bad")}
  else if(margin+0.0001>=target){status.textContent="Zielmarge erreicht";status.classList.add("status-good")}
  else{status.textContent="Unter deiner Zielmarge";status.classList.add("status-neutral")}
}
function calculateProfitTool(){
  if(!$("gcCosts"))return;
  const costs=num($("gcCosts").value),percent=num($("gcPercent").value);
  const profit=costs*percent/100;
  $("gcProfit").textContent=euro(profit);
  $("gcSale").textContent=euro(rounded(costs+profit));
}
function calculateDiscountTool(){
  if(!$("dcTarget"))return;
  const target=num($("dcTarget").value),percent=num($("dcPercent").value);
  const factor=1-percent/100;
  const original=factor>0?target/factor:0;
  $("dcOriginal").textContent=euro(original);
  $("dcAmount").textContent=euro(Math.max(0,original-target));
}
function calculateQuickTool(){
  if(!$("qcMaterial"))return;
  const mat=state.materials.find(m=>m.id===$("qcMaterial").value);
  const material=(mat?.unitPrice||0)*num($("qcUsage").value);
  const work=(num($("qcMinutes").value)/60)*num($("qcHourly").value);
  const base=material+work+num($("qcExtra").value)+num($("qcPackaging").value);
  const reserve=base*num($("qcReserve").value)/100;
  const costs=base+reserve;
  const sale=rounded(costs*(1+num($("qcProfitPercent").value)/100));
  $("qcMaterialCost").textContent=euro(material);
  $("qcWorkCost").textContent=euro(work);
  $("qcCosts").textContent=euro(costs);
  $("qcSale").textContent=euro(sale);
}
["pcCosts","pcMaxPrice","pcTargetMargin"].forEach(id=>$(id)?.addEventListener("input",calculatePriceCheck));
["gcCosts","gcPercent"].forEach(id=>$(id)?.addEventListener("input",calculateProfitTool));
["dcTarget","dcPercent"].forEach(id=>$(id)?.addEventListener("input",calculateDiscountTool));
["qcMaterial","qcUsage","qcMinutes","qcExtra","qcPackaging","qcHourly","qcReserve","qcProfitPercent"].forEach(id=>$(id)?.addEventListener("input",calculateQuickTool));

let lastAreaResult={netCm2:0,grossCm2:0};
function areaNumber(value,digits=2){
  return num(value).toLocaleString("de-DE",{minimumFractionDigits:0,maximumFractionDigits:digits});
}
function areaUnitToCm(value,unit){
  const factor=unit==="mm"?0.1:unit==="m"?100:1;
  return num(value)*factor;
}
function toggleAreaShapeFields(){
  const shape=$("acShape")?.value||"rectangle";
  $("acRectangleFields")?.classList.toggle("hidden",shape!=="rectangle");
  $("acSquareFields")?.classList.toggle("hidden",shape!=="square");
  $("acCircleFields")?.classList.toggle("hidden",shape!=="circle");
}
function calculateAreaTool(){
  if(!$("acShape"))return;
  toggleAreaShapeFields();
  const shape=$("acShape").value,unit=$("acUnit").value;
  let perPiece=0;
  if(shape==="rectangle"){
    perPiece=areaUnitToCm($("acWidth").value,unit)*areaUnitToCm($("acHeight").value,unit);
  }else if(shape==="square"){
    const side=areaUnitToCm($("acSide").value,unit);perPiece=side*side;
  }else{
    const radius=areaUnitToCm($("acDiameter").value,unit)/2;perPiece=Math.PI*radius*radius;
  }
  const quantity=Math.max(1,Math.floor(num($("acQuantity").value)||1));
  const net=perPiece*quantity;
  const waste=net*Math.max(0,num($("acWaste").value))/100;
  const gross=net+waste;
  lastAreaResult={netCm2:net,grossCm2:gross};
  $("acPerPiece").textContent=`${areaNumber(perPiece)} cm²`;
  $("acNetTotal").textContent=`${areaNumber(net)} cm²`;
  $("acWasteArea").textContent=`${areaNumber(waste)} cm²`;
  $("acGrossTotal").textContent=`${areaNumber(gross)} cm²`;
  $("acGrossMeters").textContent=`${areaNumber(gross/10000,4)} m²`;
}
function areaMaterials(){
  return state.materials.filter(m=>m.mainRole!==false&&["cm²","m²"].includes(m.unit));
}
function renderAreaMaterials(){
  if(!$("acMaterial"))return;
  const old=$("acMaterial").value;
  const mats=areaMaterials().sort((a,b)=>a.name.localeCompare(b.name));
  $("acMaterial").innerHTML=mats.length
    ? `<option value="">Material auswählen</option>`+mats.map(m=>`<option value="${m.id}">${esc(m.name)} – ${esc(m.unit)}</option>`).join("")
    : `<option value="">Kein Flächenmaterial vorhanden</option>`;
  if(mats.some(m=>m.id===old))$("acMaterial").value=old;
  $("acTransferBtn").disabled=!mats.length;
}
function moduleFromMaterialArea(area){
  if(area==="3D-Druck")return "3d";
  if(area==="Laser")return "laser";
  if(area==="Vinylfolie"||area==="Übertragungsfolie")return "vinyl";
  if(area==="Textilfolie")return "textil";
  return state.activeModule||"laser";
}
function transferAreaToCalculator(){
  calculateAreaTool();
  const mat=state.materials.find(m=>m.id===$("acMaterial")?.value);
  if(!mat){alert("Bitte zuerst ein Flächenmaterial auswählen.");return;}
  state.activeModule=moduleFromMaterialArea(mat.area);
  save();setScreen("calculator");renderCalculator();
  requestAnimationFrame(()=>{
    if($("matMain"))$("matMain").value=mat.id;
    const usage=mat.unit==="m²"?lastAreaResult.grossCm2/10000:lastAreaResult.grossCm2;
    if($("usageMain"))$("usageMain").value=Number(usage.toFixed(mat.unit==="m²"?6:2));
    calculate();
    $("usageMain")?.scrollIntoView({behavior:"smooth",block:"center"});
  });
}
["acShape","acUnit","acWidth","acHeight","acSide","acDiameter","acQuantity","acWaste"].forEach(id=>$(id)?.addEventListener("input",calculateAreaTool));
$("acTransferBtn")?.addEventListener("click",transferAreaToCalculator);


function compressProjectImage(file){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onerror=reject;
    reader.onload=()=>{
      const img=new Image();
      img.onerror=reject;
      img.onload=()=>{
        const max=1200,scale=Math.min(1,max/Math.max(img.width,img.height));
        const canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));
        const ctx=canvas.getContext("2d");ctx.drawImage(img,0,0,canvas.width,canvas.height);
        resolve(canvas.toDataURL("image/jpeg",0.78));
      };
      img.src=reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function projectStatusLabel(status){
  return ({open:"Offen",progress:"In Arbeit",payment:"Wartet auf Zahlung",done:"Abgeschlossen"})[status]||"Offen";
}
function projectStatusClass(status){return `status-${["open","progress","payment","done"].includes(status)?status:"open"}`;}
function renderProjects(){
  const term=($('projectSearch')?.value||'').trim().toLowerCase();
  const filter=$('projectStatusFilter')?.value||'all';
  const sort=$('projectSort')?.value||'updated';
  const list=state.projects.filter(p=>{
    const matchesText=!term||`${p.title} ${p.customer||''} ${p.type||''} ${p.machineName||''} ${p.notes||''} ${(p.tags||[]).join(' ')}`.toLowerCase().includes(term);
    const matchesStatus=filter==='all'||(p.status||'open')===filter;
    return matchesText&&matchesStatus;
  }).sort((a,b)=>{
    if(Boolean(a.pinned)!==Boolean(b.pinned))return a.pinned?-1:1;
    if(sort==='name')return String(a.title||'').localeCompare(String(b.title||''),'de');
    if(sort==='customer')return String(a.customer||'').localeCompare(String(b.customer||''),'de');
    if(sort==='price')return num(b.sale)-num(a.sale);
    if(sort==='created')return new Date(b.created)-new Date(a.created);
    return new Date(b.updated||b.created)-new Date(a.updated||a.created);
  });
  const totalProfit=state.projects.reduce((sum,p)=>sum+num(p.sale)-num(p.cost),0);
  if($('projectStatCount'))$('projectStatCount').textContent=state.projects.length;
  if($('projectStatProfit'))$('projectStatProfit').textContent=euro(totalProfit);
  if($('projectStatAverage'))$('projectStatAverage').textContent=state.projects.length?euro(state.projects.reduce((sum,p)=>sum+num(p.sale),0)/state.projects.length):euro(0);
  $('projectList').innerHTML=list.length?list.map(p=>`
    <article class="card project-item" data-project-card="${p.id}">
      ${(p.images||[])[0]?`<button class="project-thumb" type="button" data-view-project="${p.id}" aria-label="Projekt ansehen"><img src="${p.images[0]}" alt=""></button>`:''}
      <div class="item-top"><div><div class="item-title">${p.pinned?"📌 ":""}${esc(p.title)}</div><div class="item-meta">${esc(p.type)}${p.machineName?' · '+esc(p.machineName):''}${p.customer?' · '+esc(p.customer):''} · ${new Date(p.created).toLocaleDateString('de-DE')}</div></div><div class="item-price">${euro(p.sale)}</div></div>
      <div class="project-status-row"><span class="project-status ${projectStatusClass(p.status)}">${projectStatusLabel(p.status)}</span></div>
      ${(p.tags||[]).length?`<div class="tag-row">${p.tags.map(t=>`<span>#${esc(t)}</span>`).join('')}</div>`:''}${p.notes?`<div class="project-notes">${esc(p.notes)}</div>`:''}
      <div class="item-actions project-actions"><button type="button" data-view-project="${p.id}" class="primary">Ansehen</button><button type="button" data-edit-project="${p.id}">Bearbeiten</button><button type="button" data-pin-project="${p.id}">${p.pinned?"Lösen":"Anheften"}</button><button type="button" data-template-project="${p.id}">Als Vorlage</button><button type="button" data-duplicate-project="${p.id}">Duplizieren</button><button type="button" data-del-project="${p.id}" class="danger">Löschen</button></div>
    </article>`).join(''):`<div class="empty-state">Keine passenden Projekte gefunden.</div>`;
  document.querySelectorAll('[data-view-project]').forEach(b=>b.onclick=e=>{e.stopPropagation();viewProject(b.dataset.viewProject)});
  document.querySelectorAll('[data-project-card]').forEach(card=>card.onclick=e=>{if(!e.target.closest('button'))viewProject(card.dataset.projectCard)});
  document.querySelectorAll('[data-edit-project]').forEach(b=>b.onclick=e=>{e.stopPropagation();loadProject(b.dataset.editProject,false)});
  document.querySelectorAll('[data-duplicate-project]').forEach(b=>b.onclick=e=>{e.stopPropagation();loadProject(b.dataset.duplicateProject,true)});
  document.querySelectorAll('[data-pin-project]').forEach(b=>b.onclick=e=>{e.stopPropagation();const p=state.projects.find(x=>x.id===b.dataset.pinProject);if(p){p.pinned=!p.pinned;p.updated=new Date().toISOString();save();renderProjects();}});
  document.querySelectorAll('[data-template-project]').forEach(b=>b.onclick=e=>{e.stopPropagation();createTemplateFromProject(b.dataset.templateProject)});
  document.querySelectorAll('[data-del-project]').forEach(b=>b.onclick=e=>{e.stopPropagation();if(confirm('Projekt löschen?')){state.projects=state.projects.filter(p=>p.id!==b.dataset.delProject);save();renderProjects();updateHome()}});
}
function projectFieldLabel(id){
  return ({matMain:"Hauptmaterial",matTransfer:"Übertragungsfolie",usageMain:"Materialverbrauch",usageTransfer:"Verbrauch Übertragungsfolie",printMinutes:"Druckdauer",engraveMinutes:"Gravurdauer",cutMinutes:"Schnittdauer",workMinutes:"Arbeitszeit",hourlyRate:"Stundenlohn",packaging:"Verpackung",otherCosts:"Sonstige Kosten",reserve:"Fehlerreserve",profit:"Gewinnaufschlag",quantity:"Stückzahl",colors:"Farben",plotMinutes:"Plottdauer",weedMinutes:"Entgitterzeit",mountMinutes:"Montagezeit",pressMinutes:"Presszeit",prepMinutes:"Vor-/Nachbereitung",textilePrice:"Textilpreis"})[id]||id;
}
function projectFieldValue(id,value){
  if(id==="matMain"||id==="matTransfer") return state.materials.find(m=>m.id===value)?.name||"–";
  if(id==="machineSelect") return state.machines.find(m=>m.id===value)?.name||"–";
  return value===""?"–":value;
}
function viewProject(id){
  const p=state.projects.find(x=>x.id===id);
  if(!p){alert("Projekt wurde nicht gefunden.");return;}
  const dialog=$("projectViewDialog");
  const details=Object.entries(p.fields||{}).filter(([fieldId])=>!["projectName","customerName","projectNotes","machineSelect","projectStatus","projectTags"].includes(fieldId)).map(([fieldId,value])=>`<div><span>${esc(projectFieldLabel(fieldId))}</span><strong>${esc(projectFieldValue(fieldId,value))}</strong></div>`).join("");
  const cons=(p.consumables||[]).map(r=>{const m=state.materials.find(x=>x.id===r.materialId);return m?`<div><span>${esc(m.name)}</span><strong>${num(r.quantity)} ${esc(workshopUnit(m))}</strong></div>`:""}).join("");
  $("projectViewTitle").textContent=p.title||"Projekt";
  $("projectViewContent").innerHTML=`
    ${(p.images||[]).length?`<div class="project-gallery">${p.images.map((img,i)=>`<figure><img class="project-view-image" src="${img}" alt="Projektbild ${i+1}"><button type="button" data-delete-image="${i}" class="image-delete" aria-label="Bild löschen">×</button></figure>`).join("")}</div>`:`<div class="project-image-empty">Noch kein Projektbild vorhanden.</div>`}
    <div class="project-image-actions"><label class="secondary file-button">＋ Bilder hinzufügen<input id="projectImageInput" type="file" accept="image/*" multiple></label></div>
    <div class="project-view-summary">
      <div><span>Kunde</span><strong>${esc(p.customer||"–")}</strong></div><div><span>Bereich</span><strong>${esc(p.type||"–")}</strong></div>
      <div><span>Maschine</span><strong>${esc(p.machineName||"–")}</strong></div><div><span>Datum</span><strong>${new Date(p.created||p.updated).toLocaleDateString("de-DE")}</strong></div>
      <div><span>Selbstkosten</span><strong>${euro(p.cost)}</strong></div><div><span>Gewinn</span><strong>${euro(num(p.sale)-num(p.cost))}</strong></div>
      <div class="project-view-final"><span>Verkaufspreis</span><strong>${euro(p.sale)}</strong></div>
    </div>
    ${(p.tags||[]).length?`<div class="tag-row">${p.tags.map(t=>`<span>#${esc(t)}</span>`).join("")}</div>`:""}
    ${p.notes?`<div class="project-view-notes"><b>Notizen</b><p>${esc(p.notes)}</p></div>`:""}
    ${details?`<h3>Kalkulationsdaten</h3><div class="project-view-details">${details}</div>`:""}
    ${cons?`<h3>Verbrauchsmaterial</h3><div class="project-view-details">${cons}</div>`:""}`;

  const statusSelect=$("projectViewStatusSelect");
  statusSelect.value=p.status||"open";
  statusSelect.onchange=()=>{
    p.status=statusSelect.value;
    p.updated=new Date().toISOString();
    save();renderProjects();updateHome();
  };
  $("projectViewEditBtn").onclick=()=>{dialog.close();loadProject(id,false)};
  $("offerPdfBtn").onclick=()=>printOffer(p);
  $("closeProjectViewBtn").onclick=()=>dialog.close();
  dialog.onclick=e=>{if(e.target===dialog)dialog.close()};
  $("projectImageInput")?.addEventListener("change",async e=>{
    const files=[...(e.target.files||[])];if(!files.length)return;
    try{
      p.images=p.images||[];
      for(const file of files.slice(0,Math.max(0,6-p.images.length)))p.images.push(await compressProjectImage(file));
      p.updated=new Date().toISOString();save();renderProjects();dialog.close();viewProject(id);
    }catch(err){console.error(err);alert("Mindestens ein Bild konnte nicht verarbeitet werden.")}
  });
  dialog.querySelectorAll("[data-delete-image]").forEach(btn=>btn.onclick=()=>{
    if(confirm("Dieses Projektbild löschen?")){p.images.splice(Number(btn.dataset.deleteImage),1);p.updated=new Date().toISOString();save();renderProjects();dialog.close();viewProject(id)}
  });
  try{if(!dialog.open)dialog.showModal()}catch(err){console.error(err);dialog.setAttribute("open","")}
}

function printOffer(p){
  const today=new Date();
  const date=today.toLocaleDateString("de-DE");
  const created=new Date(p.created||p.updated||Date.now());
  const offerNo=`A-${created.getFullYear()}-${String(created.getMonth()+1).padStart(2,"0")}${String(created.getDate()).padStart(2,"0")}-${String((p.id||"").replace(/\D/g,"").slice(-3)||"001").padStart(3,"0")}`;
  const service=esc(p.title||p.type||"Individuelle Anfertigung");
  const qty=Math.max(1,num(p.qty)||1);
  const unitPrice=num(p.sale)/qty;
  const address=(p.customerAddress||p.fields?.customerAddress||p.customer||"").trim();
  const addressHtml=address?address.split(/\r?\n/).map(esc).join("<br>"):"Kundenanschrift";
  const logoUrl=new URL("briefkopf-logo.png",window.location.href).href;

  const doc=`<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Angebot ${offerNo}</title><style>
    @page{size:A4;margin:10mm 16mm 14mm}
    *{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff;color:#17120e;font-family:Arial,Helvetica,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .sheet{width:100%;min-height:273mm;position:relative;padding-bottom:35mm;font-size:10.5pt}
    .letterhead{width:100%;height:auto;display:block;margin:0 auto 5mm;object-fit:contain}
    .gold-line{height:1.2px;background:#b8872f;margin:0 0 8mm}
    .sender{font-size:7.5pt;text-decoration:underline;color:#555;margin-bottom:3mm}
    .top-grid{display:grid;grid-template-columns:minmax(0,1fr) 58mm;gap:16mm;align-items:start;min-height:32mm;margin-bottom:7mm}
    .address{font-size:10.5pt;line-height:1.45}
    .meta{font-size:8.5pt}.meta-row{margin-bottom:3mm}.meta span,.meta strong{display:block}.meta span{color:#666;margin-bottom:1mm}.meta strong{font-size:10pt}
    h1{font:700 21pt Georgia,"Times New Roman",serif;margin:0 0 7mm}
    .subject{margin:0 0 5mm}.intro{margin:0 0 7mm;line-height:1.5}
    table{width:100%;border-collapse:collapse;margin:0 0 5mm}th{background:#f4f0e8;text-align:left;font-size:8.5pt;padding:3mm 2.5mm;border-bottom:1px solid #b8872f}td{padding:4mm 2.5mm;border-bottom:1px solid #d9cfbd;vertical-align:top}
    th:first-child,td:first-child{width:12mm}th:nth-child(3),td:nth-child(3){width:19mm;text-align:center}th:nth-child(4),td:nth-child(4),th:last-child,td:last-child{width:30mm;text-align:right}
    .total{display:flex;justify-content:flex-end;align-items:baseline;gap:12mm;padding:4mm 2.5mm;border-top:1.5px solid #b8872f;margin-bottom:8mm}.total span{font-size:11pt}.total strong{font-size:16pt;color:#765018}
    .notes{font-size:9pt;color:#333;line-height:1.5}.notes p{margin:1.5mm 0}.closing{margin-top:8mm;line-height:1.5}
    footer{position:absolute;left:0;right:0;bottom:0;border-top:1px solid #b8872f;padding-top:3mm;display:grid;grid-template-columns:1.05fr .95fr 1.35fr .45fr;gap:5mm;color:#333;font-size:7.4pt;line-height:1.35}
    footer strong{display:block;color:#17120e;margin-bottom:1mm}footer .page{text-align:right;white-space:nowrap}
    @media screen{body{padding:16px;background:#e9e9e9}.sheet{max-width:210mm;margin:auto;background:#fff;padding:10mm 16mm 14mm;box-shadow:0 4px 24px rgba(0,0,0,.18)}footer{left:16mm;right:16mm;bottom:14mm}.letterhead{max-height:49mm}}
    @media print{.sheet{min-height:273mm}.letterhead{max-height:49mm}}
  </style></head><body><main class="sheet">
    <img id="letterheadLogo" class="letterhead" src="${logoUrl}" alt="Daniel's Laser Art">
    <div class="gold-line"></div>
    <div class="sender">Daniel's Laser Art | Augasse 12 | 08393 Meerane</div>
    <section class="top-grid">
      <div class="address">${addressHtml}</div>
      <div class="meta"><div class="meta-row"><span>Angebotsnummer</span><strong>${offerNo}</strong></div><div class="meta-row"><span>Datum</span><strong>${date}</strong></div></div>
    </section>
    <h1>Angebot</h1>
    <p class="subject"><strong>Betreff:</strong> Angebot zu Ihrem Auftrag</p>
    <p class="intro">Vielen Dank für Ihre Anfrage. Gern biete ich Ihnen folgende Leistung an:</p>
    <table><thead><tr><th>Pos.</th><th>Beschreibung</th><th>Menge</th><th>Einzelpreis</th><th>Gesamt</th></tr></thead><tbody><tr><td>1.</td><td>${service}</td><td>${qty.toLocaleString("de-DE",{minimumFractionDigits:0,maximumFractionDigits:2})}</td><td>${euro(unitPrice)}</td><td>${euro(p.sale)}</td></tr></tbody></table>
    <div class="total"><span>Gesamt</span><strong>${euro(p.sale)}</strong></div>
    <div class="notes"><p>Dieses Angebot ist 14 Tage ab dem Ausstellungsdatum gültig.</p><p>Gemäß § 19 UStG wird aufgrund der Kleinunternehmerregelung keine Umsatzsteuer erhoben.</p></div>
    <p class="closing">Vielen Dank für Ihr Interesse. Ich freue mich auf Ihren Auftrag.</p>
    <footer>
      <div><strong>Daniel's Laser Art</strong>Augasse 12<br>08393 Meerane<br>Steuernummer: 227/227/03573<br>Inhaber: Daniel Häßler</div>
      <div><strong>Kontakt</strong>Telefon: 015147906749<br>E-Mail: Daniels.laser.art@gmail.com<br>Web: danielslaserart.de</div>
      <div><strong>Bankverbindung</strong>Bank: C24 Bank<br>IBAN: DE07 5002 4024 7016 9162 31<br>BIC: DEFF DEFF XXX<br>Kontoinhaber: Daniel Häßler</div>
      <div class="page"><strong>Seite</strong>1 von 1</div>
    </footer>
  </main><script>
    const printNow=()=>setTimeout(()=>window.print(),180);
    const logo=document.getElementById('letterheadLogo');
    if(logo.complete) printNow(); else {logo.addEventListener('load',printNow,{once:true});logo.addEventListener('error',printNow,{once:true});}
  <\/script></body></html>`;

  const popup=window.open("","_blank");
  if(!popup){alert("Die Druckansicht wurde blockiert. Bitte Pop-ups für diese Seite erlauben.");return;}
  popup.document.open();popup.document.write(doc);popup.document.close();
}

function loadProject(id,duplicate=false){
  const p=state.projects.find(x=>x.id===id);if(!p)return;
  state.activeModule=p.module||({"3D-Druck":"3d","Laser":"laser","Vinylfolie":"vinyl","Textilfolie":"textil"}[p.type]||"3d");
  editingProjectId=duplicate?null:p.id;
  setScreen("calculator");
  productSize=p.productSize||"medium";
  renderCalculator(true);
  productSize=p.productSize||"medium";
  document.querySelectorAll("[data-product-size]").forEach(b=>b.classList.toggle("active",b.dataset.productSize===productSize));
  consumableSelections=(p.consumables||[]).map(r=>({...r,auto:false}));
  renderConsumables();
  applyCalculatorFields(p.fields||{});
  $("projectName").value=duplicate?`${p.title} – Kopie`:p.title;
  $("customerName").value=p.customer||"";
  if($("customerAddress"))$("customerAddress").value=p.customerAddress||p.fields?.customerAddress||"";
  if(p.machineId&&$("machineSelect"))$("machineSelect").value=p.machineId;
  if($("projectNotes"))$("projectNotes").value=p.notes||"";if($("projectStatus"))$("projectStatus").value=p.status||"open";if($("projectTags"))$("projectTags").value=(p.tags||[]).join(", ");setTimerSeconds(num(p.workSeconds));
  calculate();
}
$("clearProjectsBtn").onclick=()=>{if(state.projects.length&&confirm("Wirklich alle Projekte löschen?")){state.projects=[];save();renderProjects()}};
$("projectSearch").oninput=renderProjects;
if($("projectStatusFilter"))$("projectStatusFilter").onchange=renderProjects;
if($("projectSort"))$("projectSort").onchange=renderProjects;
if($("newOrderBtn"))$("newOrderBtn").onclick=()=>startNewOrder("3d");
if($("projectNewBtn"))$("projectNewBtn").onclick=()=>startNewOrder("3d");
if($("manageTemplatesBtn"))$("manageTemplatesBtn").onclick=()=>{if(!(state.templates||[]).length){alert("Noch keine Vorlagen vorhanden. Erstelle eine Vorlage über ein gespeichertes Projekt.");return;} const names=state.templates.map((t,i)=>`${i+1}. ${t.name}`).join("\n");const n=prompt(`Vorlagen verwalten\n\n${names}\n\nNummer zum Löschen eingeben:`);const idx=Number(n)-1;if(Number.isInteger(idx)&&idx>=0&&idx<state.templates.length&&confirm(`Vorlage „${state.templates[idx].name}“ löschen?`)){state.templates.splice(idx,1);save();updateHome();}};

function fillSettings(){
  renderMachines();
  $("setProfit").value=state.settings.profit;$("setHourly").value=state.settings.hourly;$("setPlotter").value=state.settings.plotter;
  $("setPresse").value=state.settings.presse;$("setReserve").value=state.settings.reserve;$("setPackaging").value=state.settings.packaging;$("setRounding").value=String(state.settings.rounding);
}
$("settingsForm").onsubmit=e=>{
  e.preventDefault();
  state.settings={...state.settings,profit:num($("setProfit").value),hourly:num($("setHourly").value),plotter:num($("setPlotter").value),presse:num($("setPresse").value),reserve:num($("setReserve").value),packaging:num($("setPackaging").value),rounding:num($("setRounding").value)};
  save();alert("Einstellungen gespeichert.");
};

$("exportBtn").onclick=()=>{
  const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download=`DLA-Kalkulator-Backup-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(url);
};
$("importInput").onchange=async e=>{
  const f=e.target.files?.[0];if(!f)return;
  try{
    const d=JSON.parse(await f.text());
    if(!Array.isArray(d.materials)||!Array.isArray(d.projects))throw new Error();
    state={...defaults,...d,settings:{...defaults.settings,...(d.settings||{})}};
    state.machines=Array.isArray(state.machines)&&state.machines.length?state.machines:structuredClone(defaults.machines);
    state.materials=(state.materials||[]).map(m=>({...m,mainRole:m.mainRole!==false,consumableRole:Boolean(m.consumableRole||m.area==="Sonstiges"),consumableCategory:m.consumableCategory||"Sonstiges",defaultConsumption:num(m.defaultConsumption),autoAdd:Boolean(m.autoAdd),favorite:Boolean(m.favorite),category:inferMaterialCategory(m),supplier:m.supplier||"",image:m.image||"",lastUsed:m.lastUsed||null,width:num(m.width),height:num(m.height),dimensionUnit:m.dimensionUnit||"cm",sheetCount:num(m.sheetCount)||1,scaleWithSize:true,workshopUnit:m.workshopUnit||m.unit||"Einheit",workshopUnitAmount:num(m.workshopUnitAmount)||1,consumptionLevels:{small:num(m.consumptionLevels?.small)||(Boolean(m.scaleWithSize)?num(m.defaultConsumption)*(num(m.sizeFactors?.small)||0.5):num(m.defaultConsumption)),medium:num(m.consumptionLevels?.medium)||num(m.defaultConsumption),large:num(m.consumptionLevels?.large)||(Boolean(m.scaleWithSize)?num(m.defaultConsumption)*(num(m.sizeFactors?.large)||2):num(m.defaultConsumption))},consumableModules:Array.isArray(m.consumableModules)&&m.consumableModules.length?m.consumableModules:["3d","laser","vinyl","textil"],sizeFactors:{small:num(m.sizeFactors?.small)||0.5,medium:num(m.sizeFactors?.medium)||1,large:num(m.sizeFactors?.large)||2}}));save();renderMaterials();renderProjects();fillSettings();alert("Backup eingelesen.");
  }catch{alert("Ungültige Backup-Datei.");}
  e.target.value="";
};

let deferredPrompt=null;
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredPrompt=e;$("installBtn").classList.remove("hidden")});
$("installBtn").onclick=async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$("installBtn").classList.add("hidden")};

if("serviceWorker" in navigator) window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js?v=2.5.0").catch(()=>{}));


async function initializeAuth(){
  const { data:{ session } } = await db.auth.getSession();
  if(session?.user){
    await enterApp(session.user);
  }else{
    $("authGate").classList.remove("hidden");
    $("logoutBtn").classList.add("hidden");
  }
  db.auth.onAuthStateChange(async (event, session)=>{
    if(event==="SIGNED_IN" && session?.user && session.user.id!==currentUser?.id){
      await enterApp(session.user);
    }
    if(event==="SIGNED_OUT"){
      currentUser=null;cloudReady=false;
      $("authGate").classList.remove("hidden");
      $("logoutBtn").classList.add("hidden");
      setSyncStatus("Offline","");
    }
  });
}
async function enterApp(user){
  currentUser=user;
  $("authGate").classList.add("hidden");
  $("logoutBtn").classList.remove("hidden");
  cloudReady=false;
  const ok=await loadCloudState();
  cloudReady=ok;
}
$("loginForm").onsubmit=async e=>{
  e.preventDefault();
  $("authError").textContent="";
  const email=$("loginEmail").value.trim();
  const password=$("loginPassword").value;
  const btn=e.submitter;
  btn.disabled=true;btn.textContent="Anmeldung …";
  const { error }=await db.auth.signInWithPassword({email,password});
  if(error)$("authError").textContent="Anmeldung fehlgeschlagen. Prüfe E-Mail und Passwort.";
  btn.disabled=false;btn.textContent="Anmelden";
};
$("logoutBtn").onclick=async()=>{
  if(confirm("Wirklich abmelden?")) await db.auth.signOut();
};

renderCalculator();
renderTools();
renderMaterialCategoryFilter();
updateMaterialModeButtons();
initializeAuth();
})();
