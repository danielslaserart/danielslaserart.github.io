import { $, euro, esc, inferMaterialCategory, num } from "./utils.js?v=6.6.14";
import { state, getRealProjects } from "./storage.js?v=6.6.14";
import { getPriceLadderData } from "./price-ladder.js?v=6.6.14";

export const FEATURE_FLAGS=Object.freeze({
  legacyStatisticsVisible:false,
  workshopAnalysisVisible:true
});

const LEGACY_KEY="dla_legacy_statistics_visible";
const cents=value=>Math.round(num(value)*100);
const finite=value=>value!==null&&value!==undefined&&value!==""&&Number.isFinite(Number(value));
const average=values=>values.length?values.reduce((sum,value)=>sum+value,0)/values.length:null;
const percent=(part,total)=>total?part/total*100:0;
const percentText=value=>`${num(value).toLocaleString("de-DE",{minimumFractionDigits:1,maximumFractionDigits:1})} %`;
const minutesText=value=>value==null?"–":`${num(value).toLocaleString("de-DE",{maximumFractionDigits:1})} Min.`;
const valueText=(value,formatter=euro)=>value==null?"–":formatter(value);
const normalizeText=value=>String(value??"").trim().replace(/\s+/g," ");
const keyOf=value=>normalizeText(value).toLocaleLowerCase("de-DE");
const addCount=(map,label,amount=1)=>{
  const clean=normalizeText(label);if(!clean)return;
  const key=keyOf(clean),entry=map.get(key)||{label:clean,count:0};entry.count+=amount;map.set(key,entry);
};
const topEntry=map=>[...map.values()].sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label,"de"))[0]||null;
const countBars=(map,total)=>[...map.values()].sort((a,b)=>b.count-a.count).map(entry=>`
  <div class="analysis-bar"><span>${esc(entry.label)}</span><i style="--analysis-bar:${Math.max(3,percent(entry.count,total))}%"></i><strong>${entry.count}</strong></div>`).join("");

function projectDate(project){
  const date=new Date(project.updated||project.created||0);
  return Number.isNaN(date.getTime())?null:date;
}
function inPeriod(project,period){
  if(period==="all")return true;
  const date=projectDate(project);if(!date)return false;
  const now=new Date();
  if(period==="month")return date.getFullYear()===now.getFullYear()&&date.getMonth()===now.getMonth();
  return date.getFullYear()===now.getFullYear();
}
function isEligibleProject(project){
  if(!project||project.recordType==="reference"||project.isReference===true)return false;
  if(project.deleted===true||project.isDeleted===true||project.test===true||project.isTest===true)return false;
  return !["draft","deleted","cancelled","canceled","aborted","test"].includes(String(project.status||"").toLowerCase());
}
function projectProcess(project){
  const raw=project.customerObjectProcess||project.process||project.estimatorData?.process||project.fields?.customerObjectProcess||"";
  const value=String(raw).toLowerCase();
  if(value==="both"||value.includes("beid")||(num(project.fields?.engraveMinutes)>0&&num(project.fields?.cutMinutes)>0))return "Gravieren und Schneiden";
  if(value.includes("cut")||value.includes("schnitt")||num(project.fields?.cutMinutes)>0)return "Schneiden";
  if(value.includes("engr")||value.includes("grav")||num(project.fields?.engraveMinutes)>0)return "Gravieren";
  if(project.orderType==="design")return "Design / Datei";
  if(project.module==="3d"||project.module==="3D-Druck")return "3D-Druck";
  return normalizeText(raw)||"Sonstige Bearbeitung";
}
function projectTimes(project){
  const engraving=finite(project.actualEngravingTime)?num(project.actualEngravingTime):num(project.fields?.engraveMinutes);
  const cutting=finite(project.actualCutTime)?num(project.actualCutTime):num(project.fields?.cutMinutes);
  const total=finite(project.actualTotalTime)?num(project.actualTotalTime):
    engraving+cutting+num(project.fields?.workMinutes)+num(project.designMinutes);
  return {engraving,cutting,total};
}
function projectMaterial(project){
  const id=project.fields?.matMain||project.materialId||project.estimatorData?.materialId||"";
  const [materialId,variantId]=String(id).split("::");
  const base=state.materials.find(item=>item.id===materialId);
  const variant=variantId?(base?.variants||[]).find(item=>item.id===variantId):null;
  const material=variant?{...base,...variant,name:`${base.name} – ${variant.name}`}:base;
  const concrete=material?.name||project.materialName||project.estimatorData?.materialName||project.objectMaterial||"";
  const family=material?inferMaterialCategory(material):(project.materialFamily||project.materialCategory||project.objectMaterial||"");
  return {concrete:normalizeText(concrete),family:normalizeText(family)};
}
function projectMachine(project){
  const id=project.machineId||project.fields?.machineSelect||project.estimatorData?.machineId||"";
  return normalizeText(project.machineName||state.machines.find(machine=>machine.id===id)?.name||project.estimatorData?.machineName||"");
}
function projectSurcharges(project,ladder){
  return (ladder.surchargeItems||[]).filter(([,value])=>cents(value)!==0);
}
function orderTypeLabel(value){
  return ({own:"Eigenes Produkt",customerObject:"Kundenobjekt bearbeiten",service:"Dienstleistung ohne Material",design:"Design- und Dateidienstleistung"})[value]||normalizeText(value)||"Sonstige Auftragsart";
}
function priceTypeLabel(value){
  return ({normal:"Normaler Kundenpreis",regularCustomer:"Stammkundenpreis",special:"Sonderpreis",promotion:"Aktionspreis",repeatOrder:"Folgebestellungspreis",other:"Sonstiges"})[value]||"Sonstiges";
}
function metric(label,value,note="",tone="gold"){
  return `<div class="analysis-metric analysis-tone-${tone}"><span>${esc(label)}</span><strong>${value}</strong>${note?`<small>${esc(note)}</small>`:""}</div>`;
}
function group(title,eyebrow,content,open=true){
  return `<details class="analysis-group card" ${open?"open":""}><summary><div><span>${esc(eyebrow)}</span><h3>${esc(title)}</h3></div><i>›</i></summary><div class="analysis-group-body">${content}</div></details>`;
}

