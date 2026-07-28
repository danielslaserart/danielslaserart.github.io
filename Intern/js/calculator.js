import { $, num, euro, uid, esc } from "./utils.js";
import { state, save, defaults } from "./storage.js";
import { materialSelections, resolveMaterialSelection } from "./materials.js";
import { renderProjects } from "./projects.js";
import { appConfirm } from "./dialogs.js";
let editingProjectId=null;
export function getOrderType(){return document.querySelector('input[name="orderType"]:checked')?.value||"own";}
function getCustomerSettings(){return state.settings.customerObject||defaults.settings.customerObject;}
export function suggestedRiskSurcharge(value,settings=getCustomerSettings()){
  const v=Math.max(0,num(value)),r=settings.risks||{};
  if(v<50)return num(r.under50);
  if(v<=100)return num(r.from50To100);
  if(v<=250)return num(r.from100To250);
  if(v<=500)return num(r.from250To500);
  return num(r.over500);
}
export function computePriceBreakdown(parts={}){
  const orderType=parts.orderType||"own";
  if(orderType==="customerObject"){
    const baseFee=Math.max(0,num(parts.baseFee));
    const machine=Math.max(0,num(parts.machine));
    const work=Math.max(0,num(parts.work));
    const risk=Math.max(0,num(parts.risk));
    const express=Math.max(0,num(parts.express));
    const difficultyPercent=Math.max(0,num(parts.difficultyPercent));
    const difficulty=(baseFee+machine+work)*difficultyPercent/100;
    const calculated=baseFee+machine+work+difficulty+risk+express;
    const minimum=Math.max(0,num(parts.minimumPrice));
    const minimumApplied=calculated<minimum;
    const minimumAdjusted=Math.max(calculated,minimum);
    const recommended=calculated<=minimum?minimum:Math.max(minimum,Math.ceil(minimumAdjusted)+.9);
    const cost=machine+work;
    return {material:0,consumables:0,baseFee,machine,work,extra:0,reserve:0,difficulty,risk,express,calculated,minimum,minimumApplied,cost,sale:recommended,profit:Math.max(0,recommended-cost)};
  }
  const material=Math.max(0,num(parts.material)),consumables=Math.max(0,num(parts.consumables)),machine=Math.max(0,num(parts.machine)),work=Math.max(0,num(parts.work)),extra=Math.max(0,num(parts.extra));
  const direct=material+consumables+machine+work+extra;
  const overhead=direct*Math.max(0,num(parts.overheadPercent))/100;
  const base=direct+overhead;
  const reserve=base*Math.max(0,num(parts.reservePercent))/100;
  const cost=base+reserve;
  const sale=parts.roundFn?parts.roundFn(cost*(1+Math.max(0,num(parts.profitPercent))/100)):cost*(1+Math.max(0,num(parts.profitPercent))/100);
  return {material,consumables,machine,work,extra,reserve,cost,sale,profit:Math.max(0,sale-cost),baseFee:0,difficulty:0,risk:0,calculated:sale,minimum:0,minimumApplied:false};
}
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
  if($("riskSurcharge")&&fields.riskSurcharge!=="")$("riskSurcharge").dataset.manual="true";
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
function updateOrderAssistantUI(){
  const orderType=getOrderType(),noMaterial=orderType!=="own";
  $("customerObjectIntro")?.classList.toggle("hidden",orderType!=="customerObject");
  document.querySelector(".product-size-section")?.classList.toggle("hidden",noMaterial);
  document.querySelector(".consumables-section")?.classList.toggle("hidden",noMaterial);
  document.querySelector(".tabs")?.classList.toggle("order-no-material",noMaterial);
}
document.querySelectorAll('input[name="orderType"]').forEach(input=>input.addEventListener("change",()=>{
  if(input.checked&&input.value!=="own")state.activeModule="laser";
  renderCalculator(false);
}));
$("customerObjectProcess")?.addEventListener("change",()=>{const fields=captureCalculatorFields();renderCalculator(false);applyCalculatorFields(fields)});
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
  if(clear){
    consumableSelections=[];productSize="medium";
    const own=document.querySelector('input[name="orderType"][value="own"]');if(own)own.checked=true;
    if($("customerObjectProcess"))$("customerObjectProcess").value="engrave";
  }
  const orderType=getOrderType();
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

  if(type==="laser"&&orderType==="own") html=`
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

  if(type==="laser"&&orderType!=="own"){
    const customer=orderType==="customerObject",settings=getCustomerSettings(),process=$("customerObjectProcess")?.value||"engrave";
    html=`
      <div class="group-title">${customer?"KUNDENOBJEKT":"DIENSTLEISTUNG"} & MASCHINE</div>
      <label>Laser auswählen<select id="machineSelect">${machineOptions("laser")}</select></label>
      <div class="field-grid customer-object-fields">
        ${customer?`<label>Material des Kundenobjekts (nur Bezeichnung)<input id="objectMaterial" placeholder="z. B. versilbert, Edelstahl, Holz"></label>
        <label>Wert des Kundenobjekts (€)<input id="objectValue" type="number" min="0" step="any" inputmode="decimal" placeholder="z. B. 120"></label>
        <label>Schwierigkeitsgrad<select id="difficulty"><option value="veryEasy">Sehr einfach (${num(settings.difficulties.veryEasy)} %)</option><option value="easy">Einfach (${num(settings.difficulties.easy)} %)</option><option value="normal" selected>Normal (${num(settings.difficulties.normal)} %)</option><option value="hard">Schwer (${num(settings.difficulties.hard)} %)</option><option value="veryHard">Sehr schwer (${num(settings.difficulties.veryHard)} %)</option></select></label>
        <div class="risk-field-wrap"><label>Risikoaufschlag (€)<input id="riskSurcharge" type="number" min="0" step="any" inputmode="decimal" value="0"></label><button id="resetRiskSuggestion" class="ghost small" type="button">Automatisch</button></div>`:""}
        ${customer?`<label>Expresszuschlag (€)<input id="expressSurcharge" type="number" min="0" step="any" inputmode="decimal" value="${num(settings.expressFee)}"></label>`:""}
        <label class="${customer&&process==="cut"?"hidden":""}">Gravurdauer (Minuten)<input id="engraveMinutes" type="number" min="0" step="any" inputmode="decimal" value=""></label>
        <label class="${customer&&process==="engrave"?"hidden":""}">Schnittdauer (Minuten)<input id="cutMinutes" type="number" min="0" step="any" inputmode="decimal" value=""></label>
        <div class="machine-rate-display">Gravur: <strong id="engraveRateDisplay">0,00 € / Min.</strong></div>
        <div class="machine-rate-display">Schnitt: <strong id="cutRateDisplay">0,00 € / Min.</strong></div>
        <label>Arbeitszeit (Minuten)<input id="workMinutes" type="number" min="0" step="any" inputmode="decimal" value=""></label>
        <label>Stundenlohn (€/Stunde)<input id="hourlyRate" type="number" min="0" step="any" inputmode="decimal" value="${state.settings.hourly}"></label>
        ${customer?"":`<label>Sonstige Kosten (€)<input id="otherCosts" type="number" min="0" step="any" inputmode="decimal" value=""></label><label>Fehlerreserve (%)<input id="reserve" type="number" min="0" step="any" inputmode="decimal" value="${state.settings.reserve}"></label><label>Gewinnaufschlag (%)<input id="profit" type="number" min="0" step="any" inputmode="decimal" value="${state.settings.profit}"></label>`}
      </div>
      ${customer?`<div class="price-explanation">Die Grundpauschale von ${euro(settings.baseFee)} deckt Beratung, Einrichtung, Positionierung, Fokus, Probelauf, Reinigung und Dokumentation ab.</div>`:""}`;
  }

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
  updateOrderAssistantUI();
  renderConsumables();
  document.querySelectorAll("#calcForm input,#calcForm select").forEach(el=>el.oninput=calculate);
  if($("objectValue"))$("objectValue").oninput=()=>{
    const risk=$("riskSurcharge");if(risk?.dataset.manual!=="true")risk.value=String(suggestedRiskSurcharge($("objectValue").value));
    calculate();
  };
  if($("riskSurcharge"))$("riskSurcharge").oninput=()=>{$("riskSurcharge").dataset.manual="true";calculate()};
  if($("resetRiskSuggestion"))$("resetRiskSuggestion").onclick=()=>{const risk=$("riskSurcharge");risk.dataset.manual="false";risk.value=String(suggestedRiskSurcharge($("objectValue")?.value));calculate()};
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
  const type=state.activeModule,orderType=getOrderType();
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
    material=orderType==="own"?unitMain*num($("usageMain")?.value):0;
    const process=$("customerObjectProcess")?.value||"both";
    const engravingMinutes=orderType==="customerObject"&&process==="cut"?0:num($("engraveMinutes")?.value);
    const cuttingMinutes=orderType==="customerObject"&&process==="engrave"?0:num($("cutMinutes")?.value);
    machine=engravingMinutes*engraveRate+cuttingMinutes*cutRate;
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

  const settings=getCustomerSettings(),difficultyKey=$("difficulty")?.value||"normal";
  const breakdown=computePriceBreakdown({
    orderType,material,consumables:orderType==="own"?consumables:0,machine,work,extra,
    overheadPercent:state.settings.overhead,reservePercent:num($("reserve")?.value),profitPercent:num($("profit")?.value),roundFn:rounded,
    baseFee:settings.baseFee,minimumPrice:settings.minimumPrice,difficultyPercent:settings.difficulties?.[difficultyKey],risk:num($("riskSurcharge")?.value),express:num($("expressSurcharge")?.value)
  });
  const customerObject=orderType==="customerObject";
  $("resMaterialRow").classList.toggle("hidden",orderType!=="own");$("resConsumablesRow").classList.toggle("hidden",orderType!=="own");
  $("resBaseFeeRow").classList.toggle("hidden",!customerObject);$("resDifficultyRow").classList.toggle("hidden",!customerObject);$("resRiskRow").classList.toggle("hidden",!customerObject);$("resExpressRow").classList.toggle("hidden",!customerObject);$("resCalculatedRow").classList.toggle("hidden",!customerObject);$("resMinimumRow").classList.toggle("hidden",!customerObject||!breakdown.minimumApplied);
  $("resExtraRow").classList.toggle("hidden",customerObject);$("resReserveRow").classList.toggle("hidden",customerObject);
  $("resMaterial").textContent=euro(breakdown.material);$("resConsumables").textContent=euro(breakdown.consumables);$("resBaseFee").textContent=euro(breakdown.baseFee);
  $("resMachine").textContent=euro(breakdown.machine);$("resWork").textContent=euro(breakdown.work);$("resExtra").textContent=euro(breakdown.extra);$("resReserve").textContent=euro(breakdown.reserve);
  $("resDifficulty").textContent=euro(breakdown.difficulty);$("resRisk").textContent=euro(breakdown.risk);$("resExpress").textContent=euro(breakdown.express);$("resCalculated").textContent=euro(breakdown.calculated);$("resMinimum").textContent=euro(breakdown.minimum);
  $("resCost").textContent=euro(breakdown.cost);$("resProfit").textContent=euro(breakdown.profit);$("resSale").textContent=euro(breakdown.sale);$("resSaleLabel").textContent=customerObject?"Empfohlener Verkaufspreis":"Verkaufspreis";
  $("resPerPiece").textContent=qty>1?`${euro(breakdown.sale/qty)} je Stück`:"";
  $("calcForm").dataset.sale=breakdown.sale;
  $("calcForm").dataset.cost=breakdown.cost;
  $("calcForm").dataset.breakdown=JSON.stringify(breakdown);
  $("calcForm").dataset.qty=qty;
}
$("calcForm").onsubmit=async e=>{
  e.preventDefault();calculate();
  const title=$("projectName").value.trim()||`${titles[state.activeModule]} ${new Date().toLocaleDateString("de-DE")}`;
  const machine=getMachine();
  const orderType=getOrderType(),customerObject=orderType==="customerObject";
  const customerProcess=$("customerObjectProcess")?.value||null;
  const customerSettings=getCustomerSettings();
  const difficulty=$("difficulty")?.value||null;
  const breakdown=JSON.parse($("calcForm").dataset.breakdown||"{}");
  const existingProject=editingProjectId?state.projects.find(p=>p.id===editingProjectId):null;
  const saleNow=num($("calcForm").dataset.sale),costNow=num($("calcForm").dataset.cost);const history=[...(existingProject?.priceHistory||[])];if(!existingProject||num(existingProject.sale)!==saleNow||num(existingProject.cost)!==costNow)history.unshift({date:new Date().toISOString(),sale:saleNow,cost:costNow});
  const estimatedCutTime=customerObject&&customerProcess==="engrave"?0:num($("cutMinutes")?.value);
  const estimatedEngravingTime=customerObject&&customerProcess==="cut"?0:num($("engraveMinutes")?.value);
  const estimatorData=customerObject?{
    orderType,process:customerProcess,materialId:"",materialName:$("objectMaterial")?.value.trim()||"Kundenobjekt",machineId:machine?.id||"",machineName:machine?.name||"",
    estimatedCutTime,estimatedEngravingTime,estimatedTotalTime:estimatedCutTime+estimatedEngravingTime,
    actualCutTime:null,actualEngravingTime:null,actualTotalTime:null,estimatedPrice:saleNow,actualPrice:saleNow,materialCost:0,cost:costNow,
    objectValue:num($("objectValue")?.value),riskSurcharge:num($("riskSurcharge")?.value),expressSurcharge:num($("expressSurcharge")?.value),difficulty,difficultyPercent:num(customerSettings.difficulties?.[difficulty])
  }:(existingProject?.estimatorData||null);
  const project={id:editingProjectId||uid(),recordType:"project",isReference:false,orderType,customerObjectProcess:customerProcess,objectMaterial:$("objectMaterial")?.value.trim()||"",objectValue:customerObject?num($("objectValue")?.value):null,riskSurcharge:customerObject?num($("riskSurcharge")?.value):null,expressSurcharge:customerObject?num($("expressSurcharge")?.value):null,difficulty,difficultyPercent:customerObject?num(customerSettings.difficulties?.[difficulty]):null,pricingBreakdown:breakdown,title,customer:$("customerName").value.trim(),customerAddress:$("customerAddress")?.value.trim()||"",type:customerObject?({engrave:"Kundenobjekt gravieren",cut:"Kundenobjekt schneiden",both:"Kundenobjekt gravieren + schneiden"}[customerProcess]):orderType==="service"?"Dienstleistung ohne Material":titles[state.activeModule],module:state.activeModule,machineId:machine?.id||"",machineName:machine?.name||"",notes:$("projectNotes")?.value.trim()||"",status:$("projectStatus")?.value||"offer",tags:($("projectTags")?.value||"").split(",").map(x=>x.trim()).filter(Boolean),images:existingProject?.images||[],image:null,reference:false,estimatedPrice:customerObject?saleNow:(existingProject?.estimatedPrice??null),actualPrice:saleNow,estimatedCutTime:customerObject?estimatedCutTime:null,actualCutTime:existingProject?.actualCutTime??null,estimatedEngravingTime:customerObject?estimatedEngravingTime:null,actualEngravingTime:existingProject?.actualEngravingTime??null,estimatedTotalTime:customerObject?estimatedCutTime+estimatedEngravingTime:null,actualTotalTime:existingProject?.actualTotalTime??null,materialCost:customerObject?0:null,estimatorData,priceHistory:history,workSeconds:getTimerSeconds(),sale:saleNow,cost:costNow,qty:num($("calcForm").dataset.qty)||1,productSize,consumables:orderType==="own"?consumableSelections.filter(r=>r.materialId&&num(r.quantity)>0).map(r=>({materialId:r.materialId,quantity:num(r.quantity)})):[],fields:captureCalculatorFields(),created:editingProjectId?(state.projects.find(p=>p.id===editingProjectId)?.created||new Date().toISOString()):new Date().toISOString(),updated:new Date().toISOString()};
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
