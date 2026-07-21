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
const APP_VERSION = "9";
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
  materials:[],projects:[],activeModule:"3d",lastPrice:null
};
let state = load();

const $ = id => document.getElementById(id);
const num = v => {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  return Number(String(v ?? "").replace(",", ".")) || 0;
};
const euro = v => new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR"}).format(num(v));
const uid = () => crypto.randomUUID ? crypto.randomUUID() : Date.now()+"-"+Math.random().toString(16).slice(2);
const esc = s => String(s ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));

function load(){
  try{
    const saved=JSON.parse(localStorage.getItem(KEY));
    const merged={...defaults,...saved,settings:{...defaults.settings,...(saved?.settings||{})}};
    merged.materials=(merged.materials||[]).map(m=>({...m,mainRole:m.mainRole!==false,consumableRole:Boolean(m.consumableRole||m.area==="Sonstiges")}));
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
  window.scrollTo({top:0,behavior:"smooth"});
}
document.querySelectorAll("[data-screen]").forEach(b=>b.onclick=()=>setScreen(b.dataset.screen));
document.querySelectorAll("[data-open]").forEach(b=>b.onclick=()=>{state.activeModule=b.dataset.open;save();setScreen("calculator")});
document.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>{state.activeModule=b.dataset.tab;save();renderCalculator()});

function updateHome(){
  $("homeMaterialCount").textContent=state.materials.length;
  $("homeProjectCount").textContent=state.projects.length;
  $("homeLastPrice").textContent=state.lastPrice==null?"–":euro(state.lastPrice);
}
updateHome();

// MATERIALS
const dialog=$("materialDialog");
$("newMaterialBtn").onclick=()=>openMaterial();
$("closeMaterialBtn").onclick=()=>dialog.close();
$("materialSearch").oninput=renderMaterials;
$("materialAreaFilter").onchange=renderMaterials;
["materialPrice","materialQuantity","materialUnit"].forEach(id=>$(id).oninput=previewUnit);

function openMaterial(m=null){
  $("materialDialogTitle").textContent=m?"Material bearbeiten":"Material hinzufügen";
  $("materialId").value=m?.id||"";
  $("materialName").value=m?.name||"";
  $("materialArea").value=m?.area||"3D-Druck";
  $("materialPrice").value=m?.price??"";
  $("materialQuantity").value=m?.quantity??"";
  $("materialUnit").value=m?.unit||"g";
  $("materialNote").value=m?.note||"";
  $("materialMainRole").checked=m?m.mainRole!==false:true;
  $("materialConsumableRole").checked=m?Boolean(m.consumableRole):false;
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
  const item={id:$("materialId").value||uid(),name,area:$("materialArea").value,price,quantity,unit:$("materialUnit").value,note:$("materialNote").value.trim(),unitPrice:price/quantity,mainRole:$("materialMainRole").checked,consumableRole:$("materialConsumableRole").checked};
  const i=state.materials.findIndex(x=>x.id===item.id); if(i>=0) state.materials[i]=item; else state.materials.push(item);
  save();dialog.close();renderMaterials();
};
function renderMaterials(){
  const term=$("materialSearch").value.toLowerCase().trim(),area=$("materialAreaFilter").value;
  const list=state.materials.filter(m=>(!term||`${m.name} ${m.note}`.toLowerCase().includes(term))&&(!area||m.area===area)).sort((a,b)=>a.area.localeCompare(b.area)||a.name.localeCompare(b.name));
  $("materialList").innerHTML=list.length?list.map(m=>`
    <article class="card material-item">
      <div class="item-top">
        <div><div class="item-title">${esc(m.name)}</div><div class="item-meta">${esc(m.area)} · ${m.quantity} ${esc(m.unit)}${m.note?" · "+esc(m.note):""}</div><div class="material-role-tags">${m.mainRole!==false?'<span>Hauptmaterial</span>':''}${m.consumableRole?'<span>Verbrauchsmaterial</span>':''}</div></div>
        <div class="item-price">${euro(m.unitPrice)}<small> / ${esc(m.unit)}</small></div>
      </div>
      <div class="item-actions"><button data-edit="${m.id}">Bearbeiten</button><button data-delete="${m.id}" class="danger">Löschen</button></div>
    </article>`).join(""):$("emptyState").innerHTML;
  document.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>openMaterial(state.materials.find(m=>m.id===b.dataset.edit)));
  document.querySelectorAll("[data-delete]").forEach(b=>b.onclick=()=>{if(confirm("Material wirklich löschen?")){state.materials=state.materials.filter(m=>m.id!==b.dataset.delete);save();renderMaterials()}});
}

