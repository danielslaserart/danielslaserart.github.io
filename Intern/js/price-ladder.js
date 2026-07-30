import { euro, esc, num } from "./utils.js";

const hasValue=value=>value!==null&&value!==undefined&&value!==""&&Number.isFinite(Number(value));
const firstValue=(...values)=>values.find(hasValue);
const cents=value=>Math.round(num(value)*100);
const money=value=>cents(value)/100;

function sources(source={}){
  const snapshot=source.calculationSnapshot||{};
  const estimator=source.estimatorData||{};
  return [
    source.pricingBreakdown,
    snapshot.pricingBreakdown,
    estimator.pricingBreakdown,
    source.breakdown
  ].filter(Boolean);
}

function component(source,keys){
  for(const data of sources(source)){
    const value=firstValue(...keys.map(key=>data[key]));
    if(hasValue(value))return money(value);
  }
  const value=firstValue(...keys.map(key=>source[key]));
  return hasValue(value)?money(value):0;
}

export function getPriceLadderData(source={}){
  const result=source.calculationSnapshot?.results||{};
  const estimator=source.estimatorData||{};
  const directBreakdown=sources(source)[0]||{};
  const selfRaw=firstValue(
    source.costCoveringMinimumPrice,source.selfCosts,source.cost,
    result.calculatedSelfCosts,directBreakdown.cost,estimator.cost
  );
  const selfAvailable=hasValue(selfRaw);
  const selfCosts=selfAvailable?money(selfRaw):null;
  const surchargeItems=[
    ["Grundpauschale",component(source,["baseFee"])],
    ["Schwierigkeitsaufschlag",component(source,["difficulty","difficultySurcharge"])],
    ["Risikoaufschlag",component(source,["risk","riskSurcharge"])],
    ["Expresszuschlag",component(source,["express","expressSurcharge"])],
    ["Motiv-/Komplexitätsaufschlag",component(source,["complexitySurcharge","motifSurcharge"])],
    ["Materialaufschlag",component(source,["materialSurcharge"])],
    ["Weitere Zuschläge",component(source,["otherSurcharges","furtherSurcharges"])]
  ];
  const totalSurcharges=money(surchargeItems.reduce((sum,item)=>sum+item[1],0));
  const explicitWork=firstValue(
    source.calculatedWorkPrice,source.priceBeforeProfit,source.preProfitPrice,
    source.orderType==="customerObject"?source.calculated:undefined,
    directBreakdown.calculated,estimator.calculatedWorkPrice
  );
  let calculatedWorkPrice=hasValue(explicitWork)?money(explicitWork):null;
  if(calculatedWorkPrice===null&&selfAvailable){
    const canDerive=source.orderType!=="customerObject"||sources(source).length>0||
      surchargeItems.some(item=>item[1]!==0);
    if(canDerive)calculatedWorkPrice=money(selfCosts+totalSurcharges);
  }
  const recommendedRaw=firstValue(
    source.recommendedSalePrice,source.recommendedPrice,
    directBreakdown.sale,result.optimalPrice,result.calculatedPrice,
    estimator.recommendedSalePrice,estimator.estimatedPrice,source.estimatedPrice,source.sale
  );
  const recommendedSalePrice=hasValue(recommendedRaw)?money(recommendedRaw):null;
  const companyProfit=calculatedWorkPrice!==null&&recommendedSalePrice!==null
    ?money(recommendedSalePrice-calculatedWorkPrice):null;
  const companyProfitPercent=companyProfit!==null&&cents(calculatedWorkPrice)!==0
    ?companyProfit/calculatedWorkPrice*100:null;
  const status=companyProfit===null?"unknown":cents(companyProfit)>0?"positive":cents(companyProfit)<0?"negative":"neutral";
  return {selfCosts,costCoveringMinimumPrice:selfCosts,surchargeItems,totalSurcharges,
    calculatedWorkPrice,recommendedSalePrice,companyProfit,companyProfitPercent,status};
}

function signedMoney(value){
  const clean=cents(value)===0?0:money(value);
  return `${clean>0?"+":clean<0?"−":""}${euro(Math.abs(clean))}`;
}

export function renderPriceLadder(data,{heading=true,details=true}={}){
  const step=(kind,label,value,description,extra="")=>`<div class="price-ladder-step price-ladder-step--${kind}">
    <span class="price-step-dot" aria-hidden="true"></span>
    <div class="price-ladder-content"><span class="price-ladder-label">${esc(label)}</span>
    <strong>${value===null?"Nicht verfügbar":euro(value)}</strong>${description?`<small>${esc(description)}</small>`:""}${extra}</div>
  </div>`;
  const surchargeDetails=data.calculatedWorkPrice!==null&&details?`<details class="price-ladder-details">
    <summary>Zuschläge anzeigen</summary><div>
      ${data.selfCosts!==null?`<p><span>Selbstkosten</span><strong>${euro(data.selfCosts)}</strong></p>`:""}
      ${data.surchargeItems.filter(item=>item[1]!==0).map(item=>`<p><span>${esc(item[0])}</span><strong>${euro(item[1])}</strong></p>`).join("")}
      ${data.totalSurcharges===0?`<small>Keine zusätzlichen Zuschläge aktiv.</small>`:""}
      <p class="price-ladder-details-total"><span>Kalkulierter Arbeitspreis</span><strong>${euro(data.calculatedWorkPrice)}</strong></p>
    </div></details>`:"";
  let profitText="";
  let warning="";
  if(data.companyProfit!==null){
    const percent=data.companyProfitPercent===null?"":` (${data.companyProfitPercent.toLocaleString("de-DE",{minimumFractionDigits:1,maximumFractionDigits:1})} %)`;
    profitText=`<small class="company-profit ${data.status==="negative"?"company-profit--negative":""}">${signedMoney(data.companyProfit)} Unternehmensgewinn${percent}</small>`;
    if(data.status==="negative")warning=`<small class="price-ladder-warning">Der empfohlene Verkaufspreis liegt unter dem kalkulierten Arbeitspreis.</small>`;
    if(data.status==="neutral")warning=`<small>Kein zusätzlicher Unternehmensgewinn eingeplant.</small>`;
  }else if(data.recommendedSalePrice!==null){
    profitText=`<small>Unternehmensgewinn bei diesem älteren Projekt nicht vollständig ermittelbar.</small>`;
  }
  return `<section class="price-ladder" aria-label="Preisleiter">${heading?`<h4>PREISLEITER</h4>`:""}
    ${step("minimum","Kostendeckender Mindestpreis",data.costCoveringMinimumPrice,data.costCoveringMinimumPrice===null?"Für dieses ältere Projekt nicht zuverlässig ermittelbar.":"Deckt deine berechneten Kosten. Kein Gewinn.")}
    ${step("work","Kalkulierter Arbeitspreis",data.calculatedWorkPrice,data.calculatedWorkPrice===null?"Für dieses ältere Projekt nicht eindeutig ermittelbar.":data.totalSurcharges===0?"Keine zusätzlichen Zuschläge aktiv.":`Enthält deine Kosten sowie Grundpauschale, Aufwand, Risiko und aktive Zuschläge.`,surchargeDetails)}
    ${step(data.status==="positive"?"recommended":data.status==="negative"?"negative":"neutral","Empfohlener Verkaufspreis",data.recommendedSalePrice,"",profitText+warning)}
  </section>`;
}
