import { initializeAuth, state } from "./storage.js?v=7.2";
import { num } from "./utils.js?v=7.2";
import { updateHome, loadCalculatorData, startNewOrder } from "./ui.js?v=7.2";
import { renderCalculator } from "./calculator.js?v=7.2";
import { renderTools } from "./statistics.js?v=7.2";
import { renderMaterialCategoryFilter, renderMaterials, updateMaterialModeButtons } from "./materials.js?v=7.2";
import { renderProjects } from "./projects.js?v=7.2";
import { fillSettings } from "./settings.js?v=7.2";
import { renderMotifEstimator, loadProjectIntoMotifEstimator } from "./estimator.js?v=7.2";
import { applyDesignDefaults, renderDesignStatistics } from "./design.js?v=7.2";
import { initializeProcessingProfiles, renderProcessingProfileManager, renderCalculatorProfiles, renderMotifProfiles } from "./processing-profiles.js?v=7.2";
import { initializeWorkshopAnalysis, renderWorkshopAnalysis } from "./workshop-analysis.js?v=7.2";
import { initializeCustomers, renderCustomers } from "./customers.js?v=7.2";
import "./position-profile-fix.js?v=7.2";

// Zahlen lassen sich auf Mobilgeräten direkt überschreiben: Beim Antippen wird
// der komplette bisherige Wert markiert, sodass aus „1“ + „2“ nicht „12“ wird.
document.addEventListener("focusin",event=>{
  const input=event.target;
  if(!(input instanceof HTMLInputElement)||input.type!=="number"||input.readOnly||input.disabled)return;
  requestAnimationFrame(()=>{try{input.select()}catch{}});
});

const loadPositionUiFix=()=>import("./position-ui-fix.js?v=7.2").catch(error=>console.warn("Positions-UI-Zusatz konnte nicht geladen werden:",error));
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",loadPositionUiFix,{once:true});else loadPositionUiFix();

function renderAll(){
  updateHome();
  renderCalculator();
  renderTools();
  renderMaterialCategoryFilter();
  updateMaterialModeButtons();
  renderMaterials();
  renderProjects();
  fillSettings();
  renderMotifEstimator();
  applyDesignDefaults();
  renderDesignStatistics();
  renderProcessingProfileManager();
  renderCalculatorProfiles();
  renderMotifProfiles();
  renderWorkshopAnalysis();
  renderCustomers();
}
let appBindingsInitialized=false;
function initializeBusinessModules(){
  if(appBindingsInitialized)return;
  appBindingsInitialized=true;
  initializeProcessingProfiles();
  initializeWorkshopAnalysis();
  initializeCustomers();
}

document.addEventListener("dla:state-saved", updateHome);
document.addEventListener("dla:projects-rendered", renderDesignStatistics);
document.addEventListener("dla:state-loaded",()=>{initializeBusinessModules();renderAll();});
document.addEventListener("dla:security-reset",()=>{
  document.querySelectorAll(".screen").forEach(screen=>screen.classList.toggle("active",screen.id==="home"));
  if(appBindingsInitialized)renderAll();
});
document.addEventListener("dla:new-order",event=>startNewOrder(event.detail?.module||"3d"));
document.addEventListener("dla:estimator-transfer",event=>{
  const data=event.detail||{};
  const rawTransferredProfit=data.profitPercent??data.inputs?.mcProfit??document.getElementById("mcProfit")?.value;
  const transferredProfit=rawTransferredProfit!==undefined&&rawTransferredProfit!==null&&rawTransferredProfit!==""?num(rawTransferredProfit):num(state.settings.profit);
  const rawTransferredReserve=data.reservePercent??data.inputs?.mcReserve??document.getElementById("mcReserve")?.value;
  const transferredReserve=rawTransferredReserve!==undefined&&rawTransferredReserve!==null&&rawTransferredReserve!==""?num(rawTransferredReserve):num(state.settings.reserve);
  const [materialId="",variantId=""]=String(data.materialId||"").split("::");
  const activity=data.process==="both"?"both":data.process==="cut"?"cut":"engrave";
  loadCalculatorData({
    module:"laser",type:"Laser",orderType:data.orderType||"own",customerObjectProcess:data.process,machineId:data.machineId,productSize:"custom",
    transferSource:"estimator",enforcedProfitPercent:transferredProfit,enforcedReservePercent:transferredReserve,
    fields:{matMain:data.materialId,usageMain:data.area,cutMinutes:data.cutMinutes,engraveMinutes:data.engraveMinutes,workMinutes:data.workMinutes,paintCoats:data.inputs?.mcPaint??0,paintCustomFee:data.inputs?.mcPaintCustomFee??0,sandEnabled:data.inputs?.mcSand?"true":"false",glueEnabled:data.inputs?.mcGlue?"true":"false",glueSize:data.inputs?.mcGlueSize||"medium",glueCount:data.inputs?.mcGlueCount||"1",solderEnabled:data.inputs?.mcSolder?"true":"false",reserve:transferredReserve,profit:transferredProfit,difficulty:data.customerPricing?.difficultyKey||"normal",riskSurcharge:data.customerPricing?.risk??"",customerBaseFeeEnabled:"true",customerExpressEnabled:num(data.customerPricing?.express)>0?"true":"false"},
    positions:[{label:"Motiv-Schätzer",calculationSource:"estimator",profitPercent:transferredProfit,reservePercent:transferredReserve,activity,materialSource:data.materialSource==="customer"?"customer":"managed",materialId,variantId,materialName:data.materialName||"",machineId:data.machineId||"",machineName:data.machineName||"",materialCost:data.materialCost||0,machineMinutes:(data.cutMinutes||0)+(data.engraveMinutes||0),machineCost:data.machineCost||0,workMinutes:data.workMinutes||0,workCost:data.workCost||0,otherCost:data.additionalCosts||0,quantity:1,unit:"Stück"}],
    notes:"Aus Angebotsassistent übernommen"
  },{blankCustomer:true,editingProjectId:null});
});
document.addEventListener("dla:open-estimator-editor",()=>{
  document.querySelector("#motifCalc details")?.setAttribute("open","");
  document.querySelector('.bottom-nav [data-screen="learning"]')?.classList.add("active");
  document.querySelectorAll(".screen").forEach(s=>s.classList.toggle("active",s.id==="tools"));
});
document.addEventListener("dla:edit-estimator-project",event=>{
  const id=event.detail?.projectId;
  const project=state.projects?.find(p=>p.id===id);
  if(project)loadProjectIntoMotifEstimator(project);
});

