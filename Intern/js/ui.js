import { $, num, euro, uid, esc } from "./utils.js";
import { state, save, defaults, getRealProjects } from "./storage.js";
import { renderMaterials } from "./materials.js";
import { renderProjects, viewProject, renderReferenceProjects, renderExperienceValues } from "./projects.js";
import { fillSettings } from "./settings.js";
import { renderTools, resetTool } from "./statistics.js";
import { renderCalculator, renderConsumables, applyCalculatorFields, calculate, titles, setTimerSeconds, setEditingProjectId, setCalculatorProductSize, setCalculatorConsumables, getCalculatorProductSize } from "./calculator.js";
import { appAlert, appPrompt } from "./dialogs.js";
export function setScreen(id){
  document.querySelectorAll(".screen").forEach(s=>s.classList.toggle("active",s.id===id));
  document.querySelectorAll("[data-screen]").forEach(b=>b.classList.toggle("active",b.dataset.screen===id));
  if(id==="materials") renderMaterials();
  if(id==="projects") renderProjects();
  if(id==="references") renderReferenceProjects();
  if(id==="experience") renderExperienceValues();
  if(id==="settings") fillSettings();
  if(id==="tools") renderTools();
  if(id==="home") updateHome();
  window.scrollTo({top:0,behavior:"smooth"});
}
document.querySelectorAll("[data-screen]").forEach(b=>b.onclick=()=>{
  if(b.dataset.screen==="calculator") startNewOrder(); else setScreen(b.dataset.screen);
});
document.querySelectorAll("[data-open]").forEach(b=>b.onclick=()=>startNewOrder(b.dataset.open));
document.querySelectorAll("[data-open-tool]").forEach(b=>b.onclick=()=>{setScreen("tools");setTimeout(async()=>{document.querySelector(`[data-tool="${b.dataset.openTool}"]`)?.click();await resetTool(b.dataset.openTool,false);if(b.dataset.openDetails==="calibration")document.querySelector("#motifCalc details")?.setAttribute("open","")},0)});
document.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>{state.activeModule=b.dataset.tab;save();renderCalculator()});

function resetCalculator(module="3d"){
  state.activeModule=module||"3d";
  setEditingProjectId(null);
  setCalculatorConsumables([]);
  setCalculatorProductSize("medium");
  state.timer={running:false,startedAt:null,elapsed:0};
  renderCalculator(true);
}
export function loadCalculatorData(source={},options={}){
  const module=source.module||({"3D-Druck":"3d","Laser":"laser","Vinylfolie":"vinyl","Textilfolie":"textil"}[source.type])||"3d";
  state.activeModule=module;
  setEditingProjectId(options.editingProjectId??null);
  setCalculatorProductSize(source.productSize||"medium");
  setCalculatorConsumables([]);
  state.timer={running:false,startedAt:null,elapsed:0};
  renderCalculator(true);
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
  state.templates.unshift({id:uid(),name:name.trim(),module:p.module,type:p.type,machineId:p.machineId,productSize:p.productSize,consumables:structuredClone(p.consumables||[]),fields:structuredClone(p.fields||{}),notes:p.notes||"",created:new Date().toISOString()});
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
