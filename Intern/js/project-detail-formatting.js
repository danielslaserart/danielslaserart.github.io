import { euro, esc, num } from "./utils.js?v=6.6.14";

const LABELS={
  customerObjectProcess:"Bearbeitungsart",objectMaterial:"Objektmaterial",machineSelect:"Maschine",
  engraveMinutes:"Gravurdauer",cutMinutes:"Schnittdauer",workMinutes:"Arbeitszeit",hourlyRate:"Stundenlohn",
  difficulty:"Schwierigkeitsgrad",riskSurcharge:"Risikoaufschlag",expressSurcharge:"Expresszuschlag",
  objectValue:"Objektwert",customerAddress:"Kundenadresse",agreementPrice:"Vereinbarter Verkaufspreis",
  agreementPriceNote:"Notiz zur Preisvereinbarung",agreementPriceType:"Preisart",priceType:"Preisart",
  priceAgreementDate:"Vereinbart am",agreementPriceDate:"Vereinbart am",
  isPreferredRepeatPrice:"Bevorzugter Preis für Folgebestellungen",isPreferredCustomerPrice:"Bevorzugter Preis für Folgebestellungen",
  matMain:"Hauptmaterial",matTransfer:"Übertragungsfolie",usageMain:"Materialverbrauch",
  usageTransfer:"Verbrauch Übertragungsfolie",printMinutes:"Druckdauer",packaging:"Verpackung",
  otherCosts:"Sonstige Kosten",reserve:"Fehlerreserve",profit:"Gewinnaufschlag",quantity:"Stückzahl",
  colors:"Farben",plotMinutes:"Plottdauer",weedMinutes:"Entgitterzeit",mountMinutes:"Montagezeit",
  pressMinutes:"Presszeit",prepMinutes:"Vor-/Nachbereitung",textilePrice:"Textilpreis"
};
const ENUMS={
  engrave:"Gravieren",cut:"Schneiden",both:"Gravieren und Schneiden",engraveAndCut:"Gravieren und Schneiden",
  easy:"Leicht",normal:"Normal",medium:"Mittel",hard:"Schwer",
  regularCustomer:"Stammkundenpreis",special:"Sonderpreis",promotion:"Aktionspreis",
  repeatOrder:"Folgebestellungspreis",other:"Sonstiges"
};
const MONEY_KEYS=/price|cost|fee|surcharge|packaging|profit|value/i;
const MINUTE_KEYS=/minutes|time$/i;
const PERCENT_KEYS=/percent|margin|reserve/i;
const DATE_KEYS=/date|created|updated/i;

export function projectFieldLabel(key){return LABELS[key]||key.replace(/([a-z])([A-Z])/g,"$1 $2").replace(/^./,c=>c.toUpperCase())}
export function isEmptyProjectValue(value){
  return value==null||value===""||(Array.isArray(value)&&value.length===0)||(typeof value==="object"&&!Array.isArray(value)&&Object.keys(value).length===0);
}
export function formatProjectFieldValue(key,value,{resolveMaterial,resolveMachine}={}){
  if(value===true||value==="true"||value==="on"||value===1||value==="1")return "Ja";
  if(value===false||value==="false"||value==="off"||value===0||value==="0"){
    if(typeof value==="boolean"||/^(is|has)/i.test(key))return "Nein";
  }
  if(ENUMS[value])return ENUMS[value];
  if((key==="matMain"||key==="matTransfer")&&resolveMaterial)return resolveMaterial(value)?.name||String(value);
  if(key==="machineSelect"&&resolveMachine)return resolveMachine(value)?.name||String(value);
  if(DATE_KEYS.test(key)&&!Number.isNaN(new Date(value).getTime()))return new Date(value).toLocaleDateString("de-DE");
  if(key==="hourlyRate")return `${num(value).toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2})} €/Std.`;
  if(MINUTE_KEYS.test(key)&&Number.isFinite(Number(value)))return `${num(value).toLocaleString("de-DE")} Min.`;
  if(PERCENT_KEYS.test(key)&&Number.isFinite(Number(value)))return `${num(value).toLocaleString("de-DE",{maximumFractionDigits:1})} %`;
  if(MONEY_KEYS.test(key)&&Number.isFinite(Number(value)))return euro(value);
  return String(value);
}
export function renderProjectRows(rows){
  return rows.filter(row=>!isEmptyProjectValue(row.value)||row.showZero&&Number(row.value)===0).map(row=>
    `<div><span>${esc(row.label)}</span><strong>${row.html??esc(row.formatted??String(row.value))}</strong>${row.help?`<small>${esc(row.help)}</small>`:""}</div>`
  ).join("");
}
export function getCostCoveringMinimumPrice(source={}){
  const raw=source.cost??source.selfCosts??source.calculationSnapshot?.results?.calculatedSelfCosts??source.pricingBreakdown?.cost??source.estimatorData?.cost;
  return Math.max(0,num(raw));
}
export function getRecommendedPrice(source={}){
  return Math.max(0,num(source.pricingBreakdown?.sale??source.calculationSnapshot?.results?.optimalPrice??source.estimatedPrice??source.sale));
}
export function toCents(value){return Math.round(num(value)*100)}
