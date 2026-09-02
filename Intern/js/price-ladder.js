import { euro, esc, num } from "./utils.js?v=6.6.13";

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

export function getAgreementPrice(source={}){
  const snapshot=source.calculationSnapshot||{};
  const normalized=source.priceAgreement||source.normalizedPriceAgreement||{};
  const raw=firstValue(
    source.agreementPrice,
    normalized.agreementPrice,
    snapshot.agreementPrice,
    snapshot.priceAgreement?.agreementPrice,
    source.agreedPrice,
    source.agreedSalePrice,
    source.customerAgreementPrice,
    source.customerPrice,
    source.negotiatedPrice
  );
  return hasValue(raw)?money(raw):null;
}

export function getAgreementProfit({agreementPrice,selfCosts}={}){
  if(!hasValue(agreementPrice)||!hasValue(selfCosts))return null;
  return (cents(agreementPrice)-cents(selfCosts))/100;
}

export function getAgreementMargin({agreementPrice,selfCosts}={}){
  if(!hasValue(agreementPrice)||!hasValue(selfCosts)||cents(agreementPrice)===0)return null;
  return getAgreementProfit({agreementPrice,selfCosts})/money(agreementPrice)*100;
}

export function getAgreementPriceStatus({agreementPrice,selfCosts,subtotal,recommendedSalePrice}={}){
  if(!hasValue(agreementPrice))return null;
  if(!hasValue(selfCosts))return "Preisstatus nicht vollständig ermittelbar";
  const agreement=cents(agreementPrice);
  const cost=cents(selfCosts);
  if(agreement<cost)return "Unter Kostendeckung";
  if(agreement===cost)return "Selbstkosten exakt gedeckt";
  if(hasValue(subtotal)){
    const subtotalCents=cents(subtotal);
    if(agreement<subtotalCents)return "Selbstkosten gedeckt, Pauschalen und Zuschläge jedoch nicht vollständig";
    if(agreement===subtotalCents)return "Zwischensumme exakt gedeckt";
  }
  if(hasValue(recommendedSalePrice)){
    const recommended=cents(recommendedSalePrice);
    if(agreement<recommended)return "Zwischensumme gedeckt, aber unter der Empfehlung";
    if(agreement===recommended)return "Entspricht der Empfehlung";
    return "Liegt über der Empfehlung";
  }
  return "Kosten gedeckt";
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
  const costItems=[
    ["Materialkosten",component(source,["material"])],
    ["Verbrauchsmaterial",component(source,["consumables"])],
    ["Maschinenkosten",component(source,["machine"])],
    ["Arbeitskosten",component(source,["work"])],
    ["Sonstige Kosten",component(source,["extra"])],
    ["Fehlerreserve",component(source,["reserve","errorReserve"])]
  ];
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
    source.calculatedWorkPrice,directBreakdown.calculatedWorkPrice,estimator.calculatedWorkPrice
  );
  const calculatedWorkPrice=hasValue(explicitWork)?money(explicitWork):totalSurcharges;
  const subtotalRaw=firstValue(
    source.subtotal,source.priceBeforeProfit,source.preProfitPrice,
    directBreakdown.subtotal,directBreakdown.priceBeforeProfit,estimator.subtotal
  );
  const subtotal=hasValue(subtotalRaw)?money(subtotalRaw)
    :selfCosts!==null?money(selfCosts+calculatedWorkPrice):null;
  const recommendedRaw=firstValue(
    source.recommendedSalePrice,source.recommendedPrice,
    directBreakdown.sale,result.optimalPrice,result.calculatedPrice,
    estimator.recommendedSalePrice,estimator.estimatedPrice,source.estimatedPrice,source.sale
  );
  const recommendedSalePrice=hasValue(recommendedRaw)?money(recommendedRaw):null;
  const profitPercentRaw=firstValue(source.profitPercent,directBreakdown.profitPercent,source.fields?.profit,source.calculationSnapshot?.fields?.profit,source.calculationSnapshot?.pricingSettings?.profit);
  const profitMarkupRaw=firstValue(source.profitMarkup,directBreakdown.profitMarkup);
  const profitPercent=hasValue(profitPercentRaw)?num(profitPercentRaw):null;
  const profitMarkup=hasValue(profitMarkupRaw)?money(profitMarkupRaw)
    :profitPercent!==null&&subtotal!==null?money(subtotal*profitPercent/100):null;
  const preRoundedRaw=firstValue(source.calculated,directBreakdown.calculated);
  const preRoundedPrice=hasValue(preRoundedRaw)?num(preRoundedRaw)
    :subtotal!==null&&profitMarkup!==null?subtotal+profitMarkup:null;
  const roundingDifference=preRoundedPrice!==null&&recommendedSalePrice!==null
    ?money(recommendedSalePrice-preRoundedPrice):null;
  const companyProfit=selfCosts!==null&&recommendedSalePrice!==null
    ?money(recommendedSalePrice-selfCosts):null;
  const companyProfitPercent=companyProfit!==null&&cents(recommendedSalePrice)!==0
    ?companyProfit/recommendedSalePrice*100:null;
  const status=companyProfit===null?"unknown":cents(companyProfit)>0?"positive":cents(companyProfit)<0?"negative":"neutral";
  const agreementPrice=getAgreementPrice(source);
  const agreementProfit=getAgreementProfit({agreementPrice,selfCosts});
  const agreementMargin=getAgreementMargin({agreementPrice,selfCosts});
  const agreementStatus=getAgreementPriceStatus({
    agreementPrice,selfCosts,subtotal,recommendedSalePrice
  });
  return {selfCosts,costCoveringMinimumPrice:selfCosts,costItems,surchargeItems,totalSurcharges,
    calculatedWorkPrice,subtotal,profitMarkup,profitPercent,roundingDifference,recommendedSalePrice,
    companyProfit,companyProfitPercent,status,agreementPrice,agreementProfit,agreementMargin,agreementStatus};
}

