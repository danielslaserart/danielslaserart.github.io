import { initializeAuth, state } from "./storage.js";
import { updateHome, loadCalculatorData, startNewOrder } from "./ui.js";
import { renderCalculator } from "./calculator.js";
import { renderTools } from "./statistics.js";
import { renderMaterialCategoryFilter, renderMaterials, updateMaterialModeButtons } from "./materials.js";
import { renderProjects } from "./projects.js";
import { fillSettings } from "./settings.js";
import { renderMotifEstimator, loadProjectIntoMotifEstimator } from "./estimator.js";
import { applyDesignDefaults, renderDesignStatistics } from "./design.js";
import { initializeProcessingProfiles, renderProcessingProfileManager, renderCalculatorProfiles, renderMotifProfiles } from "./processing-profiles.js";
import { initializeWorkshopAnalysis, renderWorkshopAnalysis } from "./workshop-analysis.js";
import { initializeCustomers, renderCustomers } from "./customers.js";

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

document.addEventListener("dla:state-saved", updateHome);
document.addEventListener("dla:projects-rendered", renderDesignStatistics);
document.addEventListener("dla:state-loaded", renderAll);
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
  renderCalculator(true);
  renderTools();
  renderMaterialCategoryFilter();
  initializeProcessingProfiles();
  initializeWorkshopAnalysis();
  initializeCustomers();
  initializeAuth();
  if("serviceWorker" in navigator){
    window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js?v=6.3.1",{updateViaCache:"none"}).catch(()=>{}));
  }
}

initializeApp();
