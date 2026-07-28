import { initializeAuth } from "./storage.js";
import { updateHome, loadCalculatorData, startNewOrder } from "./ui.js";
import { renderCalculator } from "./calculator.js";
import { renderTools } from "./statistics.js";
import { renderMaterialCategoryFilter, renderMaterials, updateMaterialModeButtons } from "./materials.js";
import { renderProjects } from "./projects.js";
import { fillSettings } from "./settings.js";
import { renderMotifEstimator } from "./estimator.js";
import { resetDesign, renderDesignStatistics } from "./design.js";

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
  resetDesign(false);
  renderDesignStatistics();
}

document.addEventListener("dla:state-saved", updateHome);
document.addEventListener("dla:projects-rendered", renderDesignStatistics);
document.addEventListener("dla:state-loaded", renderAll);
document.addEventListener("dla:new-order",event=>startNewOrder(event.detail?.module||"3d"));
document.addEventListener("dla:estimator-transfer",event=>{
  const data=event.detail||{};
  loadCalculatorData({
    module:"laser",type:"Laser",orderType:data.orderType||"own",customerObjectProcess:data.process,machineId:data.machineId,productSize:"custom",
    fields:{matMain:data.materialId,usageMain:data.area,cutMinutes:data.cutMinutes,engraveMinutes:data.engraveMinutes,workMinutes:data.workMinutes,profit:document.getElementById("mcProfit")?.value||""},
    notes:"Aus Angebotsassistent übernommen"
  },{blankCustomer:true,editingProjectId:null});
});

export function initializeApp(){
  renderCalculator(true);
  renderTools();
  renderMaterialCategoryFilter();
  initializeAuth();
  if("serviceWorker" in navigator){
    window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js?v=4.13.0").catch(()=>{}));
  }
}

initializeApp();