function signedMoney(value){
  const clean=cents(value)===0?0:money(value);
  return `${clean>0?"+":clean<0?"−":""}${euro(Math.abs(clean))}`;
}

function signedPercent(value){
  const clean=Math.abs(value)<.05?0:value;
  const formatted=Math.abs(clean).toLocaleString("de-DE",{minimumFractionDigits:1,maximumFractionDigits:1});
  return `${clean<0?"−":""}${formatted} %`;
}

export function renderAgreementPriceSummary(data={}){
  if(data.agreementPrice===null||data.agreementPrice===undefined)return `<div class="price-ladder-agreement" aria-label="Preisvereinbarung">
    <span class="price-step-dot price-step-dot--agreement" aria-hidden="true"></span>
    <div class="price-ladder-content">
      <span class="price-ladder-label price-ladder-label--agreement">Preisvereinbarung</span>
      <strong>Nicht festgelegt</strong>
      <small>Trage oben einen vereinbarten Verkaufspreis ein, um Gewinn oder Verlust zu sehen.</small>
    </div>
  </div>`;
  const profit=data.agreementProfit;
  const profitState=profit===null?"unknown":cents(profit)<0?"negative":cents(profit)>0?"positive":"neutral";
  let result;
  if(profit===null){
    result=`<small class="agreement-result agreement-result--unknown">Aktueller Gewinn bei diesem älteren Projekt nicht vollständig ermittelbar.</small>`;
  }else{
    const label=cents(profit)<0?"Verlust nach Abzug der Selbstkosten":"Gewinn nach Abzug der Selbstkosten";
    result=`<small class="agreement-result agreement-result--${profitState}">${signedMoney(profit)} ${label}</small>`;
    result+=cents(data.agreementPrice)===0
      ?`<small class="agreement-margin">Gewinnmarge: nicht berechenbar</small>`
      :`<small class="agreement-margin">(${signedPercent(data.agreementMargin)} aktuelle Gewinnmarge)</small>`;
  }
  return `<div class="price-ladder-agreement" aria-label="Preisvereinbarung">
    <span class="price-step-dot price-step-dot--agreement" aria-hidden="true"></span>
    <div class="price-ladder-content">
      <span class="price-ladder-label price-ladder-label--agreement">Preisvereinbarung</span>
      <strong>${euro(data.agreementPrice)}</strong>
      ${result}
      ${data.agreementStatus?`<small class="agreement-status">Status: ${esc(data.agreementStatus)}</small>`:""}
    </div>
  </div>`;
}