export function buildWorkshopAnalysis(projects=getRealProjects(),period="all"){
  const eligible=projects.filter(project=>isEligibleProject(project)&&inPeriod(project,period));
  const totals={
    eligible:eligible.length,agreements:0,withoutAgreement:0,underRecommendation:0,onRecommendation:0,overRecommendation:0,
    underCosts:0,underWorkPrice:0,repeatPrices:0,engraving:0,cutting:0,both:0
  };
  const recommended=[],agreed=[],deviations=[],deviationPercents=[],discounts=[],engravingTimes=[],cuttingTimes=[],totalTimes=[],surchargeTotals=[];
  const priceTypes=new Map(),materials=new Map(),families=new Map(),machines=new Map(),processes=new Map(),orderTypes=new Map(),surcharges=new Map();
  let largestDiscount=null,largestPositive=null;
  for(const project of eligible){
    const ladder=getPriceLadderData(project);
    if(finite(ladder.recommendedSalePrice)&&cents(ladder.recommendedSalePrice)>0)recommended.push(ladder.recommendedSalePrice);
    const hasAgreement=finite(ladder.agreementPrice);
    if(hasAgreement){
      totals.agreements++;agreed.push(ladder.agreementPrice);
      addCount(priceTypes,priceTypeLabel(project.priceType||project.agreementPriceType||"normal"));
      if(project.isPreferredRepeatPrice===true)totals.repeatPrices++;
      if(finite(ladder.recommendedSalePrice)&&cents(ladder.recommendedSalePrice)>0){
        const deviation=(cents(ladder.agreementPrice)-cents(ladder.recommendedSalePrice))/100;
        deviations.push(deviation);deviationPercents.push(deviation/ladder.recommendedSalePrice*100);
        if(deviation<0){totals.underRecommendation++;discounts.push(Math.abs(deviation));if(largestDiscount===null||deviation<largestDiscount)largestDiscount=deviation;}
        else if(deviation>0){totals.overRecommendation++;if(largestPositive===null||deviation>largestPositive)largestPositive=deviation;}
        else totals.onRecommendation++;
      }
      if(finite(ladder.selfCosts)&&cents(ladder.agreementPrice)<cents(ladder.selfCosts))totals.underCosts++;
      if(finite(ladder.calculatedWorkPrice)&&cents(ladder.agreementPrice)<cents(ladder.calculatedWorkPrice))totals.underWorkPrice++;
    }else totals.withoutAgreement++;
    const material=projectMaterial(project);addCount(materials,material.concrete);addCount(families,material.family);
    addCount(machines,projectMachine(project));addCount(orderTypes,orderTypeLabel(project.orderType));
    const process=projectProcess(project);addCount(processes,process);
    if(process==="Gravieren")totals.engraving++;else if(process==="Schneiden")totals.cutting++;else if(process==="Gravieren und Schneiden")totals.both++;
    const times=projectTimes(project);
    if(times.engraving>0)engravingTimes.push(times.engraving);if(times.cutting>0)cuttingTimes.push(times.cutting);if(times.total>0)totalTimes.push(times.total);
    const activeSurcharges=projectSurcharges(project,ladder);
    activeSurcharges.forEach(([label])=>addCount(surcharges,label));
    surchargeTotals.push(activeSurcharges.reduce((sum,[,value])=>sum+num(value),0));
    const machineName=projectMachine(project);
    if(machineName){
      const key=keyOf(machineName),entry=machines.get(key);
      entry.minutes=(entry.minutes||0)+times.total;entry.engraving=(entry.engraving||0)+times.engraving;entry.cutting=(entry.cutting||0)+times.cutting;
    }
  }
  const learningRows=[
    ...(state.learningRecords||[]),
    ...(state.projects||[]).filter(project=>project.recordType==="reference"||project.isReference===true)
  ].filter((row,index,array)=>index===array.findIndex(other=>(other.id||other.projectId)===(row.id||row.projectId)));
  const learning={total:learningRows.filter(row=>row.reference!==false).length,excluded:learningRows.filter(row=>row.reference===false).length,timeDeviations:[],priceDeviations:[],materialDeviations:[],withActualTime:0,withActualPrice:0,errorCauses:new Map(),qualities:new Map(),satisfaction:[]};
  learningRows.forEach(row=>{
    if(row.reference===false)return;
    const estimatedTime=finite(row.estimatedTotalTime)?num(row.estimatedTotalTime):num(row.estimatedCutTime)+num(row.estimatedEngravingTime);
    const actualTime=finite(row.actualTotalTime)?num(row.actualTotalTime):finite(row.actualMinutes)?num(row.actualMinutes):null;
    if(actualTime!==null){learning.withActualTime++;if(estimatedTime>0)learning.timeDeviations.push(actualTime-estimatedTime);}
    if(finite(row.actualPrice)){learning.withActualPrice++;if(finite(row.estimatedPrice)&&num(row.estimatedPrice)>0)learning.priceDeviations.push(num(row.actualPrice)-num(row.estimatedPrice));}
    const estimatedConsumption=row.estimatedConsumption??row.estimatedMaterialConsumption;
    const actualConsumption=row.actualConsumption??row.actualMaterialConsumption;
    const estimatedUnit=row.estimatedConsumptionUnit??row.materialUnit;
    const actualUnit=row.actualConsumptionUnit??row.materialUnit;
    if(finite(estimatedConsumption)&&finite(actualConsumption)&&estimatedUnit&&estimatedUnit===actualUnit)learning.materialDeviations.push(num(actualConsumption)-num(estimatedConsumption));
    addCount(learning.errorCauses,row.errorCause||row.failureReason||"");
    addCount(learning.qualities,row.referenceQuality||row.quality||"");
    if(finite(row.customerSatisfaction))learning.satisfaction.push(num(row.customerSatisfaction));
  });
  return {totals,recommended,agreed,deviations,deviationPercents,discounts,largestDiscount,largestPositive,engravingTimes,cuttingTimes,totalTimes,surchargeTotals,priceTypes,materials,families,machines,processes,orderTypes,surcharges,learning};
}