export function initializeApp(){
  initializeAuth();
  if("serviceWorker" in navigator){
    window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js?v=8.0",{updateViaCache:"none"}).catch(()=>{}));
  }
}

initializeApp();

import { getRealProjects } from "./storage.js?v=7.2";
import { euro } from "./utils.js?v=7.2";
import { getPriceLadderData } from "./price-ladder.js?v=7.2";
const commissionEl=id=>document.getElementById(id);
function commissionRefresh(){
 const select=commissionEl("commissionProject");if(!select)return;
 const selected=select.value;
 select.replaceChildren(new Option("Projekt auswählen …",""));
 for(const project of getRealProjects())select.add(new Option(project.title||project.projectName||"Projekt",project.id));
 select.value=selected;
}
function commissionCalculate(){
 const mode=commissionEl("commissionMode").value;
 const amount=commissionEl("commissionAmount").valueAsNumber,rate=commissionEl("commissionRate").valueAsNumber,cost=commissionEl("commissionCost").valueAsNumber;
 const valid=Number.isFinite(amount)&&amount>=0&&Number.isFinite(rate)&&rate>=0&&rate<100;
 const round=n=>Math.round((n+Number.EPSILON)*100)/100;
 let gross=null,fee=null,net=null,profit=null;
 if(valid){
  gross=mode==="net"?Math.ceil((amount/(1-rate/100))*100-1e-8)/100:round(amount);
  fee=round(gross*rate/100);net=round(gross-fee);
  if(Number.isFinite(cost)&&cost>=0)profit=round(net-cost);
 }
 commissionEl("commissionError").textContent=valid||commissionEl("commissionAmount").value===""?"":"Bitte einen gültigen Betrag und eine Provision von 0 bis unter 100 % eingeben.";
 for(const [id,value] of [["commissionGross",gross],["commissionFee",fee],["commissionNet",net],["commissionProfit",profit]])commissionEl(id).textContent=value===null?"–":euro(value);
}
function commissionSelect(){
 const project=getRealProjects().find(p=>p.id===commissionEl("commissionProject").value);
 const ladder=project?getPriceLadderData(project):null;
 const price=ladder?.agreementPrice??ladder?.recommendedSalePrice??null;
 commissionEl("commissionAmount").value=price??"";
 commissionEl("commissionCost").value=ladder?.selfCosts??"";
 commissionEl("commissionReference").textContent=project?"Projektpreis: "+(price===null?"nicht bekannt":euro(price))+" · Gesamtprojekt":"";
 commissionCalculate();
}
if(commissionEl("commissionProject")){
 commissionEl("commissionProject").addEventListener("change",commissionSelect);
 for(const id of ["commissionAmount","commissionRate","commissionCost","commissionMode"])commissionEl(id).addEventListener("input",commissionCalculate);
 commissionEl("commissionReset").addEventListener("click",()=>{commissionEl("commissionProject").value="";commissionEl("commissionRate").value="0";commissionEl("commissionMode").value="net";commissionSelect();});
 document.querySelector('[data-screen="commission"]')?.addEventListener("click",commissionRefresh);
 document.addEventListener("dla:state-loaded",commissionRefresh);
 document.addEventListener("dla:projects-rendered",commissionRefresh);
}
