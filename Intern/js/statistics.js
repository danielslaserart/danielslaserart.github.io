import { $, num, euro, esc } from "./utils.js?v=6.6.15";
import { state, save } from "./storage.js?v=6.6.15";
import { materialSelections, resolveMaterialSelection } from "./materials.js?v=6.6.15";
import { rounded, renderCalculator, calculate } from "./calculator.js?v=6.6.15";
import { setScreen } from "./ui.js?v=6.6.15";
import { renderMotifEstimator } from "./estimator.js?v=6.6.15";
import { resetMotifEstimator } from "./estimator.js?v=6.6.15";
import { appAlert, appConfirm } from "./dialogs.js?v=6.6.15";
function allMaterialOptions(){
  return `<option value="">Kein Material</option>`+
    materialSelections(null,"main")
      .map(m=>`<option value="${m.id}">${esc(m.name)} – ${euro(m.unitPrice)}/${esc(m.unit)}</option>`)
      .join("");
}
export function renderTools(){
  if($("qcMaterial")){
    const old=$("qcMaterial").value;
    $("qcMaterial").innerHTML=allMaterialOptions();
    if([...$("qcMaterial").options].some(o=>o.value===old)) $("qcMaterial").value=old;
  }
  calculatePriceCheck();
  calculateProfitTool();
  calculateDiscountTool();
  calculateQuickTool();
  renderAreaMaterials();
  calculateAreaTool();
  renderMotifEstimator();
  document.querySelectorAll(".tool-panel").forEach(panel=>{
    if(panel.querySelector(".tool-panel-head"))return;
    const title=panel.querySelector(":scope > h3");if(!title)return;
    const head=document.createElement("div");head.className="tool-panel-head";
    const actions=document.createElement("div");actions.className="tool-panel-actions";
    const remember=document.createElement("button");remember.type="button";remember.className="secondary small";remember.textContent="Merken";remember.onclick=()=>rememberTool(panel.id);
    const load=document.createElement("button");load.type="button";load.className="ghost small tool-load-button";load.textContent="Gemerkt laden";load.onclick=()=>loadRememberedTool(panel.id);
    const reset=document.createElement("button");reset.type="button";reset.className="ghost small tool-reset-button";reset.textContent="Neue Kalkulation";reset.onclick=()=>resetTool(panel.id,true);
    actions.append(remember,load,reset);head.append(title,actions);panel.prepend(head);updateToolMemoryButton(panel.id);
  });
}
function toolFields(panel){return [...panel.querySelectorAll("input,select,textarea")].filter(el=>el.type!=="file"&&!el.readOnly&&!el.disabled&&(el.id||el.name))}
function toolFieldKey(el){return el.id||`${el.name}:${el.type}:${el.value}`}
function updateToolMemoryButton(id){
  const panel=$(id),button=panel?.querySelector(".tool-load-button");if(button)button.classList.toggle("hidden",!state.toolMemories?.[id]);
}
async function rememberTool(id){
  const panel=$(id);if(!panel)return;
  const values={};toolFields(panel).forEach(el=>{values[toolFieldKey(el)]=(el.type==="checkbox"||el.type==="radio")?el.checked:el.value});
  state.toolMemories={...(state.toolMemories||{}),[id]:values};save();updateToolMemoryButton(id);await appAlert("Die aktuellen Werte sind gemerkt. Der Rechner startet trotzdem weiterhin mit 0.","Werte gemerkt");
}
async function loadRememberedTool(id){
  const panel=$(id),values=state.toolMemories?.[id];if(!panel||!values)return;
  await resetTool(id,false);
  toolFields(panel).forEach(el=>{const key=toolFieldKey(el);if(!(key in values))return;if(el.type==="checkbox"||el.type==="radio")el.checked=Boolean(values[key]);else el.value=values[key]??""});
  toolFields(panel).forEach(el=>el.dispatchEvent(new Event(el.tagName==="SELECT"||el.type==="checkbox"||el.type==="radio"?"change":"input",{bubbles:true})));
}
export async function resetTool(id,confirmFirst=false){
  if(confirmFirst&&!await appConfirm("Neue Kalkulation starten?\nAlle nicht gespeicherten Eingaben werden gelöscht.","Neue Kalkulation","Neue Kalkulation"))return false;
  if(id==="motifCalc")return resetMotifEstimator(false);
  const panel=$(id);if(!panel)return false;
  panel.querySelectorAll("input").forEach(input=>{if(input.type==="checkbox"||input.type==="radio")input.checked=input.defaultChecked;else if(input.type==="number")input.value="0";else input.value=""});
  panel.querySelectorAll("select").forEach(select=>select.selectedIndex=0);
  if(id==="priceCheck")calculatePriceCheck();if(id==="profitCalc")calculateProfitTool();if(id==="discountCalc")calculateDiscountTool();if(id==="quickCalc")calculateQuickTool();if(id==="areaCalc")calculateAreaTool();
  return true;
}
document.querySelectorAll("[data-tool]").forEach(btn=>btn.onclick=()=>{
  document.querySelectorAll("[data-tool]").forEach(b=>b.classList.toggle("active",b===btn));
  document.querySelectorAll(".tool-panel").forEach(p=>p.classList.toggle("active",p.id===btn.dataset.tool));
  resetTool(btn.dataset.tool,false);
});
function calculatePriceCheck(){
  if(!$("pcCosts"))return;
  const costs=num($("pcCosts").value),price=num($("pcMaxPrice").value),target=num($("pcTargetMargin")?.value);
  const profit=price-costs;
  const margin=price>0?(profit/price)*100:0;
  const markup=costs>0?(profit/costs)*100:0;
  const minimum=target<100?costs/(1-target/100):0;
  $("pcProfit").textContent=euro(profit);
  $("pcMarkup").textContent=`${markup.toLocaleString("de-DE",{minimumFractionDigits:1,maximumFractionDigits:1})} %`;
  $("pcMargin").textContent=`${margin.toLocaleString("de-DE",{minimumFractionDigits:1,maximumFractionDigits:1})} %`;
  $("pcMinimum").textContent=euro(rounded(minimum));
  const status=$("pcStatus");status.className="";
  if(profit<0){status.textContent="Verlust";status.classList.add("status-bad")}
  else if(margin+0.0001>=target){status.textContent="Zielmarge erreicht";status.classList.add("status-good")}
  else{status.textContent="Unter deiner Zielmarge";status.classList.add("status-neutral")}
}
function calculateProfitTool(){
  if(!$("gcCosts"))return;
  const costs=num($("gcCosts").value),percent=num($("gcPercent").value);
  const profit=costs*percent/100;
  $("gcProfit").textContent=euro(profit);
  $("gcSale").textContent=euro(rounded(costs+profit));
}
function calculateDiscountTool(){
  if($("dcTarget")){
    const target=num($("dcTarget").value),percent=num($("dcPercent").value);
    const factor=1-percent/100;
    const original=factor>0?target/factor:0;
    $("dcOriginal").textContent=euro(original);
    $("dcAmount").textContent=euro(Math.max(0,original-target));
  }
  if($("dpOriginal")){
    const original=num($("dpOriginal").value),sale=num($("dpSale").value);
    const amount=original-sale;
    const percent=original>0?(amount/original)*100:0;
    $("dpAmount").textContent=euro(amount);
    $("dpPercent").textContent=`${percent.toLocaleString("de-DE",{minimumFractionDigits:1,maximumFractionDigits:2})} %`;
    const status=$("dpStatus");
    if(status){
      status.className="";
      if(original<=0){status.textContent="Bitte Normalpreis eingeben";status.classList.add("status-neutral");}
      else if(amount<0){status.textContent="Der Verkaufspreis liegt über dem Normalpreis";status.classList.add("status-bad");}
      else if(amount===0){status.textContent="Kein Rabatt";status.classList.add("status-neutral");}
      else{status.textContent="Rabatt berechnet";status.classList.add("status-good");}
    }
  }
}
function calculateQuickTool(){
  if(!$("qcMaterial"))return;
  const mat=resolveMaterialSelection($("qcMaterial").value);
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
["pcCosts","pcMaxPrice","pcTargetMargin"].forEach(id=>$(id)?.addEventListener("input",calculatePriceCheck));
["gcCosts","gcPercent"].forEach(id=>$(id)?.addEventListener("input",calculateProfitTool));
["dcTarget","dcPercent","dpOriginal","dpSale"].forEach(id=>$(id)?.addEventListener("input",calculateDiscountTool));
document.querySelectorAll("[data-discount-mode]").forEach(btn=>btn.addEventListener("click",()=>{
  document.querySelectorAll("[data-discount-mode]").forEach(b=>b.classList.toggle("active",b===btn));
  document.querySelectorAll("[data-discount-panel]").forEach(panel=>panel.classList.toggle("active",panel.dataset.discountPanel===btn.dataset.discountMode));
  calculateDiscountTool();
}));
$("dpSwapBtn")?.addEventListener("click",()=>{
  const original=$("dpOriginal"),sale=$("dpSale");
  const temp=original.value;original.value=sale.value;sale.value=temp;
  calculateDiscountTool();
});
["qcMaterial","qcUsage","qcMinutes","qcExtra","qcPackaging","qcHourly","qcReserve","qcProfitPercent"].forEach(id=>$(id)?.addEventListener("input",calculateQuickTool));

let lastAreaResult={netCm2:0,grossCm2:0};
function areaNumber(value,digits=2){
  return num(value).toLocaleString("de-DE",{minimumFractionDigits:0,maximumFractionDigits:digits});
}
function areaUnitToCm(value,unit){
  const factor=unit==="mm"?0.1:unit==="m"?100:1;
  return num(value)*factor;
}
function toggleAreaShapeFields(){
  const shape=$("acShape")?.value||"rectangle";
  $("acRectangleFields")?.classList.toggle("hidden",shape!=="rectangle");
  $("acSquareFields")?.classList.toggle("hidden",shape!=="square");
  $("acCircleFields")?.classList.toggle("hidden",shape!=="circle");
}
function calculateAreaTool(){
  if(!$("acShape"))return;
  toggleAreaShapeFields();
  const shape=$("acShape").value,unit=$("acUnit").value;
  let perPiece=0;
  if(shape==="rectangle"){
    perPiece=areaUnitToCm($("acWidth").value,unit)*areaUnitToCm($("acHeight").value,unit);
  }else if(shape==="square"){
    const side=areaUnitToCm($("acSide").value,unit);perPiece=side*side;
  }else{
    const radius=areaUnitToCm($("acDiameter").value,unit)/2;perPiece=Math.PI*radius*radius;
  }
  const quantity=Math.max(1,Math.floor(num($("acQuantity").value)||1));
  const net=perPiece*quantity;
  const waste=net*Math.max(0,num($("acWaste").value))/100;
  const gross=net+waste;
  lastAreaResult={netCm2:net,grossCm2:gross};
  $("acPerPiece").textContent=`${areaNumber(perPiece)} cm²`;
  $("acNetTotal").textContent=`${areaNumber(net)} cm²`;
  $("acWasteArea").textContent=`${areaNumber(waste)} cm²`;
  $("acGrossTotal").textContent=`${areaNumber(gross)} cm²`;
  $("acGrossMeters").textContent=`${areaNumber(gross/10000,4)} m²`;
}
function areaMaterials(){
  return state.materials.filter(m=>m.mainRole!==false&&["cm²","m²"].includes(m.unit));
}
function renderAreaMaterials(){
  if(!$("acMaterial"))return;
  const old=$("acMaterial").value;
  const mats=areaMaterials().sort((a,b)=>a.name.localeCompare(b.name));
  $("acMaterial").innerHTML=mats.length
    ? `<option value="">Material auswählen</option>`+mats.map(m=>`<option value="${m.id}">${esc(m.name)} – ${esc(m.unit)}</option>`).join("")
    : `<option value="">Kein Flächenmaterial vorhanden</option>`;
  if(mats.some(m=>m.id===old))$("acMaterial").value=old;
  $("acTransferBtn").disabled=!mats.length;
}
function moduleFromMaterialArea(area){
  if(area==="3D-Druck")return "3d";
  if(area==="Laser")return "laser";
  if(area==="Vinylfolie"||area==="Übertragungsfolie")return "vinyl";
  if(area==="Textilfolie")return "textil";
  return state.activeModule||"laser";
}
function transferAreaToCalculator(){
  calculateAreaTool();
  const mat=resolveMaterialSelection($("acMaterial")?.value);
  if(!mat){appAlert("Bitte zuerst ein Flächenmaterial auswählen.");return;}
  state.activeModule=moduleFromMaterialArea(mat.area);
  save();setScreen("calculator");renderCalculator();
  requestAnimationFrame(()=>{
    if($("matMain"))$("matMain").value=mat.id;
    const usage=mat.unit==="m²"?lastAreaResult.grossCm2/10000:lastAreaResult.grossCm2;
    if($("usageMain"))$("usageMain").value=Number(usage.toFixed(mat.unit==="m²"?6:2));
    calculate();
    $("usageMain")?.scrollIntoView({behavior:"smooth",block:"center"});
  });
}
["acShape","acUnit","acWidth","acHeight","acSide","acDiameter","acQuantity","acWaste"].forEach(id=>$(id)?.addEventListener("input",calculateAreaTool));
$("acTransferBtn")?.addEventListener("click",transferAreaToCalculator);