function renderAnalysis(data){
  const {totals,learning}=data;
  const deviation=average(data.deviations),deviationPercent=average(data.deviationPercents);
  const deviationSentence=deviation==null?"Noch keine vergleichbaren Preisvereinbarungen.":`Durchschnittlich ${euro(Math.abs(deviation))} beziehungsweise ${percentText(Math.abs(deviationPercent))} ${deviation<0?"unter":deviation>0?"über":"auf"} deiner Empfehlung.`;
  const quality=`
    <div class="analysis-metrics">
      ${metric("Ausgewertete Projekte",String(totals.eligible),"Nur geeignete Kundenprojekte")}
      ${metric("Projekte mit Preisvereinbarung",String(totals.agreements),`${percentText(percent(totals.agreements,totals.eligible))} vollständig`,"purple")}
      ${metric("Ø empfohlener Verkaufspreis",valueText(average(data.recommended)),`${data.recommended.length} zuverlässige Werte`)}
      ${metric("Ø vereinbarter Verkaufspreis",valueText(average(data.agreed)),`${data.agreed.length} Vereinbarungen`,"purple")}
      ${metric("Ø Preisabweichung",deviation==null?"–":`${deviation>0?"+":""}${euro(deviation)}`,deviationSentence,deviation<0?"orange":deviation>0?"green":"gold")}
      ${metric("Unter Selbstkosten",String(totals.underCosts),`${percentText(percent(totals.underCosts,totals.agreements))} der Vereinbarungen`,totals.underCosts?"red":"green")}
      ${metric("Unter Arbeitspreis",String(totals.underWorkPrice),`${percentText(percent(totals.underWorkPrice,totals.agreements))} der Vereinbarungen`,totals.underWorkPrice?"orange":"green")}
    </div>
    <div class="analysis-distribution">
      <h4>Preisstatus zur Empfehlung</h4>
      ${countBars(new Map([
        ["under",{label:"Unter Empfehlung",count:totals.underRecommendation}],
        ["on",{label:"Ungefähr auf Empfehlung",count:totals.onRecommendation}],
        ["over",{label:"Über Empfehlung",count:totals.overRecommendation}]
      ]),totals.agreements)}
    </div>`;
  const agreements=`
    <div class="analysis-metrics">
      ${metric("Mit Preisvereinbarung",String(totals.agreements),"0,00 € wird als echter Wert gezählt","purple")}
      ${metric("Ohne Preisvereinbarung",String(totals.withoutAgreement),"Noch nicht vollständig vereinbart","orange")}
      ${metric("Ø Nachlass zur Empfehlung",valueText(average(data.discounts)),"Nur Vereinbarungen unter Empfehlung","purple")}
      ${metric("Größter Nachlass",data.largestDiscount==null?"–":euro(Math.abs(data.largestDiscount)),"Abweichung zur Empfehlung","orange")}
      ${metric("Größte positive Abweichung",data.largestPositive==null?"–":`+${euro(data.largestPositive)}`,"Über der Empfehlung","green")}
      ${metric("Folgebestellungspreise",String(totals.repeatPrices),"Bevorzugt gespeicherte Preise","purple")}
      ${metric("Häufigste Preisart",esc(topEntry(data.priceTypes)?.label||"–"),topEntry(data.priceTypes)?`${topEntry(data.priceTypes).count} Projekte`:"Keine Daten","purple")}
    </div>
    ${data.priceTypes.size?`<div class="analysis-distribution"><h4>Verteilung der Preisarten</h4>${countBars(data.priceTypes,totals.agreements)}</div>`:""}`;
  const machineTop=topEntry(data.machines),materialTop=topEntry(data.materials),familyTop=topEntry(data.families),processTop=topEntry(data.processes),orderTop=topEntry(data.orderTypes),surchargeTop=topEntry(data.surcharges);
  const workshop=`
    <div class="analysis-metrics">
      ${metric("Häufigstes Material",esc(materialTop?.label||"–"),materialTop?`${materialTop.count} Projekte`:"Keine Angabe","blue")}
      ${metric("Häufigste Materialfamilie",esc(familyTop?.label||"–"),familyTop?`${familyTop.count} Projekte`:"Keine Angabe","blue")}
      ${metric("Häufigste Maschine",esc(machineTop?.label||"–"),machineTop?`${machineTop.count} Projekte`:"Keine Angabe","blue")}
      ${metric("Häufigste Bearbeitungsart",esc(processTop?.label||"–"),processTop?`${processTop.count} Projekte`:"Keine Angabe","blue")}
      ${metric("Ø Gravurdauer",minutesText(average(data.engravingTimes)),`${data.engravingTimes.length} Zeitwerte`,"blue")}
      ${metric("Ø Schnittdauer",minutesText(average(data.cuttingTimes)),`${data.cuttingTimes.length} Zeitwerte`,"blue")}
      ${metric("Ø gesamte Bearbeitungszeit",minutesText(average(data.totalTimes)),`${data.totalTimes.length} Zeitwerte`,"blue")}
      ${metric("Häufigste Auftragsart",esc(orderTop?.label||"–"),orderTop?`${orderTop.count} Projekte`:"Keine Angabe","blue")}
      ${metric("Häufigster Zuschlag",esc(surchargeTop?.label||"–"),surchargeTop?`${surchargeTop.count} Anwendungen`:"Keine aktiven Zuschläge","blue")}
      ${metric("Ø Zuschlagssumme",valueText(average(data.surchargeTotals)),`${data.surchargeTotals.length} Projekte`,"blue")}
    </div>
    <div class="analysis-split">
      <div class="analysis-distribution"><h4>Bearbeitungsarten</h4>${countBars(data.processes,totals.eligible)}</div>
      <div class="analysis-distribution"><h4>Maschinennutzung</h4>${countBars(data.machines,totals.eligible)}</div>
      <div class="analysis-distribution"><h4>Aktive Zuschläge</h4>${countBars(data.surcharges,totals.eligible)}</div>
    </div>`;
  const timeDeviation=average(learning.timeDeviations),priceDeviation=average(learning.priceDeviations);
  const learningContent=`
    <div class="analysis-metrics">
      ${metric("Geeignete Lernprojekte",String(learning.total),"Referenzen mit aktivem Lernstatus","blue")}
      ${metric("Ausgeschlossene Projekte",String(learning.excluded),"Nicht in Lernwerten verwendet","orange")}
      ${metric("Ø Zeitabweichung",timeDeviation==null?"–":`${timeDeviation>0?"+":""}${minutesText(timeDeviation)}`,timeDeviation==null?"Keine vergleichbaren Werte":timeDeviation>0?"Tatsächlich länger als geschätzt":"Tatsächlich kürzer als geschätzt","blue")}
      ${metric("Anteil genauer Schätzungen","–","Keine bestehende Lerntoleranz gespeichert","blue")}
      ${metric("Ø Preisabweichung",priceDeviation==null?"–":`${priceDeviation>0?"+":""}${euro(priceDeviation)}`,"Ist-/Referenzpreis gegen Schätzung","blue")}
      ${metric("Ø Materialabweichung",learning.materialDeviations.length?num(average(learning.materialDeviations)).toLocaleString("de-DE",{maximumFractionDigits:2}):"–","Nur identische Einheiten","blue")}
      ${metric("Mit echtem Zeitwert",String(learning.withActualTime),"Vorhandene Referenzwerte","blue")}
      ${metric("Mit echtem Preiswert",String(learning.withActualPrice),"Keine Rechnungs- oder Zahlungsbestätigung","blue")}
      ${metric("Häufigste Fehlerursache",esc(topEntry(learning.errorCauses)?.label||"–"),topEntry(learning.errorCauses)?`${topEntry(learning.errorCauses).count} Nennungen`:"Keine Daten","blue")}
      ${metric("Beste Referenzqualität",esc(topEntry(learning.qualities)?.label||"–"),topEntry(learning.qualities)?`${topEntry(learning.qualities).count} Nennungen`:"Keine Daten","blue")}
      ${metric("Ø Kundenzufriedenheit",learning.satisfaction.length?num(average(learning.satisfaction)).toLocaleString("de-DE",{maximumFractionDigits:1}):"–",`${learning.satisfaction.length} Bewertungen`,"blue")}
    </div>
    <p class="analysis-note">Referenzprojekte werden ausschließlich hier ausgewertet. Sie zählen nicht als Kundenauftrag, Verkauf oder Preisvereinbarung.</p>`;
  return group("Kalkulationsqualität","PREISE",quality,true)+group("Preisvereinbarungen","VEREINBARUNGEN",agreements,true)+group("Werkstattnutzung","WERKSTATT",workshop,true)+group("Lernsystem und Schätzgenauigkeit","LERNSYSTEM",learningContent,true);
}

