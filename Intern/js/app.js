import { initializeAuth, state } from "./storage.js?v=6.5";
import { updateHome, loadCalculatorData, startNewOrder } from "./ui.js?v=6.6.4";
import { renderCalculator } from "./calculator.js?v=6.6.4";
import { renderTools } from "./statistics.js?v=6.5";
import { renderMaterialCategoryFilter, renderMaterials, updateMaterialModeButtons } from "./materials.js?v=6.5";
import { renderProjects } from "./projects.js?v=6.6.5";
import { fillSettings } from "./settings.js?v=6.5";
import { renderMotifEstimator, loadProjectIntoMotifEstimator } from "./estimator.js?v=6.5";
import { applyDesignDefaults, renderDesignStatistics } from "./design.js?v=6.5";
import { initializeProcessingProfiles, renderProcessingProfileManager, renderCalculatorProfiles, renderMotifProfiles } from "./processing-profiles.js?v=6.5";
import { initializeWorkshopAnalysis, renderWorkshopAnalysis } from "./workshop-analysis.js?v=6.5";
import { initializeCustomers, renderCustomers } from "./customers.js?v=6.5";
import "./position-profile-fix.js?v=6.6.4";

const loadPositionUiFix=()=>import("./position-ui-fix.js?v=6.6.7").catch(error=>console.warn("Positions-UI-Zusatz konnte nicht geladen werden:",error));
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
  loadCalculatorData({
    module:"laser",type:"Laser",orderType:data.orderType||"own",customerObjectProcess:data.process,machineId:data.machineId,productSize:"custom",
    fields:{matMain:data.materialId,usageMain:data.area,cutMinutes:data.cutMinutes,engraveMinutes:data.engraveMinutes,workMinutes:data.workMinutes,profit:document.getElementById("mcProfit")?.value||"",difficulty:data.customerPricing?.difficultyKey||"normal",riskSurcharge:data.customerPricing?.risk??"",expressSurcharge:data.customerPricing?.express??""},
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
    window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js?v=6.6",{updateViaCache:"none"}).catch(()=>{}));
  }
}

initializeApp();
