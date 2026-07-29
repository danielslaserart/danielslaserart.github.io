import { $, num, euro, esc, uid } from "./utils.js";
import { state, save } from "./storage.js";
import { materialSelections, resolveMaterialSelection } from "./materials.js";
import { rounded, computePriceBreakdown } from "./calculator.js";
import { findSimilarProjects, learnedTimeFactor, learnedPriceSuggestion, saveLearningRecord } from "./learning.js";
import { appAlert, appForm, appConfirm } from "./dialogs.js";
import { renderMotifProfiles } from "./processing-profiles.js";
let motifImageDetail = null;
let editingEstimatorProjectId=null;
let estimatorCustomerPricing=null;
function motifComplexityLabel(key){return ({simple:"Einfach",medium:"Mittel",high:"Hoch",veryHigh:"Sehr hoch"})[key]||"Hoch"}
function motifComplexityFactor(key){return ({simple:.55,medium:.78,high:1,veryHigh:1.25})[key]||1}
function motifProcess(){return document.querySelector('input[name="mcProcess"]:checked')?.value||"cut"}
function motifMaterialSource(){return document.querySelector('input[name="mcMaterialSource"]:checked')?.value||"own"}
function signedEuro(value){const clean=Math.abs(value)<.005?0:value;return `${clean>0?"+":""}${euro(clean)}`}
function motifMaterialOptions(){
  const items=materialSelections("Laser","main");
  return `<option value="">Material auswählen</option>`+items.map(m=>`<option value="${esc(m.id)}">${m.favorite||m.baseMaterial?.favorite?"★ ":""}${esc(m.name)}${num(m.width)&&num(m.height)?` – ${num(m.width)}×${num(m.height)} ${esc(m.dimensionUnit||"cm")}`:""} – ${euro(m.unitPrice)}/${esc(m.unit||"Stück")}</option>`).join("");
}
function applyMotifMachineSpeeds(force=false){
  const machine=(state.machines||[]).find(m=>m.id===$('mcMachine')?.value);if(!machine)return;
  if($('mcCutSpeed')&&(force||!num($('mcCutSpeed').value)))$('mcCutSpeed').value=num(machine.cutSpeed)||'';
  if($('mcEngraveSpeed')&&(force||!num($('mcEngraveSpeed').value)))$('mcEngraveSpeed').value=num(machine.engraveSpeed)||'';
}
function updateMotifProcessUI(){
  const process=motifProcess(),materialSource=motifMaterialSource(),orderType=materialSource==="customer"?"customerObject":"own",doCut=process==='cut'||process==='both',doEngrave=process==='engrave'||process==='both';
  $('mcCutSpeedLabel')?.classList.toggle('hidden',!doCut);
  $('mcEngraveSpeedLabel')?.classList.toggle('hidden',!doEngrave);
  $('mcCutTimeRow')?.classList.toggle('hidden',!doCut);
  $('mcEngraveTimeRow')?.classList.toggle('hidden',!doEngrave);
}
function calculateMotifMaterialCost(width,height,layers){
  const selected=resolveMaterialSelection($('mcMaterial')?.value);if(!selected)return {cost:0,text:'–'};
  const unitPrice=num(selected.unitPrice),mw=num(selected.width),mh=num(selected.height),dimensionUnit=selected.dimensionUnit||'cm',purchaseUnit=String(selected.unit||'Stück').toLowerCase();
  if(width<=0||height<=0)return {cost:0,text:'Maße fehlen'};
  const neededArea=width*height*layers;

  // Material wurde bereits als Flächenpreis gespeichert.
  if(purchaseUnit==='cm²' || purchaseUnit==='cm2'){
    return {cost:neededArea*unitPrice,text:`${neededArea.toLocaleString('de-DE',{maximumFractionDigits:1})} cm² (${layers} Ebene${layers===1?'':'n'})`};
  }
  if(purchaseUnit==='m²' || purchaseUnit==='m2'){
    return {cost:(neededArea/10000)*unitPrice,text:`${neededArea.toLocaleString('de-DE',{maximumFractionDigits:1})} cm² = ${(neededArea/10000).toLocaleString('de-DE',{maximumFractionDigits:4})} m²`};
  }

  // Ganze Platte/Stück mit hinterlegten Plattenmaßen.
  let sheetWidth=mw,sheetHeight=mh;
  if(dimensionUnit==='mm'){sheetWidth/=10;sheetHeight/=10}
  if(dimensionUnit==='m'){sheetWidth*=100;sheetHeight*=100}
  if(sheetWidth>0&&sheetHeight>0){
    const sheetArea=sheetWidth*sheetHeight;
    const cost=sheetArea>0?neededArea/sheetArea*unitPrice:0;
    return {cost,text:`${neededArea.toLocaleString('de-DE',{maximumFractionDigits:1})} cm² von ${sheetArea.toLocaleString('de-DE',{maximumFractionDigits:1})} cm² je Platte`};
  }

  // Ohne Maße kann bei Stückware kein Flächenanteil berechnet werden.
  return {cost:0,text:`⚠ Plattenmaße fehlen – Material bearbeiten und Breite/Höhe hinterlegen`};
}
export function renderMotifEstimator(){
  if(!$('mcMachine'))return;
  const oldMachine=$('mcMachine').value,oldMaterial=$('mcMaterial')?.value;
  const machines=(state.machines||[]).filter(m=>m.type==='laser'&&m.active!==false);
  $('mcMachine').innerHTML=machines.map(m=>`<option value="${m.id}">${esc(m.name)}</option>`).join('');
  $('mcMachine').value=machines.some(m=>m.id===oldMachine)?oldMachine:(machines.find(m=>m.id===state.settings.defaultMachine)?.id||machines.find(m=>m.id==='atomstack-x70')?.id||machines[0]?.id||'');
  if($('mcMaterial')){$('mcMaterial').innerHTML=motifMaterialOptions();const desired=oldMaterial||state.settings.defaultMaterial;if([...$('mcMaterial').options].some(o=>o.value===desired))$('mcMaterial').value=desired;}
  if(!$('mcHourly').dataset.ready){$('mcHourly').value=state.settings.hourly;$('mcReserve').value=state.settings.reserve;$('mcProfit').value=state.settings.profit;$('mcHourly').dataset.ready='1';}
  applyMotifMachineSpeeds(false);updateMotifProcessUI();
  const info=$('mcCalibrationInfo');if(info)info.textContent=`Kalibrierung: ${num(state.motifEstimator?.samples)} Erfahrungswert(e), Korrekturfaktor ${num(state.motifEstimator?.calibrationFactor||1).toLocaleString('de-DE',{maximumFractionDigits:2})}.`;
  calculateMotifEstimator();renderMotifProfiles();
}
function analyzeMotifImage(file){
  if(!file)return;
  const reader=new FileReader();reader.onload=()=>{
    $('mcPreview').src=reader.result;$('mcPreview').classList.remove('hidden');$('mcPreviewPlaceholder').classList.add('hidden');
    const img=new Image();img.onload=()=>{
      const canvas=document.createElement('canvas'),size=160;canvas.width=size;canvas.height=size;
      const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0,size,size);
      const data=ctx.getImageData(0,0,size,size).data;let edges=0,total=0;
      const gray=(x,y)=>{const i=(y*size+x)*4;return data[i]*.299+data[i+1]*.587+data[i+2]*.114};
      for(let y=1;y<size-1;y+=2)for(let x=1;x<size-1;x+=2){const d=Math.abs(gray(x+1,y)-gray(x-1,y))+Math.abs(gray(x,y+1)-gray(x,y-1));if(d>70)edges++;total++;}
      const density=total?edges/total:0;
      motifImageDetail=density<.08?'simple':density<.15?'medium':density<.25?'high':'veryHigh';
      state.motifEstimator.lastDetected=motifImageDetail;
      $('mcImageAnalysis').textContent=`Bildanalyse: ${motifComplexityLabel(motifImageDetail)} (${Math.round(density*100)} % Kantendichte). Du kannst den Detailgrad jederzeit manuell ändern.`;
      calculateMotifEstimator();
    };img.src=reader.result;
  };reader.readAsDataURL(file);
}
export function calculateMotifEstimator(){
  if(!$('mcWidth'))return;
  const width=num($('mcWidth').value),height=num($('mcHeight').value),layers=Math.max(1,num($('mcLayers').value)||1);
  const materialSource=motifMaterialSource(),orderType=materialSource==="customer"?"customerObject":"own";
  const process=motifProcess(),doCut=process==='cut'||process==='both',doEngrave=process==='engrave'||process==='both';
  const cutSpeed=Math.max(1,num($('mcCutSpeed').value)),engraveSpeed=Math.max(1,num($('mcEngraveSpeed').value));
  let complexity=$('mcComplexity').value;if(complexity==='auto')complexity=motifImageDetail||state.motifEstimator?.lastDetected||'high';
  const area=width*height,cal=Math.max(.35,Math.min(3,num(state.motifEstimator?.calibrationFactor)||1));
  const theoreticalCut=35*Math.pow(area/1050,.75)*(layers/2)*(500/cutSpeed)*motifComplexityFactor(complexity);
  let cutMinutes=(doCut&&area>0)?theoreticalCut*cal:0;
  let engraveMinutes=(doEngrave&&area>0)?(area*.055*motifComplexityFactor(complexity)*cal*(5000/engraveSpeed)):0;
  let work=num($('mcBaseWork').value);
  if($('mcSand').checked)work+=8+area/180;
  if($('mcPaint').checked)work+=10+area/150;
  if($('mcGlue').checked&&layers>1)work+=8+(layers-1)*5+area/220;
  const machine=(state.machines||[]).find(m=>m.id===$('mcMachine').value);
  const materialSelection=resolveMaterialSelection($('mcMaterial')?.value);
  const similar=findSimilarProjects({materialId:materialSelection?.id||"",machineId:machine?.id||"",area,detail:complexity,process,orderType}).filter(r=>!editingEstimatorProjectId||r.projectId!==editingEstimatorProjectId);
  const learningFactor=learnedTimeFactor(similar,cutMinutes+engraveMinutes);
  cutMinutes*=learningFactor;engraveMinutes*=learningFactor;
  const machineCost=cutMinutes*num(machine?.cutRate||machine?.minuteRate||state.settings.laserSchnitt)+engraveMinutes*num(machine?.engraveRate||machine?.minuteRate||state.settings.laserGravur);
  const mat=calculateMotifMaterialCost(width,height,layers),material=materialSource==="customer"?0:mat.cost;$('mcMaterialCost').value=material?material.toFixed(2):'';
  const extra=num($('mcExtraCost').value),workCost=work/60*num($('mcHourly').value);
  const direct=material+extra+machineCost+workCost,overhead=direct*num(state.settings.overhead)/100,base=direct+overhead,reserve=base*num($('mcReserve').value)/100,cost=base+reserve;
  const calculatedSale=cost*(1+num($('mcProfit').value)/100);
  const customerSettings=state.settings.customerObject||{};
  const customerPricing=orderType==="customerObject"?{
    baseFee:num(estimatorCustomerPricing?.baseFee??customerSettings.baseFee),
    minimumPrice:num(estimatorCustomerPricing?.minimumPrice??customerSettings.minimumPrice),
    difficultyKey:estimatorCustomerPricing?.difficultyKey||"normal",
    difficultyPercent:num(estimatorCustomerPricing?.difficultyPercent??customerSettings.difficulties?.[estimatorCustomerPricing?.difficultyKey||"normal"]),
    risk:num(estimatorCustomerPricing?.risk),
    express:num(estimatorCustomerPricing?.express??customerSettings.expressFee)
  }:null;
  const customerBreakdown=customerPricing?computePriceBreakdown({
    orderType,machine:machineCost,work:workCost,
    baseFee:customerPricing.baseFee,minimumPrice:customerPricing.minimumPrice,
    difficultyPercent:customerPricing.difficultyPercent,risk:customerPricing.risk,express:customerPricing.express
  }):null;
  const finalCost=customerBreakdown?.cost??cost;
  const sale=customerBreakdown?.sale??rounded(Math.max(cost,learnedPriceSuggestion(similar,area,calculatedSale)));
  const profit=sale-finalCost,margin=sale>0?profit/sale*100:0;
  const calculatedPrice=customerBreakdown?.calculated??sale;
  const roundingDifference=sale-calculatedPrice;
  const minimal=rounded(Math.max(finalCost,sale*.9)),premium=rounded(sale*1.2);
  $('mcDetected').textContent=motifComplexityLabel(complexity);$('mcMaterialUsage').textContent=mat.text;$('mcMaterialCostResult').textContent=euro(material);
  if($("mcMaterialSourceHint"))$("mcMaterialSourceHint").textContent=materialSource==="customer"?"Kundenmaterial – keine Materialkosten berechnet":"";
  $('mcCutTime').textContent=`${Math.round(cutMinutes)} Min.`;$('mcEngraveTime').textContent=`${Math.round(engraveMinutes)} Min.`;$('mcWorkTime').textContent=`${Math.round(work)} Min.`;
  $('mcMachineCost').textContent=euro(machineCost);$('mcWorkCostResult').textContent=euro(workCost);$('mcBaseFeeResult').textContent=euro(customerBreakdown?.baseFee||0);
  $('mcDifficultyResult').textContent=euro(customerBreakdown?.difficulty||0);$('mcRiskResult').textContent=euro(customerBreakdown?.risk||0);$('mcExpressResult').textContent=euro(customerBreakdown?.express||0);
  $('mcTotalCost').textContent=euro(finalCost);$('mcSalePrice').textContent=euro(sale);
  $('mcProfitEuro').textContent=euro(profit);$('mcProfitPercent').textContent=`${margin.toLocaleString('de-DE',{maximumFractionDigits:1})} %`;
  const customerObject=orderType==="customerObject";
  ["mcCostHeading","mcPricePartsHeading","mcCalculatedHeading","mcRoundingHeading","mcSaleHeading","mcActualProfitHeading","mcCalculatedRow","mcRoundingRow","mcOtherActualCostsRow"].forEach(id=>$(id)?.classList.toggle("hidden",!customerObject));
  ["mcBaseFeeRow","mcDifficultyRow","mcRiskRow","mcExpressRow","mcFurtherSurchargesRow"].forEach(id=>$(id)?.classList.toggle("hidden",!customerObject));
  $("mcCalculatedPrice").textContent=euro(calculatedPrice);$("mcRoundingDifference").textContent=signedEuro(roundingDifference);$("mcOtherActualCosts").textContent=euro(0);
  $("mcProfitLabel").textContent=customerObject?"Tatsächlicher Gewinn":"Gewinn";$("mcMarginLabel").textContent=customerObject?"Gewinnmarge vom Verkaufspreis":"Gewinnmarge";$("mcProfitExplanation").textContent=customerObject?`${euro(sale)} − ${euro(finalCost)}`:"";
  $('mcPriceMin').textContent=euro(minimal);$('mcPriceOptimal').textContent=euro(sale);$('mcPricePremium').textContent=euro(premium);
  $('mcLearningHint').textContent=similar.length?`Es wurden ${similar.length} ähnliche Projekte gefunden. Die Zeitberechnung wurde mit diesen Erfahrungswerten verbessert.`:'Noch keine ähnlichen Referenzprojekte vorhanden.';
  $('motifCalc').dataset.predictedMachineMinutes=String(cutMinutes+engraveMinutes);
  const snapshot={orderType,materialSource,materialId:materialSelection?.id||"",materialName:materialSelection?.name||"",machineId:machine?.id||"",machineName:machine?.name||"",width,height,area,layers,detail:complexity,process,estimatedCutTime:cutMinutes,estimatedEngravingTime:engraveMinutes,cutMinutes,engraveMinutes,cost:finalCost,estimatedPrice:sale,sale,profit,minimal,optimal:sale,premium,workMinutes:work,materialCost:material,machineCost,workCost,additionalCosts:extra,customerPricing,pricingBreakdown:customerBreakdown,inputs:{mcWidth:$("mcWidth").value,mcHeight:$("mcHeight").value,mcLayers:$("mcLayers").value,mcCutSpeed:$("mcCutSpeed").value,mcEngraveSpeed:$("mcEngraveSpeed").value,mcComplexity:$("mcComplexity").value,mcExtraCost:$("mcExtraCost").value,mcBaseWork:$("mcBaseWork").value,mcHourly:$("mcHourly").value,mcReserve:$("mcReserve").value,mcProfit:$("mcProfit").value,mcSand:$("mcSand").checked,mcPaint:$("mcPaint").checked,mcGlue:$("mcGlue").checked},calibrationFactor:cal,learningFactor};
  $('motifCalc').dataset.snapshot=JSON.stringify(snapshot);
  return snapshot;
}
export async function resetMotifEstimator(confirmFirst=true){
  if(confirmFirst&&!await appConfirm("Neue Kalkulation starten?\nAlle nicht gespeicherten Eingaben werden gelöscht.","Neue Kalkulation","Neue Kalkulation"))return false;
  editingEstimatorProjectId=null;
  estimatorCustomerPricing=null;
  ["mcWidth","mcHeight","mcLayers","mcCutSpeed","mcEngraveSpeed","mcExtraCost","mcBaseWork","mcActualSalePrice","mcActualTime","mcActualCutTime","mcActualEngravingTime"].forEach(id=>{if($(id))$(id).value=""});
  ["mcSand","mcPaint","mcGlue"].forEach(id=>{if($(id))$(id).checked=false});
  if($("mcMaterial"))$("mcMaterial").value="";
  if($("mcComplexity"))$("mcComplexity").value="auto";
  const ownMaterial=document.querySelector('input[name="mcMaterialSource"][value="own"]');if(ownMaterial)ownMaterial.checked=true;
  const cut=document.querySelector('input[name="mcProcess"][value="cut"]');if(cut)cut.checked=true;
  motifImageDetail=null;$("mcPreview")?.removeAttribute("src");$("mcPreview")?.classList.add("hidden");$("mcPreviewPlaceholder")?.classList.remove("hidden");
  if($("mcHourly"))$("mcHourly").value=state.settings.hourly;
  if($("mcReserve"))$("mcReserve").value=state.settings.reserve;
  if($("mcProfit"))$("mcProfit").value=state.settings.profit;
  applyMotifMachineSpeeds(true);updateMotifProcessUI();calculateMotifEstimator();return true;
}
['mcWidth','mcHeight','mcLayers','mcCutSpeed','mcEngraveSpeed','mcComplexity','mcSand','mcPaint','mcGlue','mcMaterial','mcExtraCost','mcBaseWork','mcHourly','mcReserve','mcProfit'].forEach(id=>{const el=$(id);if(el){el.addEventListener('input',calculateMotifEstimator);el.addEventListener('change',calculateMotifEstimator)}});
document.querySelectorAll('input[name="mcProcess"]').forEach(el=>el.addEventListener('change',()=>{updateMotifProcessUI();calculateMotifEstimator()}));
document.querySelectorAll('input[name="mcProcess"]').forEach(el=>el.addEventListener('change',renderMotifProfiles));
document.querySelectorAll('input[name="mcMaterialSource"]').forEach(el=>el.addEventListener('change',calculateMotifEstimator));
if($('mcMaterial'))$('mcMaterial').addEventListener('change',renderMotifProfiles);
if($('mcMachine'))$('mcMachine').addEventListener('change',()=>{applyMotifMachineSpeeds(true);calculateMotifEstimator();renderMotifProfiles()});
["mcProfileSource","mcProfileProcessType"].forEach(id=>$(id)?.addEventListener("change",renderMotifProfiles));
['mcImageGallery','mcImageCamera'].forEach(id=>{const el=$(id);if(el)el.onchange=e=>analyzeMotifImage(e.target.files?.[0])});
if($('mcRemoveImage'))$('mcRemoveImage').onclick=()=>{motifImageDetail=null;$('mcPreview').removeAttribute('src');$('mcPreview').classList.add('hidden');$('mcPreviewPlaceholder').classList.remove('hidden');$('mcImageAnalysis').textContent='Das Bild hilft bei der automatischen Detail-Einschätzung. Die Berechnung bleibt eine grobe Vorab-Schätzung.';calculateMotifEstimator()};
if($('mcSaveCalibration'))$('mcSaveCalibration').onclick=async()=>{
  const actual=num($('mcActualTime').value),pred=num($('motifCalc').dataset.predictedMachineMinutes);if(actual<=0||pred<=0){await appAlert('Bitte Maße und tatsächliche Zeit eingeben.');return}
  const ratio=Math.max(.35,Math.min(3,actual/pred)),samples=num(state.motifEstimator?.samples),old=num(state.motifEstimator?.calibrationFactor)||1;
  state.motifEstimator={...state.motifEstimator,calibrationFactor:(old*samples+ratio)/(samples+1),samples:samples+1};
  const snapshot=calculateMotifEstimator();saveLearningRecord({...snapshot,actualTotalTime:actual,actualCutTime:num($('mcActualCutTime')?.value)||null,actualEngravingTime:num($('mcActualEngravingTime')?.value)||null,actualPrice:num($('mcActualSalePrice')?.value)||null,reference:true});
  $('mcActualTime').value='';renderMotifEstimator();await appAlert('Erfahrungswert und Referenzprojekt gespeichert. Die nächsten Schätzungen wurden angepasst.');
};
if($('mcTransferToCalculator'))$('mcTransferToCalculator').onclick=()=>{
  const snapshot=calculateMotifEstimator();
  document.dispatchEvent(new CustomEvent('dla:estimator-transfer',{detail:snapshot}));
};
if($('mcSaveReference'))$('mcSaveReference').onclick=async()=>{
  const data=calculateMotifEstimator();
  if(!data.materialId||!data.machineId||data.area<=0){await appAlert('Bitte zuerst Material, Maschine, Breite und Höhe auswählen.');return;}
  const result=await appForm({title:"Referenzprojekt speichern",message:"Leer lassen, wenn noch nicht bekannt.",fields:[
    {name:"title",label:"Projektname",value:"Schätzung "+new Date().toLocaleDateString("de-DE")},
    {name:"actualPrice",label:"Tatsächlicher Verkaufspreis (€)",inputmode:"decimal",value:$("mcActualSalePrice")?.value||""},
    {name:"actualTotalTime",label:"Tatsächliche Gesamtzeit (Min.)",inputmode:"decimal",value:$("mcActualTime")?.value||""},
    {name:"actualCutTime",label:"Tatsächliche Schnittzeit (Min.)",inputmode:"decimal",value:$("mcActualCutTime")?.value||""},
    {name:"actualEngravingTime",label:"Tatsächliche Gravurzeit (Min.)",inputmode:"decimal",value:$("mcActualEngravingTime")?.value||""},
    {name:"notes",label:"Notiz",type:"textarea",value:""},
    {name:"reference",label:"Für Lernsystem verwenden",type:"select",value:"yes",options:[{value:"yes",label:"Ja"},{value:"no",label:"Nein"}]}
  ],cancelText:"Abbrechen",acceptText:"Referenz speichern",validate:(v,parse)=>{
    if(!v.title.trim())return"Bitte einen Projektnamen eingeben.";
    for(const key of ["actualPrice","actualTotalTime","actualCutTime","actualEngravingTime"]){const n=parse(v[key]);if(Number.isNaN(n))return"Bitte nur gültige Zahlen eingeben. Komma und Punkt sind erlaubt.";if(n!=null&&n<0)return"Preise und Zeiten dürfen nicht negativ sein."}
    return "";
  }});
  if(!result)return;const val=k=>result[k].trim()===""?null:num(result[k]);
  saveLearningRecord({...data,title:result.title.trim(),actualPrice:val("actualPrice"),actualTotalTime:val("actualTotalTime"),actualCutTime:val("actualCutTime"),actualEngravingTime:val("actualEngravingTime"),notes:result.notes,image:$("mcPreview")?.src||"",reference:result.reference==="yes"});
  if(await appConfirm("Gespeichert.\nMöchtest du eine neue Kalkulation starten?","Gespeichert","Ja"))resetMotifEstimator(false);
};
if($('mcSaveProject'))$('mcSaveProject').onclick=async()=>{
  const data=calculateMotifEstimator();
  if(!data.materialId||!data.machineId||data.area<=0){await appAlert('Bitte zuerst Material, Maschine, Breite und Höhe auswählen.');return;}
  const actualPrice=num($('mcActualSalePrice')?.value);
  if(actualPrice<=0){await appAlert('Bitte den tatsächlich vereinbarten Verkaufspreis eintragen. Die Schätzung wird nicht automatisch als Verkaufspreis übernommen.');$('mcActualSalePrice')?.focus();return;}
  const currentProject=editingEstimatorProjectId?state.projects.find(p=>p.id===editingEstimatorProjectId):null;
  const entry=await appForm({title:currentProject?"Kalkulation aktualisieren":"Als Kundenprojekt übernehmen",fields:[{name:"title",label:"Projektname",value:currentProject?.title||"Angebot "+new Date().toLocaleDateString("de-DE")},{name:"actualPrice",label:"Tatsächlich vereinbarter Verkaufspreis (€)",value:$("mcActualSalePrice").value,inputmode:"decimal"}],cancelText:"Abbrechen",acceptText:currentProject?"Projekt aktualisieren":"Projekt übernehmen",validate:(v,parse)=>!v.title.trim()?"Bitte einen Projektnamen eingeben.":parse(v.actualPrice)<=0?"Bitte einen tatsächlichen Verkaufspreis größer als 0 eingeben.":""});
  if(!entry)return;const title=entry.title,confirmedPrice=num(entry.actualPrice);
  const existing=editingEstimatorProjectId?state.projects.find(p=>p.id===editingEstimatorProjectId):null;
  const id=existing?.id||uid(),now=new Date().toISOString();
  const calculationSnapshot={version:1,calculatorType:"estimator",sourceModule:"estimator",module:"laser",orderType:data.orderType,materialSource:data.materialSource,machineId:data.machineId,materialId:data.materialId,estimatorInputs:structuredClone(data.inputs),pricingSettings:structuredClone(data.customerPricing),pricingBreakdown:structuredClone(data.pricingBreakdown),results:{materialCosts:data.materialCost,machineCosts:data.machineCost,workCosts:data.workCost,additionalCosts:data.additionalCosts,calculatedSelfCosts:data.cost,calculatedPrice:data.estimatedPrice,minimalPrice:data.minimal,optimalPrice:data.optimal,premiumPrice:data.premium,profit:data.profit},createdAt:existing?.calculationSnapshot?.createdAt||now,updatedAt:now};
  const project={...existing,id,recordType:'project',isReference:false,calculationSource:"estimator",calculationSnapshot,orderType:data.orderType||"own",customerObjectProcess:data.orderType==="customerObject"?data.process:null,title:title.trim(),customer:existing?.customer||'',customerAddress:existing?.customerAddress||'',type:data.orderType==="customerObject"?'Kundenobjekt bearbeiten':'Laser',module:'laser',machineId:data.machineId,machineName:data.machineName,notes:existing?.notes||'Aus Angebotsassistent als Kundenprojekt übernommen',status:existing?.status||'offer',tags:existing?.tags||['Angebot','Schätzer'],images:existing?.images||($('mcPreview')?.src?[ $('mcPreview').src ]:[]),priceHistory:[{date:now,sale:confirmedPrice,cost:data.cost},...(existing?.priceHistory||[])],workSeconds:Math.round(num(data.workMinutes)*60),estimatedPrice:data.estimatedPrice,actualPrice:confirmedPrice,estimatedTotalTime:data.estimatedCutTime+data.estimatedEngravingTime,actualTotalTime:num($('mcActualTime')?.value)||existing?.actualTotalTime||null,estimatedCutTime:data.estimatedCutTime,actualCutTime:num($('mcActualCutTime')?.value)||existing?.actualCutTime||null,estimatedEngravingTime:data.estimatedEngravingTime,actualEngravingTime:num($('mcActualEngravingTime')?.value)||existing?.actualEngravingTime||null,materialCost:data.materialCost,sale:confirmedPrice,cost:data.cost,qty:1,reference:false,estimatorData:{...data,actualPrice:confirmedPrice},created:existing?.created||now,updated:now};
  if(existing)state.projects[state.projects.findIndex(p=>p.id===id)]=project;else state.projects.unshift(project);state.lastPrice=confirmedPrice;
  const existingLearning=(state.learningRecords||[]).find(r=>r.projectId===id);
  saveLearningRecord({...data,id:existingLearning?.id,projectId:id,title:title.trim(),actualPrice:confirmedPrice,actualTotalTime:num($('mcActualTime')?.value)||null,actualCutTime:num($('mcActualCutTime')?.value)||null,actualEngravingTime:num($('mcActualEngravingTime')?.value)||null,reference:true});save();
  if(await appConfirm('Gespeichert.\nMöchtest du eine neue Kalkulation starten?',"Projekt gespeichert","Ja"))resetMotifEstimator(false);
};
export function loadProjectIntoMotifEstimator(project){
  const snapshot=project.calculationSnapshot?.sourceModule==="estimator"?project.calculationSnapshot:null;
  const data=snapshot?{...(project.estimatorData||{}),...(snapshot||{})}:project.estimatorData;
  if(!data)return false;
  editingEstimatorProjectId=project.id;
  estimatorCustomerPricing=snapshot?.pricingSettings||data.customerPricing||null;
  renderMotifEstimator();
  const inputs=snapshot?.estimatorInputs||data.inputs||{};
  const setValue=(id,value)=>{if($(id)&&value!==undefined&&value!==null)$(id).value=value};
  setValue("mcMachine",snapshot?.machineId||data.machineId);
  renderMotifEstimator();
  setValue("mcMaterial",snapshot?.materialId||data.materialId);
  setValue("mcWidth",inputs.mcWidth??data.width);setValue("mcHeight",inputs.mcHeight??data.height);setValue("mcLayers",inputs.mcLayers??data.layers);
  setValue("mcCutSpeed",inputs.mcCutSpeed);setValue("mcEngraveSpeed",inputs.mcEngraveSpeed);setValue("mcComplexity",inputs.mcComplexity??data.detail);
  setValue("mcExtraCost",inputs.mcExtraCost??data.additionalCosts);setValue("mcBaseWork",inputs.mcBaseWork);
  setValue("mcHourly",inputs.mcHourly);setValue("mcReserve",inputs.mcReserve);setValue("mcProfit",inputs.mcProfit);
  ["mcSand","mcPaint","mcGlue"].forEach(id=>{if($(id)&&inputs[id]!==undefined)$(id).checked=Boolean(inputs[id])});
  const source=document.querySelector(`input[name="mcMaterialSource"][value="${snapshot?.materialSource||data.materialSource||((project.orderType==="customerObject")?"customer":"own")}"]`);if(source)source.checked=true;
  const process=document.querySelector(`input[name="mcProcess"][value="${data.process||project.customerObjectProcess||"cut"}"]`);if(process)process.checked=true;
  setValue("mcActualSalePrice",project.actualPrice??project.sale);setValue("mcActualTime",project.actualTotalTime);setValue("mcActualCutTime",project.actualCutTime);setValue("mcActualEngravingTime",project.actualEngravingTime);
  updateMotifProcessUI();calculateMotifEstimator();renderMotifProfiles();
  document.dispatchEvent(new CustomEvent("dla:open-estimator-editor"));
  return true;
}
