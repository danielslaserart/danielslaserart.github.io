import { $, esc, euro, num, uid } from "./utils.js?v=6.6.15";
import { state, save, flushCloudSave, getRealProjects, normalizeCustomerRecord } from "./storage.js?v=6.6.15";
import { appAlert, appConfirm, appForm } from "./dialogs.js?v=6.6.15";

const WARNING_CATEGORIES=["Information","Positiv","Rabatt","Rechnung","Mahnung","Reklamation","Vorkasse","Problemkunde","Sonstiges"];
const PAYMENT_LABELS={immediate:"Zahlt sofort",punctual:"Zahlt pünktlich",late:"Zahlt verspätet",prepayment:"Nur Vorkasse",problematic:"Rechnung problematisch",unknown:"Nicht bewertet"};
const REASON_LABELS={regular:"Stammkundenpreis",family:"Familienrabatt",ownMaterial:"Eigenes Material",goodwill:"Kulanz",promotion:"Werbegeschenk",test:"Testauftrag",complaint:"Reklamation",other:"Sonstiges"};
let selectedCustomerId=null;
let activeCustomerTab="overview";

const now=()=>new Date().toISOString();
const key=value=>String(value||"").trim().toLocaleLowerCase("de-DE").replace(/\s+/g," ");
const dateTime=value=>new Date(value).toLocaleString("de-DE",{dateStyle:"short",timeStyle:"short"});
const customerProjects=customer=>getRealProjects().filter(p=>p.customerId===customer.id);
const activeWarnings=customer=>(customer.warnings||[]).filter(w=>w.active!==false);
const projectFinalPrice=p=>p.agreementPrice!=null?num(p.agreementPrice):num(p.actualPrice??p.sale);
const recommendedPrice=p=>num(p.estimatedPrice??p.calculationSnapshot?.results?.calculatedPrice??p.sale);
const statusLabel=status=>({offer:"Angebot",progress:"In Arbeit",waiting:"Wartet",done:"Fertig",billed:"Abgerechnet"})[status]||"Angebot";

function normalizeCustomer(customer={}){
  const normalized=normalizeCustomerRecord(customer)||{rating:0};
  return {...normalized,id:String(normalized.id||uid()),companyName:String(normalized.companyName||""),contactPerson:String(normalized.contactPerson||""),street:String(normalized.street||""),postalCode:String(normalized.postalCode||normalized.zip||""),city:String(normalized.city||""),phone:String(normalized.phone||""),email:String(normalized.email||""),regular:Boolean(normalized.regular),vip:Boolean(normalized.vip),blocked:Boolean(normalized.blocked),standardDiscount:{type:normalized.standardDiscount?.type==="amount"?"amount":"percent",value:num(normalized.standardDiscount?.value)},minimumFee:normalized.minimumFee==null?null:num(normalized.minimumFee),priceReason:normalized.priceReason||"other",priceReasonText:String(normalized.priceReasonText||""),warnings:Array.isArray(normalized.warnings)?normalized.warnings:[],notes:Array.isArray(normalized.notes)?normalized.notes:[],timeline:Array.isArray(normalized.timeline)?normalized.timeline:[],payment:{status:normalized.payment?.status||"unknown",notes:String(normalized.payment?.notes||"")},createdAt:normalized.createdAt||now(),updatedAt:normalized.updatedAt||now(),extensions:normalized.extensions&&typeof normalized.extensions==="object"?normalized.extensions:{attachments:[],images:[],phoneNotes:[],emails:[],reminders:[]}};
}