export function legacyStatisticsVisible(){
  const stored=localStorage.getItem(LEGACY_KEY);
  return stored===null?FEATURE_FLAGS.legacyStatisticsVisible:stored==="true";
}
export function applyStatisticsFeatureFlags(){
  const legacyVisible=legacyStatisticsVisible();
  $("legacyStatisticsArea")?.classList.toggle("hidden",!legacyVisible);
  if($("legacyStatisticsToggle"))$("legacyStatisticsToggle").checked=legacyVisible;
  $("workshopAnalysisArea")?.classList.toggle("hidden",!FEATURE_FLAGS.workshopAnalysisVisible);
}
export function renderWorkshopAnalysis(){
  applyStatisticsFeatureFlags();
  const box=$("workshopAnalysisContent");if(!box||!FEATURE_FLAGS.workshopAnalysisVisible)return;
  try{
    const period=$("workshopAnalysisPeriod")?.value||"all";
    box.innerHTML=renderAnalysis(buildWorkshopAnalysis(getRealProjects(),period));
  }catch(error){
    console.error("Werkstatt-Analyse:",error);
    box.innerHTML='<div class="analysis-unavailable card">Die Werkstatt-Analyse konnte teilweise nicht berechnet werden. Rechner, Projekte und Speicherung bleiben verfügbar.</div>';
  }
}
export function initializeWorkshopAnalysis(){
  const period=$("workshopAnalysisPeriod"),toggle=$("legacyStatisticsToggle");
  if(period&&!period.dataset.bound){period.dataset.bound="1";period.addEventListener("change",renderWorkshopAnalysis);}
  if(toggle&&!toggle.dataset.bound){toggle.dataset.bound="1";toggle.addEventListener("change",()=>{
    localStorage.setItem(LEGACY_KEY,String(toggle.checked));applyStatisticsFeatureFlags();
  });}
  renderWorkshopAnalysis();
}
