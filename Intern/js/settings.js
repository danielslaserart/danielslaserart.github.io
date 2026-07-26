import { $, num, esc, inferMaterialCategory } from "./utils.js";
import { state, save, defaults, replaceState, normalizeProjectRecord, normalizeLearningRecord } from "./storage.js";
import { renderMachines } from "./machines.js";
import { renderMaterials } from "./materials.js";
import { renderProjects } from "./projects.js";
export function fillSettings(){
  renderMachines();
  $("setProfit").value=state.settings.profit;$("setHourly").value=state.settings.hourly;$("setPlotter").value=state.settings.plotter;
  $("setPresse").value=state.settings.presse;$("setReserve").value=state.settings.reserve;$("setPackaging").value=state.settings.packaging;$("setRounding").value=String(state.settings.rounding);
  $("setOverhead").value=num(state.settings.overhead);$("setElectricity").value=num(state.settings.electricity);
  $("setDefaultMachine").innerHTML='<option value="">Keine Vorgabe</option>'+state.machines.map(m=>`<option value="${m.id}">${esc(m.name)}</option>`).join("");
  $("setDefaultMaterial").innerHTML='<option value="">Keine Vorgabe</option>'+state.materials.map(m=>`<option value="${m.id}">${esc(m.name)}</option>`).join("");
  $("setDefaultMachine").value=state.settings.defaultMachine||"";$("setDefaultMaterial").value=state.settings.defaultMaterial||"";
}
$("settingsForm").onsubmit=e=>{
  e.preventDefault();
  state.settings={...state.settings,profit:num($("setProfit").value),hourly:num($("setHourly").value),plotter:num($("setPlotter").value),presse:num($("setPresse").value),reserve:num($("setReserve").value),packaging:num($("setPackaging").value),rounding:num($("setRounding").value),overhead:num($("setOverhead").value),electricity:num($("setElectricity").value),defaultMachine:$("setDefaultMachine").value,defaultMaterial:$("setDefaultMaterial").value};
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
    replaceState({...defaults,...d,settings:{...defaults.settings,...(d.settings||{})}});
    state.machines=Array.isArray(state.machines)&&state.machines.length?state.machines:structuredClone(defaults.machines);
    state.learningRecords=(Array.isArray(state.learningRecords)?state.learningRecords:[]).map(normalizeLearningRecord);
    state.projects=(state.projects||[]).map(normalizeProjectRecord);
    state.materials=(state.materials||[]).map(m=>({...m,mainRole:m.mainRole!==false,consumableRole:Boolean(m.consumableRole||m.area==="Sonstiges"),consumableCategory:m.consumableCategory||"Sonstiges",defaultConsumption:num(m.defaultConsumption),autoAdd:Boolean(m.autoAdd),favorite:Boolean(m.favorite),category:inferMaterialCategory(m),supplier:m.supplier||"",image:m.image||"",lastUsed:m.lastUsed||null,width:num(m.width),height:num(m.height),dimensionUnit:m.dimensionUnit||"cm",sheetCount:num(m.sheetCount)||1,scaleWithSize:true,workshopUnit:m.workshopUnit||m.unit||"Einheit",workshopUnitAmount:num(m.workshopUnitAmount)||1,consumptionLevels:{small:num(m.consumptionLevels?.small)||(Boolean(m.scaleWithSize)?num(m.defaultConsumption)*(num(m.sizeFactors?.small)||0.5):num(m.defaultConsumption)),medium:num(m.consumptionLevels?.medium)||num(m.defaultConsumption),large:num(m.consumptionLevels?.large)||(Boolean(m.scaleWithSize)?num(m.defaultConsumption)*(num(m.sizeFactors?.large)||2):num(m.defaultConsumption))},consumableModules:Array.isArray(m.consumableModules)&&m.consumableModules.length?m.consumableModules:["3d","laser","vinyl","textil"],sizeFactors:{small:num(m.sizeFactors?.small)||0.5,medium:num(m.sizeFactors?.medium)||1,large:num(m.sizeFactors?.large)||2}}));save();renderMaterials();renderProjects();fillSettings();alert("Backup eingelesen.");
  }catch{alert("Ungültige Backup-Datei.");}
  e.target.value="";
};

let deferredPrompt=null;
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredPrompt=e;$("installBtn").classList.remove("hidden")});
$("installBtn").onclick=async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$("installBtn").classList.add("hidden")};
