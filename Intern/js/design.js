import { $, num, euro, uid } from "./utils.js?v=6.4.5";
import { state, save, defaults, getRealProjects } from "./storage.js?v=6.4.5";
import { appAlert, appConfirm } from "./dialogs.js?v=6.4.5";
let editingDesignId=null;

function getDesignDefaults(){
  const settings=state.settings?.design||{};
  return {
    hourlyRate:settings.hourlyRate??defaults.settings.design.hourlyRate,
    minimumFee:settings.minimumFee??defaults.settings.design.minimumFee
  };
}

export function applyDesignDefaults({force=false}={}){
  const settings=getDesignDefaults();
  const hourlyInput=$("designHourlyRate");
  const minimumInput=$("designMinimumFee");
  if(hourlyInput&&(force||hourlyInput.value===""))hourlyInput.value=settings.hourlyRate;
  if(minimumInput&&(force||minimumInput.value===""))minimumInput.value=settings.minimumFee;
  calculateDesign();
}

export function computeDesignPrice({hours=0,minutes=0,hourlyRate=0,minimumFee=0,extraCosts=0}={}){
  const totalMinutes=Math.max(0,num(hours))*60+Math.max(0,num(minutes));
  const workCost=totalMinutes/60*Math.max(0,num(hourlyRate));
  const extra=Math.max(0,num(extraCosts));
  const calculated=workCost+extra;
  const minimum=Math.max(0,num(minimumFee));
  return {totalMinutes,workCost,extra,calculated,minimum,minimumApplied:calculated<minimum,total:Math.max(calculated,minimum)};
}

export function calculateDesign(){
  if(!$("designForm"))return computeDesignPrice();
  const result=computeDesignPrice({
    hours:$("designHours").value,minutes:$("designMinutes").value,
    hourlyRate:$("designHourlyRate").value,minimumFee:$("designMinimumFee").value,
    extraCosts:$("designExtraCosts").value
  });
  $("designTimeResult").textContent=result.totalMinutes<60?`${result.totalMinutes} Min.`:`${Math.floor(result.totalMinutes/60)} Std. ${result.totalMinutes%60} Min.`;
  $("designWorkCost").textContent=euro(result.workCost);
  $("designExtraResult").textContent=euro(result.extra);
  $("designMinimumRow").classList.toggle("hidden",!result.minimumApplied);
  $("designMinimumResult").textContent=euro(result.minimum);
  $("designTotalPrice").textContent=euro(result.total);
  return result;
}

export function resetDesign(confirmFirst=false){
  const reset=async()=>{
    $("designForm")?.reset();
    editingDesignId=null;
    applyDesignDefaults({force:true});
  };
  if(!confirmFirst)return reset();
  return appConfirm("Neue Kalkulation starten?\nAlle nicht gespeicherten Eingaben werden gelöscht.","Neue Kalkulation","Neue Kalkulation").then(ok=>ok?reset():false);
}

export function renderDesignStatistics(){
  const box=$("designStatistics");if(!box)return;
  const rows=getRealProjects().filter(p=>p.orderType==="design"||p.projectType==="design");
  const revenue=rows.reduce((sum,p)=>sum+num(p.actualPrice??p.sale),0);
  const minutes=rows.reduce((sum,p)=>sum+num(p.designMinutes??p.actualTotalTime),0);
  const average=rows.length?revenue/rows.length:0;
  const averageHourly=minutes>0?revenue/(minutes/60):0;
  box.innerHTML=`<div class="card stat"><span>Anzahl Designaufträge</span><strong>${rows.length}</strong></div><div class="card stat"><span>Gesamtumsatz</span><strong>${euro(revenue)}</strong></div><div class="card stat"><span>Ø Auftragswert</span><strong>${euro(average)}</strong></div><div class="card stat"><span>Gesamtarbeitszeit</span><strong>${minutes<60?`${minutes} Min.`:`${Math.floor(minutes/60)} Std. ${minutes%60} Min.`}</strong></div><div class="card stat"><span>Ø Stundenlohn</span><strong>${euro(averageHourly)}</strong></div>`;
}