function allCustomers(){state.customers=(state.customers||[]).map(normalizeCustomer);return state.customers;}
function addTimeline(customer,type,title,description=""){customer.timeline.unshift({id:uid(),type,title,description,createdAt:now(),manual:type==="manual"});}
function derivedTimeline(customer){return customerProjects(customer).flatMap(p=>{const rows=[{id:`project:${p.id}`,type:"project",title:"Projekt erstellt",description:p.title,createdAt:p.created||p.updated}];if(p.status==="offer")rows.push({id:`offer:${p.id}`,type:"project",title:"Angebot erstellt",description:p.title,createdAt:p.updated||p.created});if(["done","billed"].includes(p.status))rows.push({id:`done:${p.id}`,type:"project",title:"Projekt abgeschlossen",description:p.title,createdAt:p.updated||p.created});if(p.status==="billed")rows.push({id:`invoice:${p.id}`,type:"project",title:"Rechnung erstellt",description:p.title,createdAt:p.updated||p.created});return rows;});}
function priceStats(customer){
  const projects=customerProjects(customer).slice().sort((a,b)=>new Date(b.updated||b.created)-new Date(a.updated||a.created));
  const agreements=projects.filter(p=>p.agreementPrice!=null),last=projects[0];
  const discounts=agreements.map(p=>{const rec=recommendedPrice(p),actual=projectFinalPrice(p);return rec>0?(rec-actual)/rec*100:0;});
  const values=projects.map(projectFinalPrice);
  return {projects,last,lastRecommended:last?recommendedPrice(last):null,lastAgreed:agreements[0]?projectFinalPrice(agreements[0]):null,averageDiscount:discounts.length?discounts.reduce((a,b)=>a+b,0)/discounts.length:null,averageValue:values.length?values.reduce((a,b)=>a+b,0)/values.length:null,totalRevenue:values.reduce((a,b)=>a+b,0)};
}
function safeRating(value){
  const rating=Number(value??0);
  return Number.isFinite(rating)?Math.min(5,Math.max(0,Math.round(rating))):0;
}
function stars(value){const rating=safeRating(value);return `<span class="customer-stars" aria-label="${rating} von 5 Sternen">${"★".repeat(rating)}${"☆".repeat(5-rating)}</span>`;}
function badges(customer){return `${customer.regular?'<span class="customer-badge regular">🤝 Stammkunde</span>':""}${customer.vip?'<span class="customer-badge vip">◆ VIP</span>':""}${customer.blocked?'<span class="customer-badge blocked">⛔ Gesperrt</span>':""}`;}
function customerAddressLine(customer){return [customer.street,[customer.postalCode,customer.city].filter(Boolean).join(" ")].filter(Boolean).join(" · ");}
export function customerAddressById(id){const customer=allCustomers().find(c=>c.id===id);return customer?[customer.companyName,customer.contactPerson,customer.street,[customer.postalCode,customer.city].filter(Boolean).join(" ")].filter(Boolean).join("\n"):"";}

