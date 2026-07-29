import { $, num, euro, uid, esc } from "./utils.js";
import { state, save, defaults, getRealProjects } from "./storage.js";
import { renderMaterials } from "./materials.js";
import { renderProjects, viewProject, renderReferenceProjects, renderExperienceValues } from "./projects.js";
import { fillSettings } from "./settings.js";
import { renderTools, resetTool } from "./statistics.js";
import { renderCalculator, renderConsumables, applyCalculatorFields, calculate, titles, setTimerSeconds, setEditingProjectId, setCalculatorProductSize, setCalculatorConsumables, getCalculatorProductSize, getOrderType } from "./calculator.js";
import { appAlert, appPrompt } from "./dialogs.js";
import { applyDesignDefaults } from "./design.js";
export function setScreen(id){
  const current=document.querySelector(".screen.active")?.id;
  if(current)sessionStorage.setItem(`dla-scroll-${current}`,String(window.scrollY));
  document.querySelectorAll(".screen").forEach(s=>s.classList.toggle("active",s.id===id));
  const learningScreens=["learning","references","experience","learningStats"];
  document.querySelectorAll(".bottom-nav [data-screen]").forEach(b=>b.classList.toggle("active",b.dataset.screen===id||(b.dataset.screen==="learning"&&learningScreens.includes(id))));
  if(id==="materials") renderMaterials();
  if(id==="projects") renderProjects();
  if(id==="references") renderReferenceProjects();
  if(id==="experience") renderExperienceValues();
  if(id==="learningStats") renderLearningStatistics();
  if(id==="settings") fillSettings();
  if(id==="tools") renderTools();
  if(id==="home") updateHome();
  if(id==="design") applyDesignDefaults();
  const saved=Number(sessionStorage.getItem(`dla-scroll-${id}`)||0);
  requestAnimationFrame(()=>window.scrollTo({top:saved,behavior:"auto"}));
}
document.querySelectorAll("[data-screen]").forEach(b=>b.onclick=()=>{
  if(b.dataset.screen==="calculator") startNewOrder(); else setScreen(b.dataset.screen);
});
document.querySelectorAll("[data-open]").forEach(b=>b.onclick=()=>startNewOrder(b.dataset.open));
document.querySelectorAll("[data-open-tool]").forEach(b=>b.onclick=()=>{setScreen("tools");setTimeout(async()=>{document.querySelector(`[data-tool="${b.dataset.openTool}"]`)?.click();await resetTool(b.dataset.openTool,false);if(b.dataset.openDetails==="calibration"){document.querySelector("#motifCalc details")?.setAttribute("open","");document.querySelector('.bottom-nav [data-screen="learning"]')?.classList.add("active");const panel=$("motifCalc");if(panel&&!panel.querySelector(".learning-back-button")){const back=document.createElement("button");back.type="button";back.className="ghost small learning-back-button";back.textContent="← Lernen";back.onclick=()=>setScreen("learning");panel.prepend(back)}}},0)});
function renderLearningStatistics(){
  const box=$("learningStatisticsContent");if(!box)return;
  const records=state.learningRecords||[];
  const timeRows=records.filter(r=>r.actualTotalTime!=null&&num(r.estimatedTotalTime)>0);
  const priceRows=records.filter(r=>r.actualPrice!=null&&num(r.estimatedPrice)>0);
  const avg=(rows,fn)=>rows.length?rows.reduce((sum,r)=>sum+fn(r),0)/rows.length:null;
  const timeDeviation=avg(timeRows,r=>(num(r.actualTotalTime)-num(r.estimatedTotalTime))/num(r.estimatedTotalTime)*100);
  const priceDeviation=avg(priceRows,r=>(num(r.actualPrice)-num(r.estimatedPrice))/num(r.estimatedPrice)*100);
  const active=records.filter(r=>r.reference!==false).length;
  box.innerHTML=`<div class="stats learning-stat-grid"><div class="card stat"><span>Erfahrungswerte</span><strong>${records.length}</strong></div><div class="card stat"><span>Aktiv im Lernsystem</span><strong>${active}</strong></div><div class="card stat"><span>Ø Zeitabweichung</span><strong>${timeDeviation==null?"–":timeDeviation.toLocaleString("de-DE",{maximumFractionDigits:1})+" %"}</strong></div><div class="card stat"><span>Ø Preisabweichung</span><strong>${priceDeviation==null?"–":priceDeviation.toLocaleString("de-DE",{maximumFractionDigits:1})+" %"}</strong></div></div><div class="card learning-progress-card"><h3>Lernfortschritt</h3><p>${records.length<3?"Noch wenige Vergleichswerte. Mit jedem gepflegten Ist-Wert werden die Schätzungen zuverlässiger.":records.length<10?"Gute Grundlage. Weitere tatsächliche Zeiten und Verkaufspreise verbessern die Trefferquote.":"Das Lernsystem verfügt über eine solide Datenbasis."}</p><div class="learning-progress"><i style="width:${Math.min(100,records.length*10)}%"></i></div></div>`;
}
document.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>{state.activeModule=getOrderType()==="own"?b.dataset.tab:"laser";save();renderCalculator()});

