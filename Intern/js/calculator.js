import { $, num, euro, uid, esc } from "./utils.js";
import { state, save, defaults } from "./storage.js";
import { materialSelections, resolveMaterialSelection } from "./materials.js";
import { renderProjects } from "./projects.js";
import { appConfirm } from "./dialogs.js";
let editingProjectId=null;
export function getTimerSeconds(){
  const timer=state.timer||defaults.timer;
  const runningExtra=timer.running&&timer.startedAt?Math.max(0,Math.floor((Date.now()-new Date(timer.startedAt).getTime())/1000)):0;
  return Math.max(0,Math.floor(num(timer.elapsed)+runningExtra));
}
export function updateTimerDisplay(){
  const total=getTimerSeconds();
  const h=String(Math.floor(total/3600)).padStart(2,"0");
  const m=String(Math.floor((total%3600)/60)).padStart(2,"0");
  const sec=String(total%60).padStart(2,"0");
  if($("workTimerDisplay")) $("workTimerDisplay").textContent=`${h}:${m}:${sec}`;
  if($("timerToggleBtn")) $("timerToggleBtn").textContent=state.timer?.running?"⏸ Pause":"▶ Start";
}
export function setTimerSeconds(seconds=0){
  state.timer={running:false,startedAt:null,elapsed:Math.max(0,Math.floor(num(seconds)))};
  updateTimerDisplay();
}
export function toggleTimer(){
  state.timer={...defaults.timer,...(state.timer||{})};
  if(state.timer.running){
    state.timer.elapsed=getTimerSeconds();
    state.timer.running=false;
    state.timer.startedAt=null;
  }else{
    state.timer.running=true;
    state.timer.startedAt=new Date().toISOString();
  }
  updateTimerDisplay();
}
setInterval(()=>{if(state.timer?.running)updateTimerDisplay()},1000);
export function machineOptions(type,selected=""){
  selected=selected||state.settings.defaultMachine||"";
  const list=(state.machines||[]).filter(m=>m.type===type&&m.active!==false);
  return `<option value="">Keine Maschine ausgewählt</option>`+list.map(m=>`<option value="${m.id}" ${m.id===selected?"selected":""}>${esc(m.name)}</option>`).join("");
}
function getMachine(){
  const id=$("machineSelect")?.value;
  return (state.machines||[]).find(m=>m.id===id)||null;
}
export function captureCalculatorFields(){
  const fields={};
  document.querySelectorAll("#calcForm input,#calcForm select,#calcForm textarea").forEach(el=>{if(el.id)fields[el.id]=el.value;});
  return fields;
}
export function applyCalculatorFields(fields={}){
  Object.entries(fields).forEach(([id,value])=>{const el=$(id);if(el)el.value=value;});
  calculate();
}
export const titles={ "3d":"3D-Druck","laser":"Laser","vinyl":"Vinylfolie","textil":"Textilfolie" };
function options(area){
  const items=materialSelections(area,"main");
  return `<option value="">Material auswählen</option>`+items.map(m=>`<option value="${m.id}" ${m.id===state.settings.defaultMaterial?"selected":""}>${m.favorite||m.baseMaterial?.favorite?"★ ":""}${esc(m.name)} – ${euro(m.unitPrice)}/${esc(m.unit)}</option>`).join("");
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
export function workshopUnit(mat){return mat?.workshopUnit||mat?.unit||"Einheit";}
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
export function renderConsumables(){
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
if($("timerToggleBtn")) $("timerToggleBtn").onclick=toggleTimer;
if($("timerResetBtn")) $("timerResetBtn").onclick=async()=>{if(await appConfirm("Arbeitszeit wirklich zurücksetzen?"))setTimerSeconds(0);};
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
export function renderCalculator(clear=false){
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
    if($("projectStatus")) $("projectStatus").value="offer";
    if($("projectTags")) $("projectTags").value="";
    setTimerSeconds(0);
  }

  let html="";
  if(type==="3d") html=`
    <div class="group-title">MATERIAL & MASCHINE</div>
    <label>Drucker auswählen<select id="machineSelect">${machineOptions("3d")}</select></label>
    <label>Material auswählen<select id="matMain">${options("3D-Druck")}</select></label><div id="selectedMaterialPreview" class="selected-material-preview hidden"></div>
    ${infoRow("Preis aus Datenbank","priceMain")}
    <div class="field-grid">
      <label>Filamentverbrauch (g)<input id="usageMain" type="number" min="0" step="any" inputmode="decimal" value=""></label>
      <label>Druckdauer (Minuten)<input id="printMinutes" type="number" min="0" step="any" inputmode="decimal" value=""></label>
      <div class="machine-rate-display">Maschinenkosten: <strong id="machineRateDisplay">0,00 € / Std.</strong></div>
      <label>Arbeitszeit (Minuten)<input id="workMinutes" type="number" min="0" step="any" inputmode="decimal" value=""></label>
      <label>Stundenlohn (€/Stunde)<input id="hourlyRate" type="number" min="0" step="any" inputmode="decimal" value="${state.settings.hourly}"></label>
      <label>Verpackung (€)<input id="packaging" type="number" min="0" step="any" inputmode="decimal" value="${state.settings.packaging}"></label>
      <label>Sonstige Kosten (€)<input id="otherCosts" type="number" min="0" step="any" inputmode="decimal" value=""></label>
      <label>Fehlerreserve (%)<input id="reserve" type="number" min="0" step="any" inputmode="decimal" value="${state.settings.reserve}"></label>
      <label>Gewinnaufschlag (%)<input id="profit" type="number" min="0" step="any" inputmode="decimal" value="${state.settings.profit}"></label>
    </div>`;

  if(type==="laser") html=`
    <div class="group-title">MATERIAL & MASCHINE</div>
    <label>Laser auswählen<select id="machineSelect">${machineOptions("laser")}</select></label>
    <label>Material auswählen<select id="matMain">${options("Laser")}</select></label><div id="selectedMaterialPreview" class="selected-material-preview hidden"></div>
    ${infoRow("Preis aus Datenbank","priceMain")}
    <div class="field-grid">
      <label>Verbrauchte Fläche / Menge<input id="usageMain" type="number" min="0" step="any" inputmode="decimal" value=""></label>
      <label>Gravurdauer (Minuten)<input id="engraveMinutes" type="number" min="0" step="any" inputmode="decimal" value=""></label>
      <label>Schnittdauer (Minuten)<input id="cutMinutes" type="number" min="0" step="any" inputmode="decimal" value=""></label>
      <div class="machine-rate-display">Gravur: <strong id="engraveRateDisplay">0,00 € / Min.</strong></div>
      <div class="machine-rate-display">Schnitt: <strong id="cutRateDisplay">0,00 € / Min.</strong></div>
      <label>Arbeitszeit (Minuten)<input id="workMinutes" type="number" min="0" step="any" inputmode="decimal" value=""></label>
      <label>Stundenlohn (€/Stunde)<input id="hourlyRate" type="number" min="0" step="any" inputmode="decimal" value="${state.settings.hourly}"></label>
      <label>Verpackung (€)<input id="packaging" type="number" min="0" step="any" inputmode="decimal" value="${state.settings.packaging}"></label>
      <label>Sonstige Kosten (€)<input id="otherCosts" type="number" min="0" step="any" inputmode="decimal" value=""></label>
      <label>Fehlerreserve (%)<input id="reserve" type="number" min="0" step="any" inputmode="decimal" value="${state.settings.reserve}"></label>
      <label>Gewinnaufschlag (%)<input id="profit" type="number" min="0" step="any" inputmode="decimal" value="${state.settings.profit}"></label>
    </div>`;

  if(type==="vinyl") html=`
    <div class="group-title">VINYL & ÜBERTRAGUNGSFOLIE</div>
    <label>Vinyl auswählen<select id="matMain">${options("Vinylfolie")}</select></label><div id="selectedMaterialPreview" class="selected-material-preview hidden"></div>
    ${infoRow("Vinylpreis","priceMain")}
    <div class="field-grid">
      <label>Vinylfläche / Verbrauch<input id="usageMain" type="number" min="0" step="any" inputmode="decimal" value=""></label>
    </div>
    <label>Übertragungsfolie auswählen<select id="matTransfer">${options("Übertragungsfolie")}</select></label>
    ${infoRow("Preis Übertragungsfolie","priceTransfer")}
    <div class="field-grid">
      <label>Fläche Übertragungsfolie<input id="usageTransfer" type="number" min="0" step="any" inputmode="decimal" value=""></label>
      <label>Plottdauer (Minuten)<input id="plotMinutes" type="number" min="0" step="any" inputmode="decimal" value=""></label>
      <label>Plotterkosten (€/Minute)<input id="plotRate" type="number" min="0" step="any" inputmode="decimal" value="${state.settings.plotter}"></label>
      <label>Entgitterzeit (Minuten)<input id="weedMinutes" type="number" min="0" step="any" inputmode="decimal" value=""></label>
      <label>Montage-/Klebezeit (Minuten)<input id="mountMinutes" type="number" min="0" step="any" inputmode="decimal" value=""></label>
      <label>Stundenlohn (€/Stunde)<input id="hourlyRate" type="number" min="0" step="any" inputmode="decimal" value="${state.settings.hourly}"></label>
      <label>Verpackung (€)<input id="packaging" type="number" min="0" step="any" inputmode="decimal" value="${state.settings.packaging}"></label>
      <label>Sonstige Kosten (€)<input id="otherCosts" type="number" min="0" step="any" inputmode="decimal" value=""></label>
      <label>Fehlerreserve (%)<input id="reserve" type="number" min="0" step="any" inputmode="decimal" value="${state.settings.reserve}"></label>
      <label>Gewinnaufschlag (%)<input id="profit" type="number" min="0" step="any" inputmode="decimal" value="${state.settings.profit}"></label>
      <label>Stückzahl<input id="quantity" type="number" min="1" step="1" inputmode="numeric" value="1"></label>
    </div>`;

  if(type==="textil") html=`
    <div class="group-title">TEXTIL & FOLIE</div>
    <div class="field-grid">
      <label>Textilpreis pro Stück (€)<input id="textilePrice" type="number" min="0" step="any" inputmode="decimal" value=""></label>
      <label>Stückzahl<input id="quantity" type="number" min="1" step="1" inputmode="numeric" value="1"></label>
    </div>
    <label>Textilfolie auswählen<select id="matMain">${options("Textilfolie")}</select></label><div id="selectedMaterialPreview" class="selected-material-preview hidden"></div>
    ${infoRow("Folienpreis","priceMain")}
    <div class="field-grid">
      <label>Folienfläche je Farbe/Stück<input id="usageMain" type="number" min="0" step="any" inputmode="decimal" value=""></label>
      <label>Anzahl Farben<input id="colors" type="number" min="1" step="1" inputmode="numeric" value="1"></label>
      <label>Plottdauer je Stück (Minuten)<input id="plotMinutes" type="number" min="0" step="any" inputmode="decimal" value=""></label>
      <label>Plotterkosten (€/Minute)<input id="plotRate" type="number" min="0" step="any" inputmode="decimal" value="${state.settings.plotter}"></label>
      <label>Entgitterzeit je Stück (Minuten)<input id="weedMinutes" type="number" min="0" step="any" inputmode="decimal" value=""></label>
      <label>Presszeit je Stück (Minuten)<input id="pressMinutes" type="number" min="0" step="any" inputmode="decimal" value=""></label>
      <label>Pressenkosten (€/Minute)<input id="pressRate" type="number" min="0" step="any" inputmode="decimal" value="${state.settings.presse}"></label>
      <label>Vor-/Nachbereitung je Stück (Minuten)<input id="prepMinutes" type="number" min="0" step="any" inputmode="decimal" value=""></label>
      <label>Stundenlohn (€/Stunde)<input id="hourlyRate" type="number" min="0" step="any" inputmode="decimal" value="${state.settings.hourly}"></label>
      <label>Verpackung gesamt (€)<input id="packaging" type="number" min="0" step="any" inputmode="decimal" value="${state.settings.packaging}"></label>
      <label>Sonstige Kosten (€)<input id="otherCosts" type="number" min="0" step="any" inputmode="decimal" value=""></label>
      <label>Fehlerreserve (%)<input id="reserve" type="number" min="0" step="any" inputmode="decimal" value="${state.settings.reserve}"></label>
      <label>Gewinnaufschlag (%)<input id="profit" type="number" min="0" step="any" inputmode="decimal" value="${state.settings.profit}"></label>
    </div>`;

  $("moduleFields").innerHTML=html;
  renderConsumables();
  document.querySelectorAll("#calcForm input,#calcForm select").forEach(el=>el.oninput=calculate);
  calculate();
}
$("resetCalcBtn").onclick=async()=>{if(await appConfirm("Neue Kalkulation starten?\nAlle nicht gespeicherten Eingaben werden gelöscht.","Neue Kalkulation","Neue Kalkulation"))document.dispatchEvent(new CustomEvent("dla:new-order",{detail:{module:state.activeModule}}))};

function getMat(id){
  const el=$(id); if(!el) return null;
  return resolveMaterialSelection(el.value);
}
export function rounded(v){
  const step=num(state.settings.rounding)||0.01;
  return Math.ceil(v/step)*step;
}
function updateSelectedMaterialPreview(){
  const box=$("selectedMaterialPreview"),mat=getMat("matMain");if(!box)return;
  if(!mat){box.classList.add("hidden");box.innerHTML="";return;}
  const image=mat.image||mat.baseMaterial?.image||"";
  const stockText=mat.variantId&&mat.trackStock?`<span class="stock-badge ${num(mat.stock)<=num(mat.minStock)?"low":""}">Bestand: ${num(mat.stock)} Stück</span>`:"";
  box.innerHTML=`${image?`<img src="${image}" alt="${esc(mat.name)}">`:`<div class="selected-material-placeholder">🖼️</div>`}<div><strong>${esc(mat.name)}</strong><small>${euro(mat.unitPrice)} / ${esc(mat.unit)}</small><div class="variant-badges">${stockText}${mat.location?`<span class="stock-badge">📍 ${esc(mat.location)}</span>`:""}</div>${mat.note?`<p>${esc(mat.note)}</p>`:""}</div>`;
  box.classList.remove("hidden");
}
export function calculate(){
  updateSelectedMaterialPreview();
  const type=state.activeModule;
  const main=getMat("matMain"),transfer=getMat("matTransfer");
  const unitMain=main?.unitPrice||0,unitTransfer=transfer?.unitPrice||0;
  if($("priceMain")) $("priceMain").textContent=main?`${euro(unitMain)} / ${main.unit}`:"0,00 €";
  if($("priceTransfer")) $("priceTransfer").textContent=transfer?`${euro(unitTransfer)} / ${transfer.unit}`:"0,00 €";

  let material=0,machine=0,work=0,extra=0,qty=1;
  const consumables=consumablesCost();

  if(type==="3d"){
    const selectedMachine=getMachine();
    const rate=num(selectedMachine?.hourlyRate)||num(selectedMachine?.minuteRate)*60;
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

  const direct=material+consumables+machine+work+extra;
  const overhead=direct*num(state.settings.overhead)/100;
  const base=direct+overhead;
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
$("calcForm").onsubmit=async e=>{
  e.preventDefault();calculate();
  const title=$("projectName").value.trim()||`${titles[state.activeModule]} ${new Date().toLocaleDateString("de-DE")}`;
  const machine=getMachine();
  const existingProject=editingProjectId?state.projects.find(p=>p.id===editingProjectId):null;
  const saleNow=num($("calcForm").dataset.sale),costNow=num($("calcForm").dataset.cost);const history=[...(existingProject?.priceHistory||[])];if(!existingProject||num(existingProject.sale)!==saleNow||num(existingProject.cost)!==costNow)history.unshift({date:new Date().toISOString(),sale:saleNow,cost:costNow});
  const project={id:editingProjectId||uid(),recordType:"project",isReference:false,title,customer:$("customerName").value.trim(),customerAddress:$("customerAddress")?.value.trim()||"",type:titles[state.activeModule],module:state.activeModule,machineId:machine?.id||"",machineName:machine?.name||"",notes:$("projectNotes")?.value.trim()||"",status:$("projectStatus")?.value||"offer",tags:($("projectTags")?.value||"").split(",").map(x=>x.trim()).filter(Boolean),images:existingProject?.images||[],image:null,reference:false,estimatedPrice:existingProject?.estimatedPrice??null,actualPrice:saleNow,estimatorData:existingProject?.estimatorData||null,priceHistory:history,workSeconds:getTimerSeconds(),sale:saleNow,cost:costNow,qty:num($("calcForm").dataset.qty)||1,productSize,consumables:consumableSelections.filter(r=>r.materialId&&num(r.quantity)>0).map(r=>({materialId:r.materialId,quantity:num(r.quantity)})),fields:captureCalculatorFields(),created:editingProjectId?(state.projects.find(p=>p.id===editingProjectId)?.created||new Date().toISOString()):new Date().toISOString(),updated:new Date().toISOString()};
  const idx=state.projects.findIndex(p=>p.id===project.id);
  if(idx>=0)state.projects[idx]=project;else state.projects.unshift(project);
  const usedKeys=[project.fields?.matMain,project.fields?.matTransfer,...project.consumables.map(r=>r.materialId)].filter(Boolean);
  usedKeys.forEach(key=>{const sel=resolveMaterialSelection(key);const base=sel?.baseMaterial||sel;if(base)base.lastUsed=new Date().toISOString();});
  if(idx<0){
    const mainSel=resolveMaterialSelection(project.fields?.matMain);const used=num(project.fields?.usageMain);
    const stockTarget=mainSel?.variantId?mainSel.baseMaterial.variants.find(v=>v.id===mainSel.variantId):mainSel;
    if(stockTarget?.trackStock&&used>0){stockTarget.stock=num(stockTarget.stock)-used;stockTarget.stockHistory=Array.isArray(stockTarget.stockHistory)?stockTarget.stockHistory:[];stockTarget.stockHistory.unshift({date:new Date().toISOString(),change:-used,reason:`Projekt: ${title}`});}
  }
  state.lastPrice=project.sale;editingProjectId=null;save();renderProjects();
  if(await appConfirm(`${idx>=0?"Projekt aktualisiert.":"Projekt gespeichert."}\nMöchtest du eine neue Kalkulation starten?`,"Gespeichert","Ja"))document.dispatchEvent(new CustomEvent("dla:new-order",{detail:{module:state.activeModule}}));
};



export function resetCalculatorState(){
  editingProjectId=null;
  consumableSelections=[];
  productSize="medium";
}
export function setEditingProjectId(id){ editingProjectId=id; }
export function setCalculatorProductSize(size){ productSize=size||"medium"; }
export function setCalculatorConsumables(rows){ consumableSelections=rows||[]; }
export function getCalculatorProductSize(){ return productSize; }
export function getCalculatorConsumables(){ return consumableSelections; }