function customerDanger(customer,warnings=activeWarnings(customer)){return customer.blocked||warnings.some(w=>["Problemkunde","Mahnung","Vorkasse","Rechnung"].includes(w.category));}
function projectDate(project){const value=project?.created||project?.updated;return value?new Date(value).toLocaleDateString("de-DE"):"–";}
function lastPriceLabel(stats){return stats.lastAgreed!=null?euro(stats.lastAgreed):"–";}
function renderCustomerHeader(customer,stats,warnings){
  const danger=customerDanger(customer,warnings);
  return `<header class="crm-customer-header"><div class="crm-header-top"><button type="button" class="crm-back" data-customer-close aria-label="Zurück zur Kundenübersicht">‹</button><div class="crm-customer-title"><div class="eyebrow">KUNDENAKTE</div><h2>${esc(customer.companyName)}</h2><div class="crm-customer-contact">${customer.contactPerson?`<b>${esc(customer.contactPerson)}</b>`:""}${customer.street?`<span>${esc(customer.street)}</span>`:""}${customer.postalCode||customer.city?`<span>${esc([customer.postalCode,customer.city].filter(Boolean).join(" "))}</span>`:""}</div><div class="crm-title-meta">${stars(customer.rating)}${badges(customer)}</div></div><button type="button" class="crm-icon-button" data-customer-edit aria-label="Kundenakte bearbeiten" title="Kundenakte bearbeiten">✎</button></div><div class="crm-headline-facts"><span class="${danger?"danger":"positive"}">${danger?"⚠️":"✓"} ${warnings.length?`${warnings.length} aktive${warnings.length===1?"r":""} Hinweis${warnings.length===1?"":"e"}`:"Keine aktive Warnung"}</span><span><small>Letzter Preis</small><b>${lastPriceLabel(stats)}</b></span><span><small>Letzter Auftrag</small><b>${stats.last?projectDate(stats.last):"–"}</b></span><button type="button" data-open-customer-projects><small>Projekte</small><b>${stats.projects.length}</b></button></div></header>`;
}
function renderOverviewTab(customer,stats,warnings){
  const important=warnings.slice(0,3),danger=customerDanger(customer,warnings);
  return `<div class="crm-overview-grid"><section class="crm-panel"><div class="crm-panel-heading"><h3>Status</h3><button type="button" class="crm-text-action" data-customer-edit>Bearbeiten</button></div><div class="crm-status-line">${badges(customer)||'<span class="muted">Standardkunde</span>'}</div><p><b>${esc(PAYMENT_LABELS[customer.payment.status]||PAYMENT_LABELS.unknown)}</b>${customer.payment.notes?`<br><span class="muted">${esc(customer.payment.notes)}</span>`:""}</p></section><section class="crm-panel ${danger?"crm-alert-panel":""}"><div class="crm-panel-heading"><h3>Wichtigste Hinweise</h3><button type="button" class="crm-text-action" data-warning-add>＋ Hinweis</button></div>${important.length?important.map(w=>`<div class="crm-alert-line"><b>${esc(w.title)}</b>${w.description?`<span>${esc(w.description)}</span>`:""}</div>`).join(""):'<p class="crm-positive-note">✓ Keine aktiven Warnhinweise</p>'}</section><section class="crm-panel"><h3>Letzte Preisvereinbarung</h3><strong class="crm-key-value">${lastPriceLabel(stats)}</strong><p class="muted">${stats.lastRecommended!=null?`Empfehlung: ${euro(stats.lastRecommended)}`:"Noch keine Preisvereinbarung"}</p></section><section class="crm-panel"><h3>Letztes Projekt</h3>${stats.last?`<strong class="crm-key-value">${esc(stats.last.title||"Unbenanntes Projekt")}</strong><p class="muted">${projectDate(stats.last)} · ${esc(statusLabel(stats.last.status))}</p><button type="button" class="crm-text-action" data-open-project="${esc(stats.last.id)}">Projekt öffnen →</button>`:'<p class="muted">Noch kein Kundenprojekt.</p>'}</section></div>`;
}
function renderProjectsTab(stats){return `<section class="crm-panel crm-project-panel"><div class="crm-panel-heading"><div><h3>Projekte</h3><p class="muted">${stats.projects.length} zugeordnete Projekte · ${euro(stats.totalRevenue)} Umsatz</p></div><button type="button" class="crm-text-action" data-open-customer-projects>Alle filtern</button></div><div class="crm-project-list">${stats.projects.length?stats.projects.map(p=>{const recommended=recommendedPrice(p),agreed=projectFinalPrice(p),difference=agreed-recommended,differencePercent=recommended?difference/recommended*100:0,material=p.materialName||p.estimatorData?.materialName||p.fields?.matMain||"–";return `<article class="crm-project-card">${(p.images||[])[0]?`<img src="${p.images[0]}" alt="">`:""}<div class="crm-project-copy"><b>${esc(p.title||"Unbenanntes Projekt")}</b><small>${projectDate(p)} · ${esc(statusLabel(p.status))}</small><span>${esc(material)} · ${esc(p.machineName||"–")}</span><span>Empfohlen ${euro(recommended)} · Vereinbart ${euro(agreed)}</span><span class="${difference<0?"negative":"positive"}">${difference>=0?"+":""}${euro(difference)} (${differencePercent.toLocaleString("de-DE",{maximumFractionDigits:1})} %)</span>${p.agreementPriceNote?`<small>${esc(p.agreementPriceNote)}</small>`:""}</div><button type="button" class="secondary small" data-open-project="${esc(p.id)}">Projekt öffnen</button></article>`;}).join(""):'<p class="muted">Noch keine zugeordneten Kundenprojekte.</p>'}</div></section>`;}
function renderPricesTab(customer,stats){return `<section class="crm-panel"><div class="crm-panel-heading"><div><h3>Preise &amp; Kennzahlen</h3><p class="muted">Nur Information – keine automatische Übernahme.</p></div><button type="button" class="crm-text-action" data-customer-edit>Bearbeiten</button></div><dl class="crm-price-list"><div><dt>Standardrabatt</dt><dd>${customer.standardDiscount.value?`${customer.standardDiscount.value.toLocaleString("de-DE")} ${customer.standardDiscount.type==="percent"?"%":"€"}`:"–"}</dd></div><div><dt>Individuelle Mindestpauschale</dt><dd>${customer.minimumFee!=null?euro(customer.minimumFee):"–"}</dd></div><div><dt>Letzte Empfehlung</dt><dd>${stats.lastRecommended!=null?euro(stats.lastRecommended):"–"}</dd></div><div><dt>Letzter vereinbarter Preis</dt><dd>${lastPriceLabel(stats)}</dd></div><div><dt>Ø gewährter Nachlass</dt><dd>${stats.averageDiscount!=null?`${stats.averageDiscount.toLocaleString("de-DE",{maximumFractionDigits:1})} %`:"–"}</dd></div><div><dt>Ø Projektwert</dt><dd>${stats.averageValue!=null?euro(stats.averageValue):"–"}</dd></div><div><dt>Gesamtumsatz</dt><dd>${euro(stats.totalRevenue)}</dd></div><div><dt>Preisbegründung</dt><dd>${esc(REASON_LABELS[customer.priceReason]||"Sonstiges")}${customer.priceReasonText?` – ${esc(customer.priceReasonText)}`:""}</dd></div></dl></section>`;}
function renderNotesTab(customer){return `<div class="crm-notes-stack"><section class="crm-panel"><div class="crm-panel-heading"><h3>Warnhinweise</h3><button type="button" class="crm-text-action" data-warning-add>＋ Hinzufügen</button></div>${customer.warnings.length?customer.warnings.map(w=>`<article class="warning-row ${w.active===false?"inactive":""}"><div><b>${esc(w.title)}</b><small>${esc(w.category)} · ${dateTime(w.createdAt)} · ${w.active===false?"Inaktiv":"Aktiv"}</small><p>${esc(w.description)}</p></div><button type="button" class="secondary small" data-warning-toggle="${esc(w.id)}">${w.active===false?"Aktivieren":"Deaktivieren"}</button></article>`).join(""):'<p class="muted">Keine Warnhinweise.</p>'}</section><section class="crm-panel"><div class="crm-panel-heading"><h3>Interne Notizen</h3><button type="button" class="crm-text-action" data-note-add>＋ Notiz</button></div>${customer.notes.length?customer.notes.map(n=>`<article class="note-row"><small>${dateTime(n.createdAt)}</small><p>${esc(n.text)}</p></article>`).join(""):'<p class="muted">Keine Notizen.</p>'}</section><section class="crm-panel"><div class="crm-panel-heading"><h3>Zahlungsverhalten</h3><button type="button" class="crm-text-action" data-payment-edit>Bearbeiten</button></div><strong>${esc(PAYMENT_LABELS[customer.payment.status]||PAYMENT_LABELS.unknown)}</strong><p>${esc(customer.payment.notes||"Keine ergänzende Notiz.")}</p></section></div>`;}
function renderTimelineTab(timeline){return `<section class="crm-panel"><div class="crm-panel-heading"><div><h3>Chronik</h3><p class="muted">Neueste Einträge zuerst</p></div><button type="button" class="crm-text-action" data-timeline-add>＋ Eintrag</button></div><div class="crm-timeline">${timeline.length?timeline.map(t=>`<article class="timeline-row"><i></i><div><b>${esc(t.title)}</b><small>${dateTime(t.createdAt)}</small>${t.description?`<p>${esc(t.description)}</p>`:""}</div></article>`).join(""):'<p class="muted">Noch keine Ereignisse.</p>'}</div></section>`;}