function resetCalculator(module="3d"){
  state.activeModule=module||"3d";
  setEditingProjectId(null);
  setCalculatorConsumables([]);
  setCalculatorProductSize("medium");
  state.timer={running:false,startedAt:null,elapsed:0};
  renderCalculator(true);
  const orderRadio=document.querySelector('input[name="orderType"][value="own"]');
  if(orderRadio)orderRadio.checked=true;
  if($("customerObjectProcess"))$("customerObjectProcess").value="engrave";
  renderCalculator(false);
}
export function loadCalculatorData(source={},options={}){
  const snapshot=source.calculationSnapshot?.sourceModule==="calculator"?source.calculationSnapshot:null;
  if(snapshot)source={...source,module:snapshot.module||source.module,orderType:snapshot.orderType||source.orderType,customerObjectProcess:snapshot.customerObjectProcess||source.customerObjectProcess,machineId:snapshot.machineId||source.machineId,productSize:snapshot.productSize||source.productSize,consumables:snapshot.consumables||source.consumables,workSeconds:snapshot.workSeconds??source.workSeconds,fields:{...(source.fields||{}),...(snapshot.fields||{})}};
  const module=source.module||({"3D-Druck":"3d","Laser":"laser","Vinylfolie":"vinyl","Textilfolie":"textil"}[source.type])||"3d";
  const requestedOrderType=source.orderType||"own";
  state.activeModule=requestedOrderType==="own"?module:"laser";
  setCalculatorProductSize(source.productSize||"medium");
  setCalculatorConsumables([]);
  state.timer={running:false,startedAt:null,elapsed:0};
  renderCalculator(true);
  setEditingProjectId(options.editingProjectId??null);
  const orderRadio=document.querySelector(`input[name="orderType"][value="${requestedOrderType}"]`);
  if(orderRadio)orderRadio.checked=true;
  if($("customerObjectProcess"))$("customerObjectProcess").value=source.customerObjectProcess||source.estimatorData?.process||"engrave";
  renderCalculator(false);
  document.querySelectorAll("[data-product-size]").forEach(b=>b.classList.toggle("active",b.dataset.productSize===getCalculatorProductSize()));
  setCalculatorConsumables((source.consumables||[]).map(r=>({materialId:r.materialId||"",quantity:num(r.quantity),auto:false})));
  renderConsumables();
  applyCalculatorFields(source.fields||{});
  if(source.machineId&&$("machineSelect"))$("machineSelect").value=source.machineId;
  if(options.blankCustomer){
    $("projectName").value="";
    $("customerName").value="";
    if($("customerAddress"))$("customerAddress").value="";
    if($("projectStatus"))$("projectStatus").value="offer";
    if($("projectTags"))$("projectTags").value="";
  }else{
    $("projectName").value=options.duplicate?`${source.title||source.name||"Projekt"} – Kopie`:(source.title||"");
    $("customerName").value=source.customer||"";
    if($("customerAddress"))$("customerAddress").value=source.customerAddress||source.fields?.customerAddress||"";
    if($("projectStatus"))$("projectStatus").value=source.status||"offer";
    if($("projectTags"))$("projectTags").value=(source.tags||[]).join(", ");
  }
  if($("projectNotes"))$("projectNotes").value=source.notes||"";
  setTimerSeconds(options.blankCustomer?0:num(source.workSeconds));
  calculate();
  setScreen("calculator");
}
export function startNewOrder(module="3d"){
  resetCalculator(module);
  save();
  setScreen("calculator");
}
export async function createTemplateFromProject(id){
  const p=getRealProjects().find(x=>x.id===id);if(!p)return;
  const name=await appPrompt("Name der Vorlage:",p.title,"Vorlage speichern");if(!name)return;
  state.templates=state.templates||[];
  state.templates.unshift({id:uid(),name:name.trim(),module:p.module,type:p.type,orderType:p.orderType||"own",customerObjectProcess:p.customerObjectProcess||null,machineId:p.machineId,productSize:p.productSize,consumables:structuredClone(p.consumables||[]),fields:structuredClone(p.fields||{}),notes:p.notes||"",created:new Date().toISOString()});
  save();updateHome();appAlert("Vorlage gespeichert.");
}
function useTemplate(id){
  const t=(state.templates||[]).find(x=>x.id===id);if(!t)return;
  loadCalculatorData(t,{blankCustomer:true,editingProjectId:null});
}
function renderTemplates(){
  const box=$("homeTemplates");if(!box)return;
  const items=state.templates||[];
  box.innerHTML=items.length?items.slice(0,8).map(t=>`<button class="template-card" type="button" data-use-template="${t.id}"><span>★</span><b>${esc(t.name)}</b><small>${esc(t.type||titles[t.module]||"")}</small></button>`).join(""):`<div class="empty-state template-empty">Noch keine Vorlagen. Öffne ein Projekt und wähle „Als Vorlage“.</div>`;
  box.querySelectorAll("[data-use-template]").forEach(b=>b.onclick=()=>useTemplate(b.dataset.useTemplate));
}
export function updateHome(){
  const realProjects=getRealProjects();
  const now=new Date(),month=now.getMonth(),year=now.getFullYear();
  const monthProjects=realProjects.filter(p=>{const d=new Date(p.created||p.updated);return d.getMonth()===month&&d.getFullYear()===year});
  const monthProfit=monthProjects.reduce((sum,p)=>sum+num(p.sale)-num(p.cost),0);
  $("homeMaterialCount").textContent=state.materials.length;
  $("homeOpenCount").textContent=realProjects.filter(p=>!["done","billed"].includes(p.status||"offer")).length;
  $("homeMonthProfit").textContent=euro(monthProfit);
  $("homeMonthOrders").textContent=`${monthProjects.length} ${monthProjects.length===1?"Auftrag":"Aufträge"}`;
  $("homeFavoriteCount").textContent=`${state.materials.filter(m=>m.favorite).length} Favoriten`;
  $("homeLastPrice").textContent=state.lastPrice==null?"–":euro(state.lastPrice);
  const customerObjects=realProjects.filter(p=>p.orderType==="customerObject"),ownProducts=realProjects.filter(p=>(p.orderType||"own")==="own");
  const designProjects=realProjects.filter(p=>p.orderType==="design"||p.projectType==="design");
  if($("homeCustomerObjectCount"))$("homeCustomerObjectCount").textContent=customerObjects.length;
  if($("homeOwnProductCount"))$("homeOwnProductCount").textContent=ownProducts.length;
  const manufacturingCount=customerObjects.length+ownProducts.length;
  if($("homeCustomerObjectShare"))$("homeCustomerObjectShare").textContent=`${manufacturingCount?(customerObjects.length/manufacturingCount*100).toLocaleString("de-DE",{maximumFractionDigits:1}):0} %`;
  if($("homeCustomerObjectAverage"))$("homeCustomerObjectAverage").textContent=euro(customerObjects.length?customerObjects.reduce((sum,p)=>sum+num(p.actualPrice??p.sale),0)/customerObjects.length:0);
  if($("homeDesignCount"))$("homeDesignCount").textContent=designProjects.length;
  if($("homeDesignRevenue"))$("homeDesignRevenue").textContent=euro(designProjects.reduce((sum,p)=>sum+num(p.actualPrice??p.sale),0));
  if($("homeDesignAverage"))$("homeDesignAverage").textContent=euro(designProjects.length?designProjects.reduce((sum,p)=>sum+num(p.actualPrice??p.sale),0)/designProjects.length:0);
  const greeting=now.getHours()<11?"Guten Morgen":now.getHours()<18?"Guten Tag":"Guten Abend";
  if($("dashboardGreeting")) $("dashboardGreeting").textContent=`${greeting}, Daniel`;
  const todayKey=now.toLocaleDateString("de-DE");
  const today=realProjects.filter(p=>new Date(p.created||p.updated).toLocaleDateString("de-DE")===todayKey);
  if($("homeTodayOrders")) $("homeTodayOrders").textContent=today.length;
  if($("homeTodayRevenue")) $("homeTodayRevenue").textContent=euro(today.reduce((a,p)=>a+num(p.sale),0));
  if($("homeMonthRevenue")) $("homeMonthRevenue").textContent=euro(monthProjects.reduce((a,p)=>a+num(p.sale),0));
  if($("homeMaterialWarnings")) $("homeMaterialWarnings").textContent=state.materials.reduce((count,m)=>count+((m.trackStock&&num(m.stock)<=num(m.minStock))?1:0)+(m.variants||[]).filter(v=>v.trackStock&&num(v.stock)<=num(v.minStock)).length,0);
  if($("homeTodayProfit")) $("homeTodayProfit").textContent=euro(today.reduce((a,p)=>a+num(p.sale)-num(p.cost),0));
  if($("homeTodayWork")){const mins=Math.round(today.reduce((a,p)=>a+num(p.workSeconds),0)/60);$("homeTodayWork").textContent=mins<60?`${mins} Min.`:`${Math.floor(mins/60)} Std. ${mins%60} Min.`;}
  renderTemplates();
  renderRecentProjects();
  const latest=realProjects.slice().sort((a,b)=>new Date(b.updated||b.created)-new Date(a.updated||a.created))[0];
  const continueBtn=$("continueLastProjectBtn"),continueText=$("continueLastProjectText");
  if(continueBtn&&continueText){
    continueBtn.disabled=!latest;
    continueText.textContent=latest?`${latest.title}${latest.customer?" · "+latest.customer:""}`:"Noch kein Projekt vorhanden";
    continueBtn.onclick=latest?()=>viewProject(latest.id):null;
  }
}
function renderRecentProjects(){
  const box=$("homeRecentProjects");if(!box)return;
  const items=getRealProjects().slice().sort((a,b)=>new Date(b.updated||b.created)-new Date(a.updated||a.created)).slice(0,3);
  box.innerHTML=items.length?items.map(p=>`<button class="recent-project" type="button" data-recent-id="${p.id}"><div><b>${esc(p.title)}</b><small>${esc(p.customer||p.type||"")} · ${new Date(p.updated||p.created).toLocaleDateString("de-DE")}</small></div><strong>${euro(p.sale)}</strong></button>`).join(""):`<div class="empty-state">Noch keine Projekte gespeichert.</div>`;
  box.querySelectorAll("[data-recent-id]").forEach(btn=>btn.onclick=()=>viewProject(btn.dataset.recentId));
}
if($("dashboardSearch")) $("dashboardSearch").oninput=e=>{
  const q=e.target.value.trim().toLowerCase(),box=$("dashboardSearchResults");
  if(!q){box.classList.add("hidden");box.innerHTML="";return}
  const found=getRealProjects().filter(p=>[p.title,p.customer,p.machineName,p.notes,...(p.tags||[])].join(" ").toLowerCase().includes(q)).slice(0,6);
  box.innerHTML=found.length?found.map(p=>`<button type="button" data-dash-project="${p.id}"><span><b>${esc(p.title)}</b><small>${esc(p.customer||p.type||"")}</small></span><strong>${euro(p.sale)}</strong></button>`).join(""):`<div class="empty-state">Kein passendes Projekt.</div>`;
  box.classList.remove("hidden");box.querySelectorAll("[data-dash-project]").forEach(btn=>btn.onclick=()=>{box.classList.add("hidden");viewProject(btn.dataset.dashProject)});
};

// MATERIALS
