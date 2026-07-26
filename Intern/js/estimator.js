import { $, num, euro, esc, uid } from "./utils.js";
import { state, save } from "./storage.js";
import { materialSelections, resolveMaterialSelection } from "./materials.js";
import { rounded } from "./calculator.js";
import { findSimilarProjects, learnedTimeFactor, saveLearningRecord } from "./learning.js";
let motifImageDetail = null;
function motifComplexityLabel(key){return ({simple:"Einfach",medium:"Mittel",high:"Hoch",veryHigh:"Sehr hoch"})[key]||"Hoch"}
function motifComplexityFactor(key){return ({simple:.55,medium:.78,high:1,veryHigh:1.25})[key]||1}
function motifProcess(){return document.querySelector('input[name="mcProcess"]:checked')?.value||"cut"}
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
  const process=motifProcess(),doCut=process==='cut'||process==='both',doEngrave=process==='engrave'||process==='both';
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
  calculateMotifEstimator();
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
  const similar=findSimilarProjects({materialId:materialSelection?.id||"",machineId:machine?.id||"",area,detail:complexity,process});
  const learningFactor=learnedTimeFactor(similar,cutMinutes+engraveMinutes);
  cutMinutes*=learningFactor;engraveMinutes*=learningFactor;
  const machineCost=cutMinutes*num(machine?.cutRate||machine?.minuteRate||state.settings.laserSchnitt)+engraveMinutes*num(machine?.engraveRate||machine?.minuteRate||state.settings.laserGravur);
  const mat=calculateMotifMaterialCost(width,height,layers);$('mcMaterialCost').value=mat.cost?mat.cost.toFixed(2):'';
  const material=mat.cost,extra=num($('mcExtraCost').value),workCost=work/60*num($('mcHourly').value);
  const direct=material+extra+machineCost+workCost,overhead=direct*num(state.settings.overhead)/100,base=direct+overhead,reserve=base*num($('mcReserve').value)/100,cost=base+reserve;
  const sale=rounded(cost*(1+num($('mcProfit').value)/100));
  const profit=sale-cost,margin=sale>0?profit/sale*100:0;
  const minimal=rounded(Math.max(cost,sale*.9)),premium=rounded(sale*1.2);
  $('mcDetected').textContent=motifComplexityLabel(complexity);$('mcMaterialUsage').textContent=mat.text;
  $('mcCutTime').textContent=`${Math.round(cutMinutes)} Min.`;$('mcEngraveTime').textContent=`${Math.round(engraveMinutes)} Min.`;$('mcWorkTime').textContent=`${Math.round(work)} Min.`;
  $('mcMachineCost').textContent=euro(machineCost);$('mcTotalCost').textContent=euro(cost);$('mcSalePrice').textContent=euro(sale);
  $('mcProfitEuro').textContent=euro(profit);$('mcProfitPercent').textContent=`${margin.toLocaleString('de-DE',{maximumFractionDigits:1})} %`;
  $('mcPriceMin').textContent=euro(minimal);$('mcPriceOptimal').textContent=euro(sale);$('mcPricePremium').textContent=euro(premium);
  $('mcLearningHint').textContent=similar.length?`Es wurden ${similar.length} ähnliche Projekte gefunden. Die Zeitberechnung wurde mit diesen Erfahrungswerten verbessert.`:'Noch keine ähnlichen Referenzprojekte vorhanden.';
  $('motifCalc').dataset.predictedMachineMinutes=String(cutMinutes+engraveMinutes);
  const snapshot={materialId:materialSelection?.id||"",materialName:materialSelection?.name||"",machineId:machine?.id||"",machineName:machine?.name||"",width,height,area,layers,detail:complexity,process,cutMinutes,engraveMinutes,cost,sale,profit,minimal,premium,workMinutes:work,materialCost:material,machineCost};
  $('motifCalc').dataset.snapshot=JSON.stringify(snapshot);
  return snapshot;
}
['mcWidth','mcHeight','mcLayers','mcCutSpeed','mcEngraveSpeed','mcComplexity','mcSand','mcPaint','mcGlue','mcMaterial','mcExtraCost','mcBaseWork','mcHourly','mcReserve','mcProfit'].forEach(id=>{const el=$(id);if(el){el.addEventListener('input',calculateMotifEstimator);el.addEventListener('change',calculateMotifEstimator)}});
document.querySelectorAll('input[name="mcProcess"]').forEach(el=>el.addEventListener('change',()=>{updateMotifProcessUI();calculateMotifEstimator()}));
if($('mcMachine'))$('mcMachine').addEventListener('change',()=>{applyMotifMachineSpeeds(true);calculateMotifEstimator()});
['mcImageGallery','mcImageCamera'].forEach(id=>{const el=$(id);if(el)el.onchange=e=>analyzeMotifImage(e.target.files?.[0])});
if($('mcRemoveImage'))$('mcRemoveImage').onclick=()=>{motifImageDetail=null;$('mcPreview').removeAttribute('src');$('mcPreview').classList.add('hidden');$('mcPreviewPlaceholder').classList.remove('hidden');$('mcImageAnalysis').textContent='Das Bild hilft bei der automatischen Detail-Einschätzung. Die Berechnung bleibt eine grobe Vorab-Schätzung.';calculateMotifEstimator()};
if($('mcSaveCalibration'))$('mcSaveCalibration').onclick=()=>{
  const actual=num($('mcActualTime').value),pred=num($('motifCalc').dataset.predictedMachineMinutes);if(actual<=0||pred<=0){alert('Bitte Maße und tatsächliche Zeit eingeben.');return}
  const ratio=Math.max(.35,Math.min(3,actual/pred)),samples=num(state.motifEstimator?.samples),old=num(state.motifEstimator?.calibrationFactor)||1;
  state.motifEstimator={...state.motifEstimator,calibrationFactor:(old*samples+ratio)/(samples+1),samples:samples+1};
  const snapshot=calculateMotifEstimator();saveLearningRecord({...snapshot,actualMinutes:actual,reference:true});
  $('mcActualTime').value='';renderMotifEstimator();alert('Erfahrungswert und Referenzprojekt gespeichert. Die nächsten Schätzungen wurden angepasst.');
};
if($('mcTransferToCalculator'))$('mcTransferToCalculator').onclick=()=>{
  const snapshot=calculateMotifEstimator();
  document.dispatchEvent(new CustomEvent('dla:estimator-transfer',{detail:snapshot}));
};
if($('mcSaveProject'))$('mcSaveProject').onclick=()=>{
  const data=calculateMotifEstimator();
  if(!data.materialId||!data.machineId||data.area<=0){alert('Bitte zuerst Material, Maschine, Breite und Höhe auswählen.');return;}
  const title=prompt('Projektname für die Angebotsschätzung:','Angebot '+new Date().toLocaleDateString('de-DE'));
  if(!title)return;
  const id=uid(),now=new Date().toISOString();
  const project={id,title:title.trim(),customer:'',customerAddress:'',type:'Laser',module:'laser',machineId:data.machineId,machineName:data.machineName,notes:'Aus Angebotsassistent erstellt',status:'offer',tags:['Angebot','Schätzer'],images:$('mcPreview')?.src?[ $('mcPreview').src ]:[],priceHistory:[{date:now,sale:data.sale,cost:data.cost}],workSeconds:Math.round(num(data.workMinutes)*60),sale:data.sale,cost:data.cost,qty:1,reference:true,estimatorData:data,created:now,updated:now};
  state.projects.unshift(project);state.lastPrice=data.sale;saveLearningRecord({...data,projectId:id,reference:true});save();
  alert('Angebot als Projekt und Referenz gespeichert.');
};