export function customerNameById(id){return allCustomers().find(c=>c.id===id)?.companyName||"";}
export function renderCustomerSummary(customerId){
  const host=$("customerCrmSummary");if(!host)return;
  const customer=allCustomers().find(c=>c.id===customerId);
  if(!customer){host.classList.add("hidden");host.innerHTML="";return;}
  const prices=priceStats(customer),warnings=activeWarnings(customer),danger=customer.blocked||warnings.some(w=>["Problemkunde","Mahnung","Vorkasse"].includes(w.category));
  host.className=`customer-project-summary ${danger?"danger":""}`;
  host.innerHTML=`<div><strong>${esc(customer.companyName)}</strong>${stars(customer.rating)}</div><div class="customer-badges">${badges(customer)}</div>${prices.last?`<p>Letzter Auftrag: <b>${new Date(prices.last.created||prices.last.updated).toLocaleDateString("de-DE")}</b></p>`:""}${prices.lastAgreed!=null?`<p>Letzter vereinbarter Preis: <b>${euro(prices.lastAgreed)}</b></p><button type="button" class="secondary small" data-use-last-price>Letzten vereinbarten Preis übernehmen</button>`:""}${warnings.length?`<div><b>${danger?"⚠️ Achtung":"Hinweise"}</b><ul>${warnings.slice(0,3).map(w=>`<li>${esc(w.title)}</li>`).join("")}</ul></div>`:""}${customer.payment.status!=="unknown"?`<p><b>Empfehlung:</b> ${esc(PAYMENT_LABELS[customer.payment.status])}${customer.payment.notes?` – ${esc(customer.payment.notes)}`:""}</p>`:""}<small>Nur Entscheidungshilfe – keine automatische Preisübernahme.</small>`;
  host.querySelector("[data-use-last-price]")?.addEventListener("click",()=>{const input=$("agreementPrice");if(input){input.value=prices.lastAgreed;input.dispatchEvent(new Event("input",{bubbles:true}));}});
  host.classList.remove("hidden");
}