["designHours","designMinutes","designHourlyRate","designMinimumFee","designExtraCosts"].forEach(id=>$(id)?.addEventListener("input",calculateDesign));
$("resetDesignBtn")?.addEventListener("click",()=>resetDesign(true));
$("designForm")?.addEventListener("submit",async event=>{
  event.preventDefault();
  const title=$("designProjectName").value.trim();
  const result=calculateDesign();
  if(!title){await appAlert("Bitte einen Projektnamen eingeben.");$("designProjectName").focus();return;}
  if(result.totalMinutes<=0){await appAlert("Bitte eine Arbeitszeit eingeben.");$("designHours").focus();return;}
  const now=new Date().toISOString();
  const existing=editingDesignId?state.projects.find(p=>p.id===editingDesignId):null;
  const agreementFields=existing?{agreementPrice:existing.agreementPrice,priceAgreementDate:existing.priceAgreementDate,isPreferredRepeatPrice:existing.isPreferredRepeatPrice,priceType:existing.priceType,agreementPriceNote:existing.agreementPriceNote,agreementPriceCreatedAt:existing.agreementPriceCreatedAt}:{agreementPrice:result.total,priceAgreementDate:now,isPreferredRepeatPrice:false,priceType:"normal",agreementPriceNote:"",agreementPriceCreatedAt:now};
  const project={
    ...agreementFields,
    id:existing?.id||uid(),recordType:"project",isReference:false,reference:false,
    orderType:"design",projectType:"design",module:"design",type:$("designServiceType").value,
    title,customerId:$("designCustomerId")?.value||null,customer:"",status:"offer",
    designServiceType:$("designServiceType").value,designMinutes:result.totalMinutes,
    designHourlyRate:num($("designHourlyRate").value),designMinimumFee:num($("designMinimumFee").value),
    designExtraCosts:result.extra,notes:$("designNotes").value.trim(),
    materialCost:0,machineId:"",machineName:"",estimatedTotalTime:result.totalMinutes,
    actualTotalTime:result.totalMinutes,estimatedPrice:result.total,actualPrice:result.total,
    sale:result.total,cost:result.workCost+result.extra,workSeconds:result.totalMinutes*60,
    priceHistory:[{date:now,sale:result.total,cost:result.workCost+result.extra}],
    fields:{designServiceType:$("designServiceType").value,designHours:$("designHours").value,designMinutes:$("designMinutes").value,designHourlyRate:$("designHourlyRate").value,designMinimumFee:$("designMinimumFee").value,designExtraCosts:$("designExtraCosts").value},
    created:existing?.created||now,updated:now
  };
  if(existing)state.projects[state.projects.indexOf(existing)]=project;else state.projects.unshift(project);
  state.lastPrice=result.total;save();renderDesignStatistics();
  if(await appConfirm("Gespeichert.\nMöchtest du eine neue Kalkulation starten?","Designauftrag gespeichert","Ja"))resetDesign(false);
});

document.addEventListener("dla:load-design",event=>{
  const source=event.detail?.project;if(!source)return;
  editingDesignId=event.detail?.duplicate?null:source.id;
  document.querySelector('[data-screen="design"]')?.click();
  $("designProjectName").value=event.detail?.duplicate?`${source.title||"Designauftrag"} – Kopie`:source.title||"";
  $("designCustomer").value=source.customer||"";
  if($("designCustomerId"))$("designCustomerId").value=source.customerId||"";
  $("designServiceType").value=source.designServiceType||source.type||"Sonstiges";
  const total=num(source.designMinutes??source.actualTotalTime);
  $("designHours").value=Math.floor(total/60)||"";
  $("designMinutes").value=total%60||"";
  const settings=getDesignDefaults();
  $("designHourlyRate").value=source.designHourlyRate??source.fields?.designHourlyRate??settings.hourlyRate;
  $("designMinimumFee").value=source.designMinimumFee??source.fields?.designMinimumFee??settings.minimumFee;
  $("designExtraCosts").value=num(source.designExtraCosts??source.fields?.designExtraCosts);
  $("designNotes").value=source.notes||"";
  calculateDesign();
});
