import { initializeAuth, state } from "./storage.js?v=8.0";
import { num } from "./utils.js?v=8.0";
import { updateHome, loadCalculatorData, startNewOrder } from "./ui.js?v=8.0";
import { renderCalculator } from "./calculator.js?v=8.0";
import { renderTools } from "./statistics.js?v=8.0";
import { renderMaterialCategoryFilter, renderMaterials, updateMaterialModeButtons } from "./materials.js?v=8.0";
import { renderProjects } from "./projects.js?v=8.0";
import { fillSettings } from "./settings.js?v=8.0";
import { renderMotifEstimator, loadProjectIntoMotifEstimator } from "./estimator.js?v=8.0";
import { applyDesignDefaults, renderDesignStatistics } from "./design.js?v=8.0";
import { initializeProcessingProfiles, renderProcessingProfileManager, renderCalculatorProfiles, renderMotifProfiles } from "./processing-profiles.js?v=8.0";
import { initializeWorkshopAnalysis, renderWorkshopAnalysis } from "./workshop-analysis.js?v=8.0";
import { initializeCustomers, renderCustomers } from "./customers.js?v=8.0";
import "./position-profile-fix.js?v=8.0";

// Zahlen lassen sich auf Mobilgeräten direkt überschreiben: Beim Antippen wird
// der komplette bisherige Wert markiert, sodass aus „1“ + „2“ nicht „12“ wird.
document.addEventListener("focusin",event=>{
  const input=event.target;
  if(!(input instanceof HTMLInputElement)||input.type!=="number"||input.readOnly||input.disabled)return;
  requestAnimationFrame(()=>{try{input.select()}catch{}});
});

const loadPositionUiFix=()=>import("./position-ui-fix.js?v=8.0").catch(error=>console.warn("Positions-UI-Zusatz konnte nicht geladen werden:",error));
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