function renderList(){
  const box=$("customerList");if(!box)return;
  const term=key($("customerSearch")?.value),filter=$("customerFilter")?.value||"all";
  const rows=allCustomers().filter(c=>{const warnings=activeWarnings(c);const hay=key([c.companyName,c.contactPerson,c.street,c.postalCode,c.city,c.email,c.phone,c.priceReasonText,c.payment.notes,...warnings.flatMap(w=>[w.title,w.description,w.category]),...(c.notes||[]).map(n=>n.text),...(c.timeline||[]).flatMap(t=>[t.title,t.description])].join(" "));const matches=!term||hay.includes(term);const filtered=filter==="all"||(filter==="regular"&&c.regular)||(filter==="vip"&&c.vip)||(filter==="warning"&&warnings.length)||(filter==="problem"&&(c.blocked||warnings.some(w=>w.category==="Problemkunde")||c.payment.status==="problematic"));return matches&&filtered;}).sort((a,b)=>a.companyName.localeCompare(b.companyName,"de"));
  box.innerHTML=rows.length?rows.map(c=>{const stats=priceStats(c),warning=activeWarnings(c).length;return `<article class="customer-row card"><button type="button" class="customer-row-open" data-customer-id="${esc(c.id)}"><div class="customer-row-main"><strong>${esc(c.companyName)}</strong><small>${esc(c.contactPerson||"Kein Ansprechpartner")}</small>${customerAddressLine(c)?`<small class="customer-list-address">${esc(customerAddressLine(c))}</small>`:""}<span class="customer-list-alerts">${c.blocked?'<b class="customer-list-blocked">⛔ Gesperrt</b>':""}${warning?`<b class="customer-list-warning">⚠ ${warning} Warnhinweis${warning===1?"":"e"}</b>`:'<span class="customer-list-clear">✓ Keine Warnungen</span>'}</span></div><div class="customer-list-rating">${stars(c.rating)}${badges(c)}</div><b class="customer-project-count-inline">${stats.projects.length} Projekt${stats.projects.length===1?"":"e"}</b></button><button type="button" class="customer-project-count" data-customer-projects="${esc(c.id)}" title="Zugehörige Projekte öffnen">${stats.projects.length}</button></article>`;}).join(""):`<div class="empty-state">Keine passende Kundenakte.</div>`;
  box.querySelectorAll("[data-customer-id]").forEach(btn=>btn.onclick=()=>{selectedCustomerId=btn.dataset.customerId;activeCustomerTab="overview";renderDetail();});
  box.querySelectorAll("[data-customer-projects]").forEach(btn=>btn.onclick=()=>openCustomerProjects(btn.dataset.customerProjects));
}