const titles={ "3d":"3D-Druck","laser":"Laser","vinyl":"Vinylfolie","textil":"Textilfolie" };
function options(area){
  return `<option value="">Material auswählen</option>`+state.materials.filter(m=>m.area===area&&m.mainRole!==false).map(m=>`<option value="${m.id}">${esc(m.name)} – ${euro(m.unitPrice)}/${esc(m.unit)}</option>`).join("");
}
function infoRow(label,id,unit){
  return `<div class="info-line">${label}: <strong id="${id}">0,00 €</strong> ${unit||""}</div>`;
}


let consumableSelections=[];
function consumableOptions(selectedId=""){
  const items=state.materials.filter(m=>m.consumableRole).sort((a,b)=>a.name.localeCompare(b.name));
  return `<option value="">Verbrauchsmaterial auswählen</option>`+items.map(m=>`<option value="${m.id}" ${m.id===selectedId?"selected":""}>${esc(m.name)} – ${euro(m.unitPrice)}/${esc(m.unit)}</option>`).join("");
}
function renderConsumables(){
  const box=$("consumableRows"); if(!box)return;
  if(!consumableSelections.length){box.innerHTML='<div class="consumable-empty">Noch kein Verbrauchsmaterial hinzugefügt.</div>';return;}
  box.innerHTML=consumableSelections.map((row,index)=>`<div class="consumable-row"><label>Material<select data-consumable-select="${index}">${consumableOptions(row.materialId)}</select></label><label>Menge<input data-consumable-qty="${index}" type="number" min="0" step="any" inputmode="decimal" value="${row.quantity}"></label><button type="button" class="remove-consumable" data-consumable-remove="${index}">×</button></div>`).join("");
  document.querySelectorAll("[data-consumable-select]").forEach(el=>el.oninput=()=>{consumableSelections[+el.dataset.consumableSelect].materialId=el.value;calculate();});
  document.querySelectorAll("[data-consumable-qty]").forEach(el=>el.oninput=()=>{consumableSelections[+el.dataset.consumableQty].quantity=num(el.value);calculate();});
  document.querySelectorAll("[data-consumable-remove]").forEach(btn=>btn.onclick=()=>{consumableSelections.splice(+btn.dataset.consumableRemove,1);renderConsumables();calculate();});
}
function consumablesCost(){return consumableSelections.reduce((sum,row)=>{const mat=state.materials.find(m=>m.id===row.materialId);return sum+(mat?.unitPrice||0)*num(row.quantity);},0);}
$("addConsumableBtn").onclick=()=>{consumableSelections.push({materialId:"",quantity:1});renderConsumables();};