export function renderPriceLadder(data,{heading=true,details=true}={}){
  const step=(kind,label,value,description,extra="")=>`<div class="price-ladder-step price-ladder-step--${kind}">
    <span class="price-step-dot" aria-hidden="true"></span>
    <div class="price-ladder-content"><span class="price-ladder-label">${esc(label)}</span>
    <strong>${value===null?"Nicht verfügbar":euro(value)}</strong>${description?`<small>${esc(description)}</small>`:""}${extra}</div>
  </div>`;
  const visibleCosts=(data.costItems||[]).filter(item=>cents(item[1])!==0);
  const costDetails=data.selfCosts!==null&&details&&visibleCosts.length?`<details class="price-ladder-details">
    <summary>Selbstkosten anzeigen</summary><div>
      ${visibleCosts.map(item=>`<p><span>${esc(item[0])}</span><strong>${euro(item[1])}</strong></p>`).join("")}
      <p class="price-ladder-details-total"><span>Selbstkosten gesamt</span><strong>${euro(data.selfCosts)}</strong></p>
    </div></details>`:"";
  const surchargeDetails=data.calculatedWorkPrice!==null&&details?`<details class="price-ladder-details">
    <summary>Pauschalen und Zuschläge anzeigen</summary><div>
      ${data.surchargeItems.filter(item=>item[1]!==0).map(item=>`<p><span>${esc(item[0])}</span><strong>${euro(item[1])}</strong></p>`).join("")}
      ${data.totalSurcharges===0?`<small>Keine Pauschalen oder Zuschläge aktiv.</small>`:""}
      <p class="price-ladder-details-total"><span>Kalkulierter Arbeitspreis</span><strong>${euro(data.calculatedWorkPrice)}</strong></p>
    </div></details>`:"";
  let profitText="";
  let warning="";
  if(data.companyProfit!==null){
    const percent=data.companyProfitPercent===null?"":` (${data.companyProfitPercent.toLocaleString("de-DE",{minimumFractionDigits:1,maximumFractionDigits:1})} %)`;
    const label=cents(data.companyProfit)<0?"Verlust nach Abzug der Selbstkosten":"Gesamtertrag nach Abzug der Selbstkosten";
    profitText=`<small class="company-profit ${data.status==="negative"?"company-profit--negative":""}">${signedMoney(data.companyProfit)} ${label}${percent}</small>`;
    if(data.status==="negative")warning=`<small class="price-ladder-warning">Der empfohlene Verkaufspreis liegt unter den Selbstkosten.</small>`;
    if(data.status==="neutral")warning=`<small>Die Selbstkosten sind exakt gedeckt. Kein Ertrag.</small>`;
  }
  const profitDescription=data.profitPercent===null?"Gewinnaufschlag vor Rundung.":`${data.profitPercent.toLocaleString("de-DE",{maximumFractionDigits:1})} % auf die Zwischensumme, vor Rundung.`;
  return `<section class="price-ladder" aria-label="Preisübersicht">${heading?`<h4>PREISÜBERSICHT</h4>`:""}
    ${step("minimum","Selbstkosten",data.selfCosts,data.selfCosts===null?"Für dieses ältere Projekt nicht zuverlässig ermittelbar.":"Material, Maschine, Arbeitszeit und sonstige echte Kosten.",costDetails)}
    ${step("work","Kalkulierter Arbeitspreis",data.calculatedWorkPrice,data.calculatedWorkPrice===null?"Für dieses ältere Projekt nicht eindeutig ermittelbar.":"Nur Pauschalen und Zuschläge – ohne Selbstkosten.",surchargeDetails)}
    ${step("neutral","Zwischensumme",data.subtotal,"Selbstkosten plus kalkulierter Arbeitspreis.")}
    ${step("work","Gewinnaufschlag",data.profitMarkup,profitDescription)}
    ${data.roundingDifference!==null&&cents(data.roundingDifference)!==0?step("neutral","Rundung",data.roundingDifference,"Anpassung auf den eingestellten Preis-Schritt."):""}
    ${step(data.status==="positive"?"recommended":data.status==="negative"?"negative":"neutral","Empfohlener Verkaufspreis",data.recommendedSalePrice,"Zwischensumme plus Gewinnaufschlag, anschließend gerundet.",profitText+warning)}
    ${renderAgreementPriceSummary(data)}
  </section>`;
}