function renderDetail(){
  const customer=allCustomers().find(c=>c.id===selectedCustomerId),box=$("customerDetail");if(!box)return;
  if(!customer){box.classList.add("hidden");return;}const stats=priceStats(customer),warnings=activeWarnings(customer),timeline=[...(customer.timeline||[]),...derivedTimeline(customer)].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  const tabs=[['overview','Übersicht'],['projects','Projekte'],['prices','Preise'],['notes','Notizen'],['timeline','Chronik']];
  const content={overview:()=>renderOverviewTab(customer,stats,warnings),projects:()=>renderProjectsTab(stats),prices:()=>renderPricesTab(customer,stats),notes:()=>renderNotesTab(customer),timeline:()=>renderTimelineTab(timeline)};
  if(!content[activeCustomerTab])activeCustomerTab="overview";
  box.innerHTML=`${renderCustomerHeader(customer,stats,warnings)}<nav class="crm-tabs" role="tablist" aria-label="Bereiche der Kundenakte">${tabs.map(([id,label])=>`<button type="button" role="tab" aria-selected="${activeCustomerTab===id}" class="${activeCustomerTab===id?"active":""}" data-customer-tab="${id}">${label}</button>`).join("")}</nav><div class="crm-tab-content" role="tabpanel">${content[activeCustomerTab]()}</div>`;
  box.classList.remove("hidden");$("customerList").classList.add("hidden");$("customerDetail").scrollIntoView({block:"start"});bindDetail(customer);
}

async function editCustomer(customer){
  const editingCustomerId=customer?.id??null;
  let savedCustomer=null;
  const result=await appForm({title:customer?"Kundenakte bearbeiten":"Kundenakte anlegen",fields:[{name:"companyName",label:"Firmenname / Kundenname",value:customer?.companyName||""},{name:"contactPerson",label:"Ansprechpartner",value:customer?.contactPerson||""},{name:"street",label:"Straße + Hausnummer",value:customer?.street||""},{name:"postalCode",label:"PLZ",value:customer?.postalCode||"",inputmode:"numeric"},{name:"city",label:"Ort",value:customer?.city||""},{name:"phone",label:"Telefon",value:customer?.phone||""},{name:"email",label:"E-Mail",value:customer?.email||""},{name:"rating",label:"Bewertung",type:"select",value:String(safeRating(customer?.rating)),options:[0,1,2,3,4,5].map(x=>({value:String(x),label:x===0?"0 Sterne – keine Bewertung":`${x} Stern${x===1?"":"e"}`}))},{name:"regular",label:"Stammkunde",type:"checkbox",value:customer?.regular},{name:"vip",label:"VIP",type:"checkbox",value:customer?.vip},{name:"blocked",label:"Gesperrt",type:"checkbox",value:customer?.blocked},{name:"discountType",label:"Standardrabatt als",type:"select",value:customer?.standardDiscount?.type||"percent",options:[{value:"percent",label:"Prozent"},{value:"amount",label:"Euro"}]},{name:"discountValue",label:"Standardrabatt",value:customer?.standardDiscount?.value||"",inputmode:"decimal"},{name:"minimumFee",label:"Individuelle Mindestpauschale (€)",value:customer?.minimumFee??"",inputmode:"decimal"},{name:"priceReason",label:"Preisbegründung",type:"select",value:customer?.priceReason||"regular",options:Object.entries(REASON_LABELS).map(([value,label])=>({value,label}))},{name:"priceReasonText",label:"Ergänzende Begründung",type:"textarea",value:customer?.priceReasonText||"",rows:3}],acceptText:"Speichern",validate:v=>!v.companyName.trim()?"Bitte einen Kunden- oder Firmennamen eingeben.":allCustomers().some(c=>c.id!==editingCustomerId&&key(c.companyName)===key(v.companyName))?"Für diesen Kunden- oder Firmennamen existiert bereits eine Kundenakte.":"",onSubmit:async formValues=>{
    const rating=safeRating(formValues.rating);
    const updates={companyName:formValues.companyName.trim(),contactPerson:formValues.contactPerson.trim(),street:formValues.street.trim(),postalCode:formValues.postalCode.trim(),city:formValues.city.trim(),phone:formValues.phone.trim(),email:formValues.email.trim(),rating,regular:Boolean(formValues.regular),vip:Boolean(formValues.vip),blocked:Boolean(formValues.blocked),standardDiscount:{type:formValues.discountType,value:num(formValues.discountValue)},minimumFee:formValues.minimumFee===""?null:num(formValues.minimumFee),priceReason:formValues.priceReason,priceReasonText:formValues.priceReasonText.trim(),updatedAt:now()};
    console.log("Kunden-ID:",editingCustomerId);
    console.log("Formularwerte:",formValues);
    console.log("Bewertung:",formValues.rating);
    console.log("Gesperrt:",formValues.blocked);
    if(editingCustomerId){
      const customerIndex=state.customers.findIndex(item=>String(item.id)===String(editingCustomerId));
      if(customerIndex===-1)throw new Error("Zu bearbeitender Kunde wurde nicht gefunden.");
      const existingCustomer=normalizeCustomer(state.customers[customerIndex]);
      savedCustomer={...existingCustomer,...updates,id:existingCustomer.id};
      addTimeline(savedCustomer,"system","Kundendaten oder Preisinfo geändert");
      state.customers[customerIndex]=savedCustomer;
    }else{
      savedCustomer={...normalizeCustomer({}),...updates};
      addTimeline(savedCustomer,"system","Kundenakte erstellt");
      state.customers.unshift(savedCustomer);
    }
    selectedCustomerId=savedCustomer.id;
    save();
    try{
      const data=await flushCloudSave();
      console.log("Supabase-Ergebnis:",data);
      console.log("Supabase-Fehler:",null);
    }catch(error){
      console.log("Supabase-Ergebnis:",null);
      console.log("Supabase-Fehler:",error);
      throw new Error(`Kunde konnte nicht gespeichert werden: ${error?.message||"Unbekannter Fehler"}`);
    }
  }});
  if(!result)return null;
  renderCustomers();
  renderDetail();
  await appAlert("Die Kundenakte wurde erfolgreich gespeichert.","Gespeichert");
  return savedCustomer;
}