function renderCalculator(clear=false){
  const type=state.activeModule||"3d";
  if(clear)consumableSelections=[];
  $("calcTitle").textContent=titles[type];
  document.querySelectorAll("[data-tab]").forEach(b=>b.classList.toggle("active",b.dataset.tab===type));
  $("projectName").value=clear?"":$("projectName").value;
  $("customerName").value=clear?"":$("customerName").value;

  let html="";
  if(type==="3d") html=`
    <div class="group-title">MATERIAL & MASCHINE</div>
    <label>Material auswählen<select id="matMain">${options("3D-Druck")}</select></label>
    ${infoRow("Preis aus Datenbank","priceMain")}
    <div class="field-grid">
      <label>Filamentverbrauch (g)<input id="usageMain" type="number" min="0" step="any" inputmode="decimal" value="${clear?"":129}"></label>
      <label>Druckdauer (Minuten)<input id="printMinutes" type="number" min="0" step="any" inputmode="decimal" value="${clear?"":400}"></label>
      <label>Maschinenkosten (€/Stunde)<input id="machine3d" type="number" min="0" step="any" inputmode="decimal" value="${state.settings.machine3d}"></label>
      <label>Arbeitszeit (Minuten)<input id="workMinutes" type="number" min="0" step="any" inputmode="decimal" value="${clear?"":0}"></label>
      <label>Stundenlohn (€/Stunde)<input id="hourlyRate" type="number" min="0" step="any" inputmode="decimal" value="${state.settings.hourly}"></label>
      <label>Verpackung (€)<input id="packaging" type="number" min="0" step="any" inputmode="decimal" value="${state.settings.packaging}"></label>
      <label>Sonstige Kosten (€)<input id="otherCosts" type="number" min="0" step="any" inputmode="decimal" value="${clear?"":0}"></label>
      <label>Fehlerreserve (%)<input id="reserve" type="number" min="0" step="any" inputmode="decimal" value="${state.settings.reserve}"></label>
      <label>Gewinnaufschlag (%)<input id="profit" type="number" min="0" step="any" inputmode="decimal" value="${state.settings.profit}"></label>
    </div>`;

  if(type==="laser") html=`
    <div class="group-title">MATERIAL</div>
    <label>Material auswählen<select id="matMain">${options("Laser")}</select></label>
    ${infoRow("Preis aus Datenbank","priceMain")}
    <div class="field-grid">
      <label>Verbrauchte Fläche / Menge<input id="usageMain" type="number" min="0" step="any" inputmode="decimal" value="${clear?"":300}"></label>
      <label>Gravurdauer (Minuten)<input id="engraveMinutes" type="number" min="0" step="any" inputmode="decimal" value="${clear?"":20}"></label>
      <label>Gravurpreis (€/Minute)<input id="engraveRate" type="number" min="0" step="any" inputmode="decimal" value="${state.settings.laserGravur}"></label>
      <label>Schnittdauer (Minuten)<input id="cutMinutes" type="number" min="0" step="any" inputmode="decimal" value="${clear?"":10}"></label>
      <label>Schnittpreis (€/Minute)<input id="cutRate" type="number" min="0" step="any" inputmode="decimal" value="${state.settings.laserSchnitt}"></label>
      <label>Arbeitszeit (Minuten)<input id="workMinutes" type="number" min="0" step="any" inputmode="decimal" value="${clear?"":10}"></label>
      <label>Stundenlohn (€/Stunde)<input id="hourlyRate" type="number" min="0" step="any" inputmode="decimal" value="${state.settings.hourly}"></label>
      <label>Zubehör / Farbe / Kleber (€)<input id="accessories" type="number" min="0" step="any" inputmode="decimal" value="${clear?"":0}"></label>
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
$("resetCalcBtn").onclick=()=>renderCalculator(true);

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
    material=unitMain*num($("usageMain")?.value);
    machine=(num($("printMinutes")?.value)/60)*num($("machine3d")?.value);
    work=(num($("workMinutes")?.value)/60)*num($("hourlyRate")?.value);
    extra=num($("packaging")?.value)+num($("otherCosts")?.value);
  }
  if(type==="laser"){
    material=unitMain*num($("usageMain")?.value);
    machine=num($("engraveMinutes")?.value)*num($("engraveRate")?.value)+num($("cutMinutes")?.value)*num($("cutRate")?.value);
    work=(num($("workMinutes")?.value)/60)*num($("hourlyRate")?.value);
    extra=num($("accessories")?.value)+num($("packaging")?.value)+num($("otherCosts")?.value);
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
  const p={id:uid(),title,customer:$("customerName").value.trim(),type:titles[state.activeModule],sale:num($("calcForm").dataset.sale),cost:num($("calcForm").dataset.cost),qty:num($("calcForm").dataset.qty)||1,consumables:consumableSelections.filter(r=>r.materialId&&num(r.quantity)>0).map(r=>({materialId:r.materialId,quantity:num(r.quantity)})),created:new Date().toISOString()};
  state.projects.unshift(p);state.lastPrice=p.sale;save();alert("Projekt gespeichert.");
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
}
document.querySelectorAll("[data-tool]").forEach(btn=>btn.onclick=()=>{
  document.querySelectorAll("[data-tool]").forEach(b=>b.classList.toggle("active",b===btn));
  document.querySelectorAll(".tool-panel").forEach(p=>p.classList.toggle("active",p.id===btn.dataset.tool));
});
function calculatePriceCheck(){
  if(!$("pcCosts"))return;
  const costs=num($("pcCosts").value),price=num($("pcMaxPrice").value);
  const profit=price-costs;
  const margin=price>0?(profit/price)*100:0;
  $("pcProfit").textContent=euro(profit);
  $("pcMargin").textContent=`${margin.toLocaleString("de-DE",{minimumFractionDigits:1,maximumFractionDigits:1})} %`;
  $("pcMinimum").textContent=euro(rounded(costs));
  const status=$("pcStatus");
  status.className="";
  if(profit>0){status.textContent="Gewinn";status.classList.add("status-good")}
  else if(profit<0){status.textContent="Verlust";status.classList.add("status-bad")}
  else{status.textContent="Kostendeckend";status.classList.add("status-neutral")}
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
["pcCosts","pcMaxPrice"].forEach(id=>$(id)?.addEventListener("input",calculatePriceCheck));
["gcCosts","gcPercent"].forEach(id=>$(id)?.addEventListener("input",calculateProfitTool));
["dcTarget","dcPercent"].forEach(id=>$(id)?.addEventListener("input",calculateDiscountTool));
["qcMaterial","qcUsage","qcMinutes","qcExtra","qcPackaging","qcHourly","qcReserve","qcProfitPercent"].forEach(id=>$(id)?.addEventListener("input",calculateQuickTool));


function renderProjects(){
  const term=($("projectSearch")?.value||"").trim().toLowerCase();
  const list=state.projects.filter(p=>!term||`${p.title} ${p.customer||""} ${p.type||""}`.toLowerCase().includes(term));
  $("projectList").innerHTML=list.length?list.map(p=>`
    <article class="card project-item">
      <div class="item-top"><div><div class="item-title">${esc(p.title)}</div><div class="item-meta">${esc(p.type)}${p.customer?" · "+esc(p.customer):""} · ${new Date(p.created).toLocaleString("de-DE")}</div></div><div class="item-price">${euro(p.sale)}</div></div>
      <div class="item-meta">Selbstkosten: ${euro(p.cost)} · Gewinn: ${euro(p.sale-p.cost)}${p.qty>1?" · "+euro(p.sale/p.qty)+" je Stück":""}</div>
      <div class="item-actions"><button data-del-project="${p.id}" class="danger">Löschen</button></div>
    </article>`).join(""):$("emptyState").innerHTML;
  document.querySelectorAll("[data-del-project]").forEach(b=>b.onclick=()=>{if(confirm("Projekt löschen?")){state.projects=state.projects.filter(p=>p.id!==b.dataset.delProject);save();renderProjects()}});
}
$("clearProjectsBtn").onclick=()=>{if(state.projects.length&&confirm("Wirklich alle Projekte löschen?")){state.projects=[];save();renderProjects()}};
$("projectSearch").oninput=renderProjects;

function fillSettings(){
  $("setProfit").value=state.settings.profit;$("setHourly").value=state.settings.hourly;$("set3dMachine").value=state.settings.machine3d;
  $("setLaserGravur").value=state.settings.laserGravur;$("setLaserSchnitt").value=state.settings.laserSchnitt;$("setPlotter").value=state.settings.plotter;
  $("setPresse").value=state.settings.presse;$("setReserve").value=state.settings.reserve;$("setPackaging").value=state.settings.packaging;$("setRounding").value=String(state.settings.rounding);
}
$("settingsForm").onsubmit=e=>{
  e.preventDefault();
  state.settings={profit:num($("setProfit").value),hourly:num($("setHourly").value),machine3d:num($("set3dMachine").value),laserGravur:num($("setLaserGravur").value),laserSchnitt:num($("setLaserSchnitt").value),plotter:num($("setPlotter").value),presse:num($("setPresse").value),reserve:num($("setReserve").value),packaging:num($("setPackaging").value),rounding:num($("setRounding").value)};
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
    state={...defaults,...d,settings:{...defaults.settings,...(d.settings||{})}};save();renderMaterials();renderProjects();fillSettings();alert("Backup eingelesen.");
  }catch{alert("Ungültige Backup-Datei.");}
  e.target.value="";
};

let deferredPrompt=null;
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredPrompt=e;$("installBtn").classList.remove("hidden")});
$("installBtn").onclick=async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$("installBtn").classList.add("hidden")};

if("serviceWorker" in navigator) window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js?v=9").catch(()=>{}));


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
initializeAuth();
})();