function bindDetail(customer){
  $("customerDetail").querySelector("[data-customer-close]").onclick=()=>{selectedCustomerId=null;$("customerDetail").classList.add("hidden");$("customerList").classList.remove("hidden");renderList();};
  $("customerDetail").querySelectorAll("[data-customer-tab]").forEach(btn=>btn.onclick=()=>{activeCustomerTab=btn.dataset.customerTab;renderDetail();});
  $("customerDetail").querySelectorAll("[data-customer-edit]").forEach(btn=>btn.onclick=()=>editCustomer(customer));
  $("customerDetail").querySelectorAll("[data-warning-add]").forEach(btn=>btn.onclick=async()=>{const r=await appForm({title:"Warnhinweis erstellen",fields:[{name:"title",label:"Titel"},{name:"category",label:"Kategorie",type:"select",options:WARNING_CATEGORIES.map(value=>({value,label:value}))},{name:"description",label:"Beschreibung",type:"textarea",rows:4}],acceptText:"Speichern",validate:v=>!v.title.trim()?"Bitte einen Titel eingeben.":""});if(r){customer.warnings.unshift({id:uid(),title:r.title.trim(),category:r.category,description:r.description.trim(),active:true,createdAt:now()});addTimeline(customer,"warning","Warnhinweis erstellt",r.title.trim());save();renderDetail();}});
  $("customerDetail").querySelectorAll("[data-warning-toggle]").forEach(btn=>btn.onclick=()=>{const w=customer.warnings.find(x=>x.id===btn.dataset.warningToggle);if(w){w.active=!w.active;save();renderDetail();}});
  $("customerDetail").querySelector("[data-note-add]")?.addEventListener("click",async()=>{const r=await appForm({title:"Interne Notiz",fields:[{name:"text",label:"Notiz",type:"textarea",rows:5}],acceptText:"Speichern",validate:v=>!v.text.trim()?"Bitte eine Notiz eingeben.":""});if(r){customer.notes.unshift({id:uid(),text:r.text.trim(),createdAt:now()});addTimeline(customer,"note","Notiz erstellt");save();renderDetail();}});
  $("customerDetail").querySelector("[data-timeline-add]")?.addEventListener("click",async()=>{const r=await appForm({title:"Chronikeintrag",fields:[{name:"title",label:"Titel"},{name:"description",label:"Beschreibung",type:"textarea",rows:4}],acceptText:"Eintragen",validate:v=>!v.title.trim()?"Bitte einen Titel eingeben.":""});if(r){addTimeline(customer,"manual",r.title.trim(),r.description.trim());save();renderDetail();}});
  $("customerDetail").querySelector("[data-payment-edit]")?.addEventListener("click",async()=>{const r=await appForm({title:"Zahlungsverhalten",fields:[{name:"status",label:"Merkmal",type:"select",value:customer.payment.status,options:Object.entries(PAYMENT_LABELS).map(([value,label])=>({value,label}))},{name:"notes",label:"Ergänzende Beschreibung",type:"textarea",value:customer.payment.notes,rows:4}],acceptText:"Speichern"});if(r){customer.payment={status:r.status,notes:r.notes.trim()};addTimeline(customer,"payment","Zahlungsverhalten geändert",PAYMENT_LABELS[r.status]);save();renderDetail();}});
  $("customerDetail").querySelectorAll("[data-open-customer-projects]").forEach(btn=>btn.onclick=()=>openCustomerProjects(customer.id));
  $("customerDetail").querySelectorAll("[data-open-project]").forEach(btn=>btn.onclick=()=>document.dispatchEvent(new CustomEvent("dla:view-project",{detail:{projectId:btn.dataset.openProject}})));
}

function openCustomerProjects(customerId){
  document.querySelector('[data-screen="projects"]')?.click();
  const filter=$("projectCustomerFilter");if(filter)filter.value=customerId;
  document.dispatchEvent(new CustomEvent("dla:filter-projects-by-customer",{detail:{customerId}}));
}

export function renderCustomers(){renderList();if(selectedCustomerId)renderDetail();}
export function initializeCustomers(){
  if($("customerAddBtn"))$("customerAddBtn").onclick=()=>editCustomer(null);
  if($("customerSearch"))$("customerSearch").oninput=renderList;
  if($("customerFilter"))$("customerFilter").onchange=renderList;
  const select=$("projectCustomerId");if(select){const refresh=()=>{const customers=allCustomers().sort((a,b)=>a.companyName.localeCompare(b.companyName,"de")),value=select.value;select.innerHTML=`<option value="">Kein Kunde</option>${customers.map(c=>`<option value="${esc(c.id)}">${esc(c.companyName)}</option>`).join("")}<option value="__new__">＋ Neuen Kunden anlegen</option>`;select.value=customers.some(c=>c.id===value)?value:"";const filter=$("projectCustomerFilter");if(filter){const filterValue=filter.value;filter.innerHTML=`<option value="all">Alle Kunden</option><option value="none">Ohne Kundenzuordnung</option>${customers.map(c=>`<option value="${esc(c.id)}">${esc(c.companyName)}</option>`).join("")}`;filter.value=customers.some(c=>c.id===filterValue)||["all","none"].includes(filterValue)?filterValue:"all";}const design=$("designCustomerId");if(design){const designValue=design.value;design.innerHTML=`<option value="">Kein Kunde<\/option>${customers.map(c=>`<option value="${esc(c.id)}">${esc(c.companyName)}<\/option>`).join("")}<option value="__new__">＋ Neuen Kunden anlegen<\/option>`;design.value=customers.some(c=>c.id===designValue)?designValue:"";}renderCustomerSummary(select.value);};const host=document.createElement("section");host.id="customerCrmSummary";host.className="customer-project-summary hidden";select.closest(".card")?.prepend(host);select.addEventListener("change",async()=>{if(select.value==="__new__"){const customer=await editCustomer(null);refresh();if(customer){select.value=customer.id;renderCustomerSummary(customer.id);}}else renderCustomerSummary(select.value);});refresh();document.addEventListener("dla:state-saved",refresh);}
  const designSelect=$("designCustomerId");if(designSelect)designSelect.addEventListener("change",async()=>{if(designSelect.value==="__new__"){const customer=await editCustomer(null);if(customer)designSelect.value=customer.id;else designSelect.value="";}});
  document.addEventListener("dla:customers-opened",renderCustomers);
  document.addEventListener("dla:state-loaded",renderCustomers);
}
