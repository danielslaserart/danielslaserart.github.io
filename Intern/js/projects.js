import { $, num, euro, uid, esc, compressProjectImage } from "./utils.js?v=6.5";
import { state, save, getRealProjects, getReferenceProjects } from "./storage.js?v=6.5";
import { loadCalculatorData, updateHome, createTemplateFromProject, startNewOrder } from "./ui.js?v=6.5";
import { resolveMaterialSelection } from "./materials.js?v=6.5";
import { workshopUnit } from "./calculator.js?v=6.5";
import { deleteLearningRecord, saveLearningRecord } from "./learning.js?v=6.5";
import { appAlert, appConfirm, appForm } from "./dialogs.js?v=6.5";
import { priceAgreementHtml, bindPriceAgreementActions } from "./customer-price-history.js?v=6.5.1";
import { projectFieldLabel, formatProjectFieldValue, isEmptyProjectValue, getCostCoveringMinimumPrice } from "./project-detail-formatting.js?v=6.5";
import { getPriceLadderData, renderPriceLadder } from "./price-ladder.js?v=6.5.1";
import { renderWorkshopAnalysis } from "./workshop-analysis.js?v=6.5";
import { OFFER_PDF_TEMPLATE, createOfferPdf, downloadOfferPdf, offerPdfFilename } from "./offer-pdf.js?v=6.5";
import { customerNameById, customerAddressById } from "./customers.js?v=6.5";
import { renderProjectPositions, bindProjectPositions, deductPositionStock, positionTotals } from "./project-positions.js?v=6.5.4";
function existingCustomer(project){
  const id=project?.customerId?String(project.customerId):null;
  return id?(state.customers||[]).find(customer=>String(customer.id)===id)||null:null;
}
export function filterProjectsByCustomer(projects,selectedCustomerId){
  if(!selectedCustomerId||selectedCustomerId==='all')return projects;
  if(selectedCustomerId==='none'||selectedCustomerId==='unassigned')return projects.filter(project=>!existingCustomer(project));
  return projects.filter(project=>String(project?.customerId||'')===String(selectedCustomerId));
}
function safeDate(value){const date=new Date(value||0);return Number.isNaN(date.getTime())?'Datum unbekannt':date.toLocaleDateString('de-DE');}
function projectTimestamp(project,field){const date=new Date(project?.[field]||project?.created||0);return Number.isNaN(date.getTime())?0:date.getTime();}
function projectStatusLabel(status){
  return ({offer:"Angebot",progress:"In Arbeit",waiting:"Wartet",done:"Fertig",billed:"Abgerechnet",open:"Angebot",payment:"Wartet"})[status]||"Angebot";
}
function projectStatusClass(status){return `status-${["offer","progress","waiting","done","billed"].includes(status)?status:"offer"}`;}
function orderTypeLabel(type){return ({own:"Eigenes Produkt",customerObject:"Kundenobjekt",service:"Dienstleistung",design:"🖥️ Design"})[type]||"Eigenes Produkt";}
function priceTypeLabel(type,isPreferred=false){
  const normalized=type||(isPreferred?"regularCustomer":"normal");
  return ({normal:"Normaler Kundenpreis",regularCustomer:"Stammkunde",special:"Sonderpreis",promotion:"Aktionspreis",repeatOrder:"Folgebestellungspreis",other:"Sonstiger Preis"})[normalized]||normalized;
}
export function renderPriceTypeBadge(priceType,isPreferred=false){
  return `<span class="project-price-type">★ ${esc(priceTypeLabel(priceType,isPreferred))}</span>`;
}
export function renderProjectPriceBlock(project){
  const hasAgreement=project.agreementPrice!=null;
  return `<div class="project-price-block"><strong>${euro(project.sale)}</strong><span class="project-agreed-price">Vereinbart: ${hasAgreement?euro(project.agreementPrice):"Nicht festgelegt"}</span>${hasAgreement?renderPriceTypeBadge(project.priceType,project.isPreferredRepeatPrice):""}</div>`;
}
export function renderProjects(){
  const realProjects=getRealProjects();
  const term=($('projectSearch')?.value||'').trim().toLowerCase();
  const filter=$('projectStatusFilter')?.value||'all';
  const customerFilter=$('projectCustomerFilter')?.value||'all';
  const sort=$('projectSort')?.value||'updated';
  const customerFiltered=filterProjectsByCustomer(realProjects,customerFilter);
  const list=customerFiltered.filter(p=>{
    const customerName=customerNameById(p.customerId)||p.customerName||p.customer||'';
    const tags=Array.isArray(p.tags)?p.tags:[];
    const matchesText=!term||`${p.title||p.projectName||p.name||''} ${customerName} ${p.type||''} ${p.machineName||''} ${p.notes||''} ${tags.join(' ')}`.toLowerCase().includes(term);
    const matchesStatus=filter==='all'||(p.status||'offer')===filter;
    return matchesText&&matchesStatus;
  }).sort((a,b)=>{
    if(Boolean(a.pinned)!==Boolean(b.pinned))return a.pinned?-1:1;
    if(sort==='name')return String(a.title||'').localeCompare(String(b.title||''),'de');
    if(sort==='customer')return customerNameById(a.customerId).localeCompare(customerNameById(b.customerId),'de');
    if(sort==='price')return num(b.sale)-num(a.sale);
    if(sort==='created')return projectTimestamp(b,'created')-projectTimestamp(a,'created');
    return projectTimestamp(b,'updated')-projectTimestamp(a,'updated');
  });
  const totalProfit=realProjects.reduce((sum,p)=>sum+num(p.sale)-num(p.cost),0);
  if($('projectStatCount'))$('projectStatCount').textContent=realProjects.length;
  if($('projectStatProfit'))$('projectStatProfit').textContent=euro(totalProfit);
  if($('projectStatAverage'))$('projectStatAverage').textContent=realProjects.length?euro(realProjects.reduce((sum,p)=>sum+num(p.sale),0)/realProjects.length):euro(0);
  const renderProjectCard=p=>{
    try{
      const title=p.title||p.projectName||p.name||'Unbenanntes Projekt';
      const customer=existingCustomer(p);
      const legacyCustomerHint=p.customerName||p.customer||'';
      const customerLabel=customer?.companyName||(p.customerId?'Kunde nicht mehr vorhanden':'Ohne Kundenzuordnung');
      const hint=!customer&&legacyCustomerHint?` · Hinweis: ${esc(legacyCustomerHint)}`:'';
      const images=Array.isArray(p.images)?p.images:[];
      const tags=Array.isArray(p.tags)?p.tags:[];
      return `
    <article class="card project-item" data-project-card="${p.id}">
      ${images[0]?`<button class="project-thumb" type="button" data-view-project="${p.id}" aria-label="Projekt ansehen"><img src="${esc(images[0])}" alt=""></button>`:''}
      <div class="item-top"><div class="project-card-copy"><div class="item-title">${p.pinned?"📌 ":""}${esc(title)}</div><div class="item-meta">${esc(customerLabel)}${hint}${p.machineName?' · '+esc(p.machineName):''} · ${safeDate(p.created||p.createdAt)}</div></div>${renderProjectPriceBlock(p)}</div>
      <div class="project-status-row"><span class="order-badge ${p.orderType||"own"}">${orderTypeLabel(p.orderType)}</span><span class="project-status ${projectStatusClass(p.status)}">${projectStatusLabel(p.status)}</span></div>
      ${p.notes?`<div class="project-notes project-note-short">${esc(p.notes)}</div>`:''}
      <div class="item-actions project-actions"><button type="button" data-view-project="${p.id}" class="primary">Ansehen</button><button type="button" data-edit-project="${p.id}">Bearbeiten</button><details class="project-more-actions"><summary>Mehr Aktionen</summary><div>${p.estimatorData?`<button type="button" data-reference-project="${p.id}">Als Lerndaten nutzen</button>`:""}<button type="button" data-pin-project="${p.id}">${p.pinned?"Lösen":"Anheften"}</button><button type="button" data-template-project="${p.id}">Als Vorlage</button><button type="button" data-duplicate-project="${p.id}">Duplizieren</button><button type="button" data-del-project="${p.id}" class="danger">Löschen</button></div></details></div>
    </article>`;
    }catch(error){
      console.error('Projektkarte konnte nur vereinfacht angezeigt werden:',p?.id,error);
      return `<article class="card project-item"><div class="item-title">${esc(p?.title||p?.projectName||p?.name||'Unbenanntes Projekt')}</div><div class="item-meta">Unvollständiger älterer Datensatz · Ohne Kundenzuordnung</div></article>`;
    }
  };
  $('projectList').innerHTML=list.length?list.map(renderProjectCard).join(''):`<div class="empty-state">Keine passenden Projekte gefunden.</div>`;
  document.querySelectorAll('[data-view-project]').forEach(b=>b.onclick=e=>{e.stopPropagation();viewProject(b.dataset.viewProject)});
  document.querySelectorAll('[data-project-card]').forEach(card=>card.onclick=e=>{if(!e.target.closest('button, details, summary'))viewProject(card.dataset.projectCard)});
  document.querySelectorAll('[data-edit-project]').forEach(b=>b.onclick=e=>{e.stopPropagation();const p=realProjects.find(x=>x.id===b.dataset.editProject);if(p?.orderType==="design"||p?.projectType==="design")document.dispatchEvent(new CustomEvent("dla:load-design",{detail:{project:p,duplicate:false}}));else loadProject(b.dataset.editProject,false)});
  document.querySelectorAll('[data-duplicate-project]').forEach(b=>b.onclick=e=>{e.stopPropagation();const p=realProjects.find(x=>x.id===b.dataset.duplicateProject);if(p?.orderType==="design"||p?.projectType==="design")document.dispatchEvent(new CustomEvent("dla:load-design",{detail:{project:p,duplicate:true}}));else loadProject(b.dataset.duplicateProject,true)});
  document.querySelectorAll('[data-pin-project]').forEach(b=>b.onclick=e=>{e.stopPropagation();const p=realProjects.find(x=>x.id===b.dataset.pinProject);if(p){p.pinned=!p.pinned;p.updated=new Date().toISOString();save();renderProjects();}});
  document.querySelectorAll('[data-template-project]').forEach(b=>b.onclick=e=>{e.stopPropagation();createTemplateFromProject(b.dataset.templateProject)});
  document.querySelectorAll('[data-reference-project]').forEach(b=>b.onclick=async e=>{e.stopPropagation();const p=realProjects.find(x=>x.id===b.dataset.referenceProject);if(p?.estimatorData){saveLearningRecord({...p.estimatorData,projectId:p.id,title:p.title,estimatedPrice:p.estimatedPrice,actualPrice:p.actualPrice,reference:true});await appAlert('Das Kundenprojekt bleibt in der Projektübersicht. Eine getrennte Lernreferenz wurde aktualisiert.');renderProjects();}});
  document.querySelectorAll('[data-del-project]').forEach(b=>b.onclick=async e=>{e.stopPropagation();if(await appConfirm('Projekt löschen?',"Projekt löschen","Löschen")){state.projects=state.projects.filter(p=>p.id!==b.dataset.delProject);save();renderProjects();updateHome()}});
  renderStatisticsCharts();
  renderCustomerObjectStatistics();
  renderWorkshopAnalysis();
  document.dispatchEvent(new CustomEvent("dla:projects-rendered"));
}
function renderCustomerObjectStatistics(){
  const box=$("customerObjectStatistics");if(!box)return;
  const rows=getRealProjects().filter(p=>p.orderType==="customerObject");
  const avg=fn=>rows.length?rows.reduce((sum,p)=>sum+num(fn(p)),0)/rows.length:0;
  const knownEngravingTimes=rows.map(p=>p.actualEngravingTime).filter(value=>value!=null);
  const materials=new Map();rows.forEach(p=>{const name=p.objectMaterial||p.estimatorData?.materialName||"Nicht angegeben";materials.set(name,(materials.get(name)||0)+1)});
  const popular=[...materials.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0]||"–";
  box.innerHTML=`<div class="card stat"><span>Anzahl bearbeiteter Kundenobjekte</span><strong>${rows.length}</strong></div><div class="card stat"><span>Ø Preis</span><strong>${euro(avg(p=>p.actualPrice??p.sale))}</strong></div><div class="card stat"><span>Ø Gravurzeit</span><strong>${knownEngravingTimes.length?(knownEngravingTimes.reduce((sum,value)=>sum+num(value),0)/knownEngravingTimes.length).toLocaleString("de-DE",{maximumFractionDigits:1})+" Min.":"–"}</strong></div><div class="card stat"><span>Gewinn</span><strong>${euro(rows.reduce((sum,p)=>sum+num(p.sale)-num(p.cost),0))}</strong></div><div class="card stat"><span>Beliebtestes Objektmaterial</span><strong>${esc(popular)}</strong></div><div class="card stat"><span>Ø Risikoaufschlag</span><strong>${euro(avg(p=>p.riskSurcharge))}</strong></div>`;
}
export function renderReferenceProjects(){
  const box=$('referenceProjectList');if(!box)return;
  const embedded=getReferenceProjects();
  const learning=(state.learningRecords||[]).filter(r=>!embedded.some(p=>p.id===r.projectId));
  const refs=[...learning.map(r=>({...r,source:"learning"})),...embedded.map(p=>({...p,source:"legacy"}))];
  box.innerHTML=refs.length?refs.map(r=>`<article class="card reference-item">
    ${r.image?`<img class="reference-thumb" src="${r.image}" alt="${esc(r.title||"Referenzprojekt")}">`:`<div class="reference-thumb reference-placeholder" aria-hidden="true">▣</div>`}
    <div class="reference-card-body">
      <h3>${esc(r.title||r.materialName||"Referenzdatensatz")}</h3>
      <span class="order-badge ${r.orderType||"own"}">${orderTypeLabel(r.orderType)}</span>
      <div class="reference-summary">
        <div><span>Material</span><strong>${esc(r.materialName||"–")}</strong></div>
        <div><span>Maschine</span><strong>${esc(r.machineName||"–")}</strong></div>
        <div><span>Bearbeitung</span><strong>${processLabel(r.process)}</strong></div>
        <div><span>Maße</span><strong>${num(r.width)} × ${num(r.height)} cm</strong></div>
        <div><span>Geschätzt</span><strong>${euro(r.estimatedPrice)}</strong></div>
        <div><span>Tatsächlich</span><strong>${r.actualPrice==null?"Unbekannt":euro(r.actualPrice)}</strong></div>
      </div>
      <div class="reference-learning-status ${r.reference===false?"is-excluded":""}">${r.reference===false?"Vom Lernen ausgeschlossen":"Lernstatus aktiv"}</div>
      <div class="item-actions reference-card-actions"><button class="primary" data-view-reference="${r.source}:${r.id}">Ansehen</button><button data-edit-reference="${r.source}:${r.id}">Bearbeiten</button></div>
    </div>
    <div class="reference-secondary-actions hidden">
      <button data-duplicate-reference="${r.source}:${r.id}">Duplizieren</button><button data-convert-reference="${r.source}:${r.id}">Als echtes Projekt übernehmen</button><button data-toggle-reference="${r.source}:${r.id}">${r.reference===false?"Für Lernsystem verwenden":"Vom Lernsystem ausschließen"}</button><button class="danger" data-delete-reference="${r.source}:${r.id}">Löschen</button>
    </div>
  </article>`).join(""):'<div class="empty-state">Noch keine Referenzprojekte oder Lerndaten gespeichert.</div>';
  box.querySelectorAll('[data-view-reference]').forEach(b=>b.onclick=()=>viewReferenceProject(b.dataset.viewReference));
  box.querySelectorAll('[data-edit-reference]').forEach(b=>b.onclick=async()=>{
    const [source,id]=b.dataset.editReference.split(":");
    const r=source==="learning"?(state.learningRecords||[]).find(x=>x.id===id):getReferenceProjects().find(x=>x.id===id);if(!r)return;
    const result=await referenceForm(r);if(!result)return;Object.assign(r,result,{updated:new Date().toISOString()});
    r.profit=r.actualPrice==null?null:r.actualPrice-num(r.cost);
    if(source==="legacy"){const linked=(state.learningRecords||[]).find(x=>x.projectId===r.id);if(linked){linked.actualPrice=r.actualPrice;linked.actualMinutes=r.actualMinutes;linked.profit=r.profit;linked.updated=r.updated;}}
    save();renderReferenceProjects();renderExperienceValues();
  });
  box.querySelectorAll('[data-delete-reference]').forEach(b=>b.onclick=async()=>{if(!await appConfirm('Referenzdatensatz wirklich löschen? Ein echtes Kundenprojekt bleibt unberührt.',"Referenz löschen","Löschen"))return;const [source,id]=b.dataset.deleteReference.split(":");if(source==="learning")deleteLearningRecord(id);else state.projects=state.projects.filter(p=>p.id!==id);save();renderReferenceProjects();});
  box.querySelectorAll('[data-duplicate-reference]').forEach(b=>b.onclick=()=>{const [source,id]=b.dataset.duplicateReference.split(":");const r=source==="learning"?(state.learningRecords||[]).find(x=>x.id===id):getReferenceProjects().find(x=>x.id===id);if(r)saveLearningRecord({...r,id:uid(),projectId:"",title:(r.title||"Referenz")+" – Kopie",created:new Date().toISOString()});renderReferenceProjects();});
  box.querySelectorAll('[data-toggle-reference]').forEach(b=>b.onclick=()=>{const [source,id]=b.dataset.toggleReference.split(":");const r=source==="learning"?(state.learningRecords||[]).find(x=>x.id===id):getReferenceProjects().find(x=>x.id===id);if(r){r.reference=r.reference===false;save();renderReferenceProjects();}});
  box.querySelectorAll('[data-convert-reference]').forEach(b=>b.onclick=async()=>{const [source,id]=b.dataset.convertReference.split(":");const r=source==="learning"?(state.learningRecords||[]).find(x=>x.id===id):getReferenceProjects().find(x=>x.id===id);if(!r)return;const result=await appForm({title:"Als echtes Projekt übernehmen",message:"Der tatsächliche Verkaufspreis wird für Umsatz und Gewinn verwendet.",fields:[{name:"title",label:"Projektname",value:r.title||"Projekt"},{name:"actualPrice",label:"Tatsächlicher Verkaufspreis (€)",value:r.actualPrice??"",inputmode:"decimal"}],acceptText:"Projekt anlegen",cancelText:"Abbrechen",validate:(v,parse)=>parse(v.actualPrice)<=0?"Bitte einen tatsächlichen Verkaufspreis größer als 0 eingeben.":""});if(!result)return;const now=new Date().toISOString(),price=num(result.actualPrice);state.projects.unshift({id:uid(),recordType:"project",isReference:false,reference:false,title:result.title.trim(),type:"Laser",module:"laser",machineId:r.machineId,machineName:r.machineName,status:"offer",estimatedPrice:r.estimatedPrice,actualPrice:price,sale:price,cost:num(r.cost),materialCost:r.materialCost,estimatedTotalTime:r.estimatedTotalTime,actualTotalTime:r.actualTotalTime,estimatedCutTime:r.estimatedCutTime,actualCutTime:r.actualCutTime,estimatedEngravingTime:r.estimatedEngravingTime,actualEngravingTime:r.actualEngravingTime,images:r.image?[r.image]:[],notes:r.notes||"",estimatorData:{...r},created:now,updated:now});save();await appAlert("Das echte Kundenprojekt wurde angelegt. Die Referenz bleibt erhalten.");});
}

function processLabel(value){return esc(({cut:"Schneiden",engrave:"Gravieren",both:"Beides"})[value]||value||"–");}
function referenceRecord(key){
  const [source,id]=key.split(":");
  const record=source==="learning"?(state.learningRecords||[]).find(x=>x.id===id):getReferenceProjects().find(x=>x.id===id);
  return record?{record,source,id}:null;
}
export function viewReferenceProject(key){
  const found=referenceRecord(key),dialog=$("referenceViewDialog"),box=$("referenceProjectList");if(!found||!dialog||!box)return;
  const r=found.record,totalArea=(num(r.area)||num(r.width)*num(r.height))*(num(r.layers)||1);
  $("referenceViewTitle").textContent=r.title||r.materialName||"Referenzdatensatz";
  $("referenceViewContent").innerHTML=`
    ${r.image?`<img class="reference-detail-image" src="${r.image}" alt="${esc(r.title||"Referenzprojekt")}">`:""}
    <div class="reference-detail-grid">
      <div><span>Datum</span><strong>${new Date(r.created||Date.now()).toLocaleDateString("de-DE")}</strong></div>
      <div><span>Auftragstyp</span><strong>${esc(orderTypeLabel(r.orderType))}</strong></div>
      <div><span>Material</span><strong>${esc(r.materialName||"–")}</strong></div>
      <div><span>Maschine</span><strong>${esc(r.machineName||"–")}</strong></div>
      <div><span>Bearbeitungsart</span><strong>${processLabel(r.process)}</strong></div>
      <div><span>Breite × Höhe</span><strong>${num(r.width)} × ${num(r.height)} cm</strong></div>
      <div><span>Ebenen</span><strong>${num(r.layers)||1}</strong></div>
      <div><span>Materialverbrauch</span><strong>${num(totalArea).toLocaleString("de-DE")} cm²</strong></div>
      <div><span>Materialkosten</span><strong>${euro(r.materialCost)}</strong></div>
      <div><span>Geschätzte Zeit</span><strong>${num(r.estimatedTotalTime)||num(r.estimatedCutTime)+num(r.estimatedEngravingTime)} Min.</strong></div>
      <div><span>Tatsächliche Zeit</span><strong>${r.actualTotalTime==null?"Unbekannt":num(r.actualTotalTime)+" Min."}</strong></div>
      <div><span>Geschätzter Preis</span><strong>${euro(r.estimatedPrice)}</strong></div>
      <div><span>Tatsächlicher Verkaufspreis</span><strong>${r.actualPrice==null?"Unbekannt":euro(r.actualPrice)}</strong></div>
      <div><span>Selbstkosten</span><strong>${euro(r.cost)}</strong></div>
      <div><span>Gewinn</span><strong>${r.actualPrice==null?"Unbekannt":euro(num(r.actualPrice)-num(r.cost))}</strong></div>
      <div><span>Lernstatus</span><strong>${r.reference===false?"Ausgeschlossen":"Aktiv"}</strong></div>
      <div><span>Für Lernsystem verwenden</span><strong>${r.reference===false?"Nein":"Ja"}</strong></div>
    </div>
    <div class="reference-notes"><span>Notizen</span><p>${esc(r.notes||"Keine Notizen vorhanden.")}</p></div>`;
  const actions=$("referenceViewActions");
  actions.innerHTML=`<button class="primary" data-detail-action="edit">Bearbeiten</button><button data-detail-action="duplicate">Duplizieren</button><button data-detail-action="convert">Als echtes Projekt übernehmen</button><button data-detail-action="toggle">${r.reference===false?"Für Lernsystem verwenden":"Vom Lernsystem ausschließen"}</button><button class="danger" data-detail-action="delete">Löschen</button><button data-detail-action="back">Zurück</button>`;
  const run=action=>{
    if(action==="back"){dialog.close();return}
    dialog.close();
    const selector={edit:"edit-reference",duplicate:"duplicate-reference",convert:"convert-reference",toggle:"toggle-reference",delete:"delete-reference"}[action];
    box.querySelector(`[data-${selector}="${key}"]`)?.click();
  };
  actions.querySelectorAll("[data-detail-action]").forEach(button=>button.onclick=()=>run(button.dataset.detailAction));
  $("referenceViewClose").onclick=()=>dialog.close();
  dialog.showModal();
}

async function referenceForm(r){
  const result=await appForm({title:"Referenzprojekt bearbeiten",message:"Leere Ist-Werte bleiben unbekannt.",fields:[
    {name:"title",label:"Name",value:r.title||""},{name:"materialName",label:"Material",value:r.materialName||""},{name:"machineName",label:"Maschine",value:r.machineName||""},
    {name:"process",label:"Bearbeitungsart",type:"select",value:r.process||"cut",options:[{value:"cut",label:"Schneiden"},{value:"engrave",label:"Gravieren"},{value:"both",label:"Beides"}]},
    {name:"width",label:"Breite (cm)",value:r.width||"",inputmode:"decimal"},{name:"height",label:"Höhe (cm)",value:r.height||"",inputmode:"decimal"},{name:"layers",label:"Ebenen",value:r.layers||1,inputmode:"decimal"},
    {name:"detail",label:"Detailgrad",type:"select",value:r.detail||"high",options:[{value:"simple",label:"Einfach"},{value:"medium",label:"Mittel"},{value:"high",label:"Hoch"},{value:"veryHigh",label:"Sehr hoch"}]},
    {name:"actualTotalTime",label:"Tatsächliche Gesamtzeit (Min.)",value:r.actualTotalTime??"",inputmode:"decimal"},{name:"actualCutTime",label:"Tatsächliche Schnittzeit (Min.)",value:r.actualCutTime??"",inputmode:"decimal"},{name:"actualEngravingTime",label:"Tatsächliche Gravurzeit (Min.)",value:r.actualEngravingTime??"",inputmode:"decimal"},{name:"actualPrice",label:"Tatsächlicher Verkaufspreis (€)",value:r.actualPrice??"",inputmode:"decimal"},{name:"notes",label:"Notizen",type:"textarea",value:r.notes||""},{name:"reference",label:"Für Lernsystem verwenden",type:"select",value:r.reference===false?"no":"yes",options:[{value:"yes",label:"Ja"},{value:"no",label:"Nein"}]}
  ],acceptText:"Speichern",cancelText:"Abbrechen",validate:(v,parse)=>{for(const k of ["width","height","layers","actualTotalTime","actualCutTime","actualEngravingTime","actualPrice"]){const n=parse(v[k]);if(Number.isNaN(n))return"Bitte gültige Zahlen eingeben. Komma und Punkt sind erlaubt.";if(n!=null&&n<0)return"Preise, Zeiten und Maße dürfen nicht negativ sein."}return v.title.trim()?"":"Bitte einen Namen eingeben.";}});if(!result)return null;
  const nullable=k=>result[k].trim()===""?null:num(result[k]);return {...result,width:num(result.width),height:num(result.height),area:num(result.width)*num(result.height),layers:Math.max(1,num(result.layers)||1),actualTotalTime:nullable("actualTotalTime"),actualMinutes:nullable("actualTotalTime"),actualCutTime:nullable("actualCutTime"),actualEngravingTime:nullable("actualEngravingTime"),actualPrice:nullable("actualPrice"),reference:result.reference==="yes"};
}

export function renderExperienceValues(){
  const box=$("experienceList");if(!box)return;
  const materialFilter=$("experienceMaterialFilter"),machineFilter=$("experienceMachineFilter");
  if(materialFilter&&materialFilter.options.length<=1)materialFilter.innerHTML='<option value="">Alle Materialien</option>'+state.materials.map(m=>`<option value="${esc(m.id)}">${esc(m.name)}</option>`).join("");
  if(machineFilter&&machineFilter.options.length<=1)machineFilter.innerHTML='<option value="">Alle Maschinen</option>'+state.machines.map(m=>`<option value="${esc(m.id)}">${esc(m.name)}</option>`).join("");
  const real=getRealProjects().filter(p=>p.estimatorData).map(p=>({...p.estimatorData,...p,recordType:"project"}));
  let rows=[...(state.learningRecords||[]),...real];
  const q=($("experienceSearch")?.value||"").trim().toLowerCase(),mat=$("experienceMaterialFilter")?.value||"",machine=$("experienceMachineFilter")?.value||"",process=$("experienceProcessFilter")?.value||"",type=$("experienceTypeFilter")?.value||"",from=$("experienceFrom")?.value,to=$("experienceTo")?.value;
  rows=rows.filter(r=>(!q||`${r.title} ${r.materialName} ${r.machineName}`.toLowerCase().includes(q))&&(!mat||r.materialId===mat)&&(!machine||r.machineId===machine)&&(!process||r.process===process)&&(!type||r.recordType===type)&&(!from||new Date(r.created)>=new Date(from))&&(!to||new Date(r.created)<=new Date(to+"T23:59:59")));
  const timeDev=r=>r.actualTotalTime==null?null:num(r.actualTotalTime)-num(r.estimatedTotalTime),priceDev=r=>r.actualPrice==null?null:num(r.actualPrice)-num(r.estimatedPrice);
  const sort=$("experienceSort")?.value||"dateDesc";rows.sort((a,b)=>sort==="dateAsc"?new Date(a.created)-new Date(b.created):sort==="name"?String(a.title).localeCompare(String(b.title),"de"):sort==="timeDeviation"?Math.abs(timeDev(b)||0)-Math.abs(timeDev(a)||0):sort==="priceDeviation"?Math.abs(priceDev(b)||0)-Math.abs(priceDev(a)||0):new Date(b.created)-new Date(a.created));
  const times=rows.map(timeDev).filter(x=>x!=null),prices=rows.map(priceDev).filter(x=>x!=null);$("experienceCount").textContent=rows.length;$("experienceTimeDeviation").textContent=times.length?`${(times.reduce((a,b)=>a+b,0)/times.length).toLocaleString("de-DE",{maximumFractionDigits:1})} Min.`:"–";$("experiencePriceDeviation").textContent=prices.length?euro(prices.reduce((a,b)=>a+b,0)/prices.length):"–";
  box.innerHTML=rows.length?rows.map(r=>`<article class="card experience-item"><strong>${esc(r.title||"Erfahrungswert")}</strong><small>${new Date(r.created||Date.now()).toLocaleDateString("de-DE")} · ${r.recordType==="project"?"Echtes Projekt":"Referenzprojekt"} · ${esc(r.materialName||"–")} · ${esc(r.machineName||"–")}</small><div class="project-view-details"><div><span>Auftragstyp</span><strong>${esc(orderTypeLabel(r.orderType))}</strong></div><div><span>Bearbeitung</span><strong>${esc(r.process||"–")}</strong></div><div><span>Maße / Fläche</span><strong>${num(r.width)} × ${num(r.height)} cm / ${num(r.area)} cm²</strong></div><div><span>Ebenen / Detail</span><strong>${num(r.layers)||1} / ${esc(r.detail||"–")}</strong></div><div><span>Zeit geschätzt / tatsächlich</span><strong>${num(r.estimatedTotalTime)} / ${r.actualTotalTime==null?"unbekannt":num(r.actualTotalTime)} Min.</strong></div><div><span>Preis geschätzt / tatsächlich</span><strong>${euro(r.estimatedPrice)} / ${r.actualPrice==null?"unbekannt":euro(r.actualPrice)}</strong></div><div><span>Lernfaktor</span><strong>${r.actualTotalTime!=null&&num(r.estimatedTotalTime)>0?(num(r.actualTotalTime)/num(r.estimatedTotalTime)).toLocaleString("de-DE",{maximumFractionDigits:2}):"–"}</strong></div></div>${r.recordType==="reference"?`<div class="item-actions"><button data-experience-edit="${r.id}">Bearbeiten</button><button class="danger" data-experience-delete="${r.id}">Löschen</button></div>`:""}</article>`).join(""):'<div class="empty-state">Keine passenden Erfahrungswerte gefunden.</div>';
  box.querySelectorAll("[data-experience-edit]").forEach(b=>b.onclick=async()=>{const r=(state.learningRecords||[]).find(x=>x.id===b.dataset.experienceEdit),result=r&&await referenceForm(r);if(result){Object.assign(r,result,{updated:new Date().toISOString()});save();renderExperienceValues();}});
  box.querySelectorAll("[data-experience-delete]").forEach(b=>b.onclick=async()=>{if(await appConfirm("Erfahrungswert wirklich löschen?","Erfahrungswert löschen","Löschen")){deleteLearningRecord(b.dataset.experienceDelete);renderExperienceValues();}});
}
["experienceSearch","experienceMaterialFilter","experienceMachineFilter","experienceProcessFilter","experienceTypeFilter","experienceFrom","experienceTo","experienceSort"].forEach(id=>$(id)?.addEventListener("input",renderExperienceValues));
export function renderStatisticsCharts(){
  const box=$('statisticsCharts');if(!box)return;
  const projects=getRealProjects(),max=Math.max(1,...projects.map(p=>num(p.sale)));
  const materialUsage=new Map(),machineUsage=new Map();
  projects.forEach(p=>{if(p.fields?.matMain)materialUsage.set(p.fields.matMain,(materialUsage.get(p.fields.matMain)||0)+num(p.fields.usageMain));if(p.machineName)machineUsage.set(p.machineName,(machineUsage.get(p.machineName)||0)+num(p.workSeconds)/3600);});
  const totalSale=projects.reduce((s,p)=>s+num(p.sale),0),totalProfit=projects.reduce((s,p)=>s+num(p.sale)-num(p.cost),0);
  const bars=projects.slice().sort((a,b)=>new Date(b.created)-new Date(a.created)).slice(0,8).map(p=>`<div class="chart-row"><span>${esc(p.title)}</span><i style="--bar:${Math.max(2,num(p.sale)/max*100)}%"></i><strong>${euro(p.sale)}</strong></div>`).join("");
  const topMaterials=[...materialUsage.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5).map(([id,value])=>`${esc(resolveMaterialSelection(id)?.name||"Material")}: ${num(value).toLocaleString("de-DE")}`).join("<br>")||"Noch keine Daten";
  const machines=[...machineUsage.entries()].sort((a,b)=>b[1]-a[1]).map(([name,hours])=>`${esc(name)}: ${hours.toLocaleString("de-DE",{maximumFractionDigits:1})} Std.`).join("<br>")||"Noch keine Daten";
  box.innerHTML=`<div class="chart-card"><b>Umsatz</b><strong>${euro(totalSale)}</strong>${bars}</div><div class="chart-card"><b>Gewinn</b><strong>${euro(totalProfit)}</strong><p>${projects.length} Projekte</p></div><div class="chart-card"><b>Meistgenutzte Materialien</b><p>${topMaterials}</p></div><div class="chart-card"><b>Maschinenlaufzeit</b><p>${machines}</p></div>`;
}
const PROCESSING_FIELD_IDS=["matMain","matTransfer","usageMain","usageTransfer","printMinutes","engraveMinutes","cutMinutes","workMinutes","hourlyRate","quantity","colors","plotMinutes","weedMinutes","mountMinutes","pressMinutes","prepMinutes"];
const PROJECT_FIELD_SKIP=new Set(["projectName","customerName","customerAddress","projectNotes","machineSelect","projectStatus","projectTags","difficulty","riskSurcharge","expressSurcharge","objectMaterial","customerObjectProcess","agreementPrice","agreementPriceNote","agreementPriceType","priceType","priceAgreementDate","agreementPriceDate","isPreferredRepeatPrice","isPreferredCustomerPrice",...PROCESSING_FIELD_IDS]);
function fieldRow(id,value){
  const formatted=formatProjectFieldValue(id,value,{resolveMaterial:resolveMaterialSelection,resolveMachine:value=>state.machines.find(m=>m.id===value)});
  return `<div><span>${esc(projectFieldLabel(id))}</span><strong>${esc(formatted)}</strong></div>`;
}
function projectProcessingDetails(p){
  const fields=p.fields||{},rows=[];
  const add=(label,value,formatted)=>{if(!isEmptyProjectValue(value))rows.push(`<div><span>${esc(label)}</span><strong>${esc(formatted??String(value))}</strong></div>`)};
  add("Bearbeitungsart",p.customerObjectProcess,p.customerObjectProcess?formatProjectFieldValue("customerObjectProcess",p.customerObjectProcess):"");
  add("Objektmaterial",p.objectMaterial);
  add("Maschine",p.machineName);
  PROCESSING_FIELD_IDS.forEach(id=>{if(!isEmptyProjectValue(fields[id]))rows.push(fieldRow(id,fields[id]))});
  add("Schwierigkeitsgrad",p.difficulty,p.difficulty?formatProjectFieldValue("difficulty",p.difficulty):"");
  return rows.length?`<h3>Bearbeitung</h3><div class="project-view-details">${rows.join("")}</div>`:"";
}
function projectTechnicalDetails(p){
  const rows=Object.entries(p.fields||{}).filter(([key,value])=>!PROJECT_FIELD_SKIP.has(key)&&!isEmptyProjectValue(value)).map(([key,value])=>fieldRow(key,value));
  return rows.length?`<details class="project-technical-details"><summary>Technische Details</summary><div class="project-view-details">${rows.join("")}</div></details>`:"";
}
function signedEuro(value){
  const clean=Math.abs(value)<.005?0:value;
  return `${clean>0?"+":""}${euro(clean)}`;
}
function currentCustomerCalculation(p){
  if(p.orderType!=="customerObject")return null;
  const storedBreakdown=p.pricingBreakdown||p.calculationSnapshot?.pricingBreakdown||p.estimatorData?.pricingBreakdown||{};
  const results=p.calculationSnapshot?.results||{};
  const totals=positionTotals(p),material=Math.max(num(storedBreakdown.material),totals.material),machine=Math.max(num(storedBreakdown.machine??results.machineCosts),totals.machine),work=Math.max(num(storedBreakdown.work??results.workCosts),totals.work),extra=Math.max(num(storedBreakdown.extra??results.additionalCosts),totals.other);
  const baseFee=num(storedBreakdown.baseFee),furtherSurcharges=num(storedBreakdown.furtherSurcharges),risk=num(storedBreakdown.risk??p.riskSurcharge),express=num(storedBreakdown.express??p.expressSurcharge),difficultyPercent=num(p.difficultyPercent??p.calculationSnapshot?.pricingSettings?.difficultyPercent);
  const componentsChanged=machine!==num(storedBreakdown.machine??results.machineCosts)||work!==num(storedBreakdown.work??results.workCosts)||material!==num(storedBreakdown.material)||extra!==num(storedBreakdown.extra??results.additionalCosts);
  const difficulty=componentsChanged&&difficultyPercent>0?(baseFee+furtherSurcharges+material+machine+work+extra)*difficultyPercent/100:num(storedBreakdown.difficulty);
  const selfCosts=material+machine+work+extra;
  const calculated=componentsChanged?baseFee+furtherSurcharges+selfCosts+difficulty+risk+express:num(storedBreakdown.calculated??results.calculatedPrice??p.estimatedPrice??p.sale);
  const minimum=num(storedBreakdown.minimum),recommended=componentsChanged?(calculated<=minimum?minimum:Math.max(minimum,Math.ceil(calculated)+.9)):num(storedBreakdown.sale??results.optimalPrice??p.estimatedPrice??p.sale);
  const breakdown={...storedBreakdown,material,machine,work,extra,baseFee,furtherSurcharges,risk,express,difficulty,cost:selfCosts,calculated,sale:recommended};
  const source={...p,cost:selfCosts,selfCosts,costCoveringMinimumPrice:selfCosts,calculatedWorkPrice:calculated,recommendedSalePrice:recommended,recommendedPrice:recommended,pricingBreakdown:breakdown};
  return {breakdown,selfCosts,calculated,recommended,results,source};
}
function customerCalculationOverview(p){
  const current=currentCustomerCalculation(p);
  if(!current)return "";
  const {breakdown,selfCosts,calculated,recommended,results,source}=current;
  const row=(label,value)=>num(value)!==0?`<div><span>${label}</span><strong>${euro(value)}</strong></div>`:"";
  const costRows=`${row("Materialkosten",breakdown.material)}${row("Maschinenkosten",breakdown.machine??results.machineCosts)}${row("Arbeitskosten",breakdown.work??results.workCosts)}${row("Sonstige echte Kosten",breakdown.extra??results.additionalCosts)}`;
  const surchargeRows=`${row("Grundpauschale",breakdown.baseFee)}${row("Schwierigkeitsaufschlag",breakdown.difficulty)}${row("Risikoaufschlag",breakdown.risk??p.riskSurcharge)}${row("Expresszuschlag",breakdown.express??p.expressSurcharge)}${row("Weitere Zuschläge",breakdown.furtherSurcharges)}`;
  return `<div class="project-calculation-overview">
    ${costRows?`<h4>TATSÄCHLICHE KOSTEN</h4>${costRows}`:""}
    <div><span>Selbstkosten</span><strong>${euro(selfCosts)}</strong></div>
    ${surchargeRows?`<h4>PREISBESTANDTEILE UND ZUSCHLÄGE</h4>${surchargeRows}`:""}
    ${Math.abs(recommended-calculated)>=.005?`<h4>RUNDUNG</h4><div><span>Rundungsdifferenz</span><strong>${signedEuro(recommended-calculated)}</strong></div>`:""}
    ${renderPriceLadder(getPriceLadderData(source),{heading:true,details:true})}
  </div>`;
}
export function viewProject(id){
  const p=getRealProjects().find(x=>x.id===id);
  if(!p){appAlert("Projekt wurde nicht gefunden.");return;}
  const dialog=$("projectViewDialog");
  const selfCosts=getCostCoveringMinimumPrice(p);
  const cons=(p.consumables||[]).map(r=>{const m=state.materials.find(x=>x.id===r.materialId);return m?`<div><span>${esc(m.name)}</span><strong>${num(r.quantity)} ${esc(workshopUnit(m))}</strong></div>`:""}).join("");
  $("projectViewTitle").textContent=p.title||"Projekt";
  $("projectViewContent").innerHTML=`
    ${(p.images||[]).length?`<div class="project-gallery">${p.images.map((img,i)=>`<figure><img class="project-view-image" src="${img}" alt="Projektbild ${i+1}"><button type="button" data-delete-image="${i}" class="image-delete" aria-label="Bild löschen">×</button></figure>`).join("")}</div>`:`<div class="project-image-empty">Noch kein Projektbild vorhanden.</div>`}
    <div class="project-image-actions"><label class="secondary file-button">＋ Bilder hinzufügen<input id="projectImageInput" type="file" accept="image/*" multiple></label></div>
    <h3>Projektdaten</h3><div class="project-view-summary">
      <div><span>Projektname</span><strong>${esc(p.title||"Projekt")}</strong></div><div><span>Bereich</span><strong>${esc(p.type||"–")}</strong></div>
      <div><span>Auftragstyp</span><strong>${esc(orderTypeLabel(p.orderType))}</strong></div><div><span>Datum</span><strong>${new Date(p.created||p.updated).toLocaleDateString("de-DE")}</strong></div>
      <div><span>Status</span><strong>${esc(projectStatusLabel(p.status))}</strong></div>
    </div>
    ${(customerNameById(p.customerId)||p.customer||p.customerAddress||p.fields?.customerEmail||p.fields?.customerPhone)?`<h3>Kundendaten</h3><div class="project-view-details">
      ${customerNameById(p.customerId)||p.customer?`<div><span>Kunde / Firma</span><strong>${esc(customerNameById(p.customerId)||p.customer)}</strong></div>`:""}
      ${p.customerAddress?`<div><span>Kundenadresse</span><strong>${esc(p.customerAddress)}</strong></div>`:""}
      ${p.fields?.customerEmail?`<div><span>E-Mail</span><strong>${esc(p.fields.customerEmail)}</strong></div>`:""}
      ${p.fields?.customerPhone?`<div><span>Telefon</span><strong>${esc(p.fields.customerPhone)}</strong></div>`:""}
    </div>`:""}
    ${renderProjectPositions(p)}
    ${projectProcessingDetails(p)}
    ${customerCalculationOverview(p)}
    ${p.orderType==="customerObject"?"":`<h3>Tatsächliche Kosten</h3><div class="project-view-details">
      <div><span>Selbstkosten</span><strong>${euro(selfCosts)}</strong></div>
    </div><h3>Preisübersicht</h3><div class="project-view-details">
      ${p.estimatedPrice!=null?`<div><span>Ursprüngliche Schätzung</span><strong>${euro(p.estimatedPrice)}</strong></div>`:""}
      ${renderPriceLadder(getPriceLadderData(p),{heading:false,details:true})}
      <div><span>Tatsächlicher Gewinn</span><strong>${euro(num(p.sale)-selfCosts)}</strong></div>
      <div><span>Gewinnmarge</span><strong>${num(p.sale)>0?`${((num(p.sale)-selfCosts)/num(p.sale)*100).toLocaleString("de-DE",{maximumFractionDigits:1})} %`:"0,0 %"}</strong></div>
    </div>`}
    ${priceAgreementHtml(p,p.orderType==="customerObject"?getPriceLadderData(currentCustomerCalculation(p).source):null)}
    ${(p.tags||[]).length?`<div class="tag-row">${p.tags.map(t=>`<span>#${esc(t)}</span>`).join("")}</div>`:""}
    ${p.notes?`<div class="project-view-notes"><b>Notizen</b><p>${esc(p.notes)}</p></div>`:""}
    ${cons?`<h3>Verbrauchsmaterial</h3><div class="project-view-details">${cons}</div>`:""}
    ${projectTechnicalDetails(p)}`;

  const statusSelect=$("projectViewStatusSelect");
  statusSelect.value=p.status||"offer";
  statusSelect.onchange=()=>{
    const previousStatus=p.status;
    p.status=statusSelect.value;
    if(!["done","billed"].includes(previousStatus)&&["done","billed"].includes(p.status))deductPositionStock(p);
    p.updated=new Date().toISOString();
    save();renderProjects();updateHome();
  };
  $("projectViewEditBtn").onclick=()=>{dialog.close();loadProject(id,false)};
  $("offerPdfBtn").onclick=async()=>{let price=p.sale;if(p.agreementPrice!=null){const choice=await appForm({title:"Preis für Kunden-PDF",message:"Interne Notizen und Preis-Historie werden nicht im PDF ausgegeben.",fields:[{name:"priceSource",label:"Endpreis verwenden",type:"select",value:"project",options:[{value:"project",label:`Bisheriger Projektpreis (${euro(p.sale)})`},{value:"agreement",label:`Vereinbarter Verkaufspreis (${euro(p.agreementPrice)})`}]}],acceptText:"PDF erstellen"});if(!choice)return;price=choice.priceSource==="agreement"?p.agreementPrice:p.sale}await printOffer(p,price)};
  $("closeProjectViewBtn").onclick=()=>dialog.close();
  dialog.onclick=e=>{if(e.target===dialog)dialog.close()};
  $("projectImageInput")?.addEventListener("change",async e=>{
    const files=[...(e.target.files||[])];if(!files.length)return;
    try{
      p.images=p.images||[];
      for(const file of files.slice(0,Math.max(0,6-p.images.length)))p.images.push(await compressProjectImage(file));
      p.updated=new Date().toISOString();save();renderProjects();dialog.close();viewProject(id);
    }catch(err){console.error(err);appAlert("Mindestens ein Bild konnte nicht verarbeitet werden.")}
  });
  dialog.querySelectorAll("[data-delete-image]").forEach(btn=>btn.onclick=async()=>{
    if(await appConfirm("Dieses Projektbild löschen?","Bild löschen","Löschen")){p.images.splice(Number(btn.dataset.deleteImage),1);p.updated=new Date().toISOString();save();renderProjects();dialog.close();viewProject(id)}
  });
  bindPriceAgreementActions(dialog,p,{refresh:()=>{renderProjects();dialog.close();viewProject(id)},openProject:otherId=>{dialog.close();viewProject(otherId)}});
  bindProjectPositions(dialog,p,()=>{renderProjects();dialog.close();viewProject(id)});
  try{if(!dialog.open)dialog.showModal()}catch(err){console.error(err);dialog.setAttribute("open","")}
}

async function printOffer(p,selectedPrice=p.sale){
  if(OFFER_PDF_TEMPLATE==="legacy"){printOfferLegacy(p,selectedPrice);return}
  const today=new Date();
  const created=new Date(p.created||p.updated||Date.now());
  const offerNo=`A-${created.getFullYear()}-${String(created.getMonth()+1).padStart(2,"0")}${String(created.getDate()).padStart(2,"0")}-${String((p.id||"").replace(/\D/g,"").slice(-3)||"001").padStart(3,"0")}`;
  const qty=Math.max(1,num(p.qty)||1),totalPrice=num(selectedPrice),unitPrice=totalPrice/qty;
  const address=(customerAddressById(p.customerId)||p.customerAddress||p.fields?.customerAddress||p.customer||"").trim();
  if(address.split(/\r?\n/).filter(Boolean).length<3)await appAlert("Für einen Fensterbriefumschlag fehlt eine vollständige Kundenanschrift. Das Angebot wird trotzdem erstellt.");
  try{
    const offerData={offerNumber:offerNo,date:today.toLocaleDateString("de-DE"),projectName:p.title||p.type||"Individuelle Anfertigung",address,positions:[{description:p.title||p.type||"Individuelle Anfertigung",quantity:qty,unit:"Stk.",unitPrice,total:totalPrice}],total:totalPrice};
    const bytes=await createOfferPdf(offerData);
    downloadOfferPdf(bytes,offerPdfFilename(offerData));
  }catch(error){
    console.error("Angebots-PDF konnte nicht erstellt werden",error);
    await appAlert("Das Angebots-PDF konnte nicht erstellt werden. Bitte die App einmal online neu laden und erneut versuchen.");
  }
}

function printOfferLegacy(p,selectedPrice=p.sale){
  const today=new Date();
  const date=today.toLocaleDateString("de-DE");
  const created=new Date(p.created||p.updated||Date.now());
  const offerNo=`A-${created.getFullYear()}-${String(created.getMonth()+1).padStart(2,"0")}${String(created.getDate()).padStart(2,"0")}-${String((p.id||"").replace(/\D/g,"").slice(-3)||"001").padStart(3,"0")}`;
  const service=esc(p.title||p.type||"Individuelle Anfertigung");
  const qty=Math.max(1,num(p.qty)||1);
  const pdfPrice=num(selectedPrice),unitPrice=pdfPrice/qty;
  const address=(customerAddressById(p.customerId)||p.customerAddress||p.fields?.customerAddress||p.customer||"").trim();
  const addressHtml=address?address.split(/\r?\n/).map(esc).join("<br>"):"Kundenanschrift";
  const logoUrl=new URL("briefkopf-logo.png",window.location.href).href;

  const doc=`<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Angebot ${offerNo}</title><style>
    @page{size:A4;margin:10mm 16mm 14mm}
    *{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff;color:#17120e;font-family:Arial,Helvetica,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .sheet{width:100%;min-height:273mm;position:relative;padding-bottom:35mm;font-size:10.5pt}
    .letterhead{width:100%;height:auto;display:block;margin:0 auto 5mm;object-fit:contain}
    .gold-line{height:1.2px;background:#b8872f;margin:0 0 8mm}
    .sender{font-size:7.5pt;text-decoration:underline;color:#555;margin-bottom:3mm}
    .top-grid{display:grid;grid-template-columns:minmax(0,1fr) 58mm;gap:16mm;align-items:start;min-height:32mm;margin-bottom:7mm}
    .address{font-size:10.5pt;line-height:1.45}
    .meta{font-size:8.5pt}.meta-row{margin-bottom:3mm}.meta span,.meta strong{display:block}.meta span{color:#666;margin-bottom:1mm}.meta strong{font-size:10pt}
    h1{font:700 21pt Georgia,"Times New Roman",serif;margin:0 0 7mm}
    .subject{margin:0 0 5mm}.intro{margin:0 0 7mm;line-height:1.5}
    table{width:100%;border-collapse:collapse;margin:0 0 5mm}th{background:#f4f0e8;text-align:left;font-size:8.5pt;padding:3mm 2.5mm;border-bottom:1px solid #b8872f}td{padding:4mm 2.5mm;border-bottom:1px solid #d9cfbd;vertical-align:top}
    th:first-child,td:first-child{width:12mm}th:nth-child(3),td:nth-child(3){width:19mm;text-align:center}th:nth-child(4),td:nth-child(4),th:last-child,td:last-child{width:30mm;text-align:right}
    .total{display:flex;justify-content:flex-end;align-items:baseline;gap:12mm;padding:4mm 2.5mm;border-top:1.5px solid #b8872f;margin-bottom:8mm}.total span{font-size:11pt}.total strong{font-size:16pt;color:#765018}
    .notes{font-size:9pt;color:#333;line-height:1.5}.notes p{margin:1.5mm 0}.closing{margin-top:8mm;line-height:1.5}
    footer{position:absolute;left:0;right:0;bottom:0;border-top:1px solid #b8872f;padding-top:3mm;display:grid;grid-template-columns:1.05fr .95fr 1.35fr .45fr;gap:5mm;color:#333;font-size:7.4pt;line-height:1.35}
    footer strong{display:block;color:#17120e;margin-bottom:1mm}footer .page{text-align:right;white-space:nowrap}
    @media screen{body{padding:16px;background:#e9e9e9}.sheet{max-width:210mm;margin:auto;background:#fff;padding:10mm 16mm 14mm;box-shadow:0 4px 24px rgba(0,0,0,.18)}footer{left:16mm;right:16mm;bottom:14mm}.letterhead{max-height:49mm}}
    @media print{.sheet{min-height:273mm}.letterhead{max-height:49mm}}
  </style></head><body><main class="sheet">
    <img id="letterheadLogo" class="letterhead" src="${logoUrl}" alt="Daniel's Laser Art">
    <div class="gold-line"></div>
    <div class="sender">Daniel's Laser Art | Augasse 12 | 08393 Meerane</div>
    <section class="top-grid">
      <div class="address">${addressHtml}</div>
      <div class="meta"><div class="meta-row"><span>Angebotsnummer</span><strong>${offerNo}</strong></div><div class="meta-row"><span>Datum</span><strong>${date}</strong></div></div>
    </section>
    <h1>Angebot</h1>
    <p class="subject"><strong>Betreff:</strong> Angebot zu Ihrem Auftrag</p>
    <p class="intro">Vielen Dank für Ihre Anfrage. Gern biete ich Ihnen folgende Leistung an:</p>
    <table><thead><tr><th>Pos.</th><th>Beschreibung</th><th>Menge</th><th>Einzelpreis</th><th>Gesamt</th></tr></thead><tbody><tr><td>1.</td><td>${service}</td><td>${qty.toLocaleString("de-DE",{minimumFractionDigits:0,maximumFractionDigits:2})}</td><td>${euro(unitPrice)}</td><td>${euro(pdfPrice)}</td></tr></tbody></table>
    <div class="total"><span>Gesamt</span><strong>${euro(pdfPrice)}</strong></div>
    <div class="notes"><p>Dieses Angebot ist 14 Tage ab dem Ausstellungsdatum gültig.</p><p>Gemäß § 19 UStG wird aufgrund der Kleinunternehmerregelung keine Umsatzsteuer erhoben.</p></div>
    <p class="closing">Vielen Dank für Ihr Interesse. Ich freue mich auf Ihren Auftrag.</p>
    <footer>
      <div><strong>Daniel's Laser Art</strong>Augasse 12<br>08393 Meerane<br>Steuernummer: 227/227/03573<br>Inhaber: Daniel Häßler</div>
      <div><strong>Kontakt</strong>Telefon: 015147906749<br>E-Mail: Daniels.laser.art@gmail.com<br>Web: danielslaserart.de</div>
      <div><strong>Bankverbindung</strong>Bank: C24 Bank<br>IBAN: DE07 5002 4024 7016 9162 31<br>BIC: DEFF DEFF XXX<br>Kontoinhaber: Daniel Häßler</div>
      <div class="page"><strong>Seite</strong>1 von 1</div>
    </footer>
  </main><script>
    const printNow=()=>setTimeout(()=>window.print(),180);
    const logo=document.getElementById('letterheadLogo');
    if(logo.complete) printNow(); else {logo.addEventListener('load',printNow,{once:true});logo.addEventListener('error',printNow,{once:true});}
  <\/script></body></html>`;

  const popup=window.open("","_blank");
  if(!popup){appAlert("Die Druckansicht wurde blockiert. Bitte Pop-ups für diese Seite erlauben.");return;}
  popup.document.open();popup.document.write(doc);popup.document.close();
}

function loadProject(id,duplicate=false){
  const p=getRealProjects().find(x=>x.id===id);if(!p)return;
  if(!duplicate&&(p.calculationSource==="estimator"||p.calculationSnapshot?.sourceModule==="estimator"||(!p.fields&&p.estimatorData))){
    document.dispatchEvent(new CustomEvent("dla:edit-estimator-project",{detail:{projectId:p.id}}));return;
  }
  loadCalculatorData(p,{duplicate,editingProjectId:duplicate?null:p.id});
}
$("clearProjectsBtn").onclick=async()=>{const real=getRealProjects();if(real.length&&await appConfirm("Wirklich alle echten Kundenprojekte löschen? Referenz- und Lerndaten bleiben erhalten.","Kundenprojekte löschen","Alle löschen")){const ids=new Set(real.map(p=>p.id));state.projects=state.projects.filter(p=>!ids.has(p.id));save();renderProjects()}};
$("projectSearch").oninput=renderProjects;
if($("projectStatusFilter"))$("projectStatusFilter").onchange=renderProjects;
if($("projectCustomerFilter"))$("projectCustomerFilter").onchange=renderProjects;
if($("projectSort"))$("projectSort").onchange=renderProjects;
document.addEventListener("dla:filter-projects-by-customer",renderProjects);
document.addEventListener("dla:view-project",event=>viewProject(event.detail?.projectId));
if($("newOrderBtn"))$("newOrderBtn").onclick=()=>startNewOrder("3d");
if($("projectNewBtn"))$("projectNewBtn").onclick=()=>startNewOrder("3d");
if($("manageTemplatesBtn"))$("manageTemplatesBtn").onclick=async()=>{if(!(state.templates||[]).length){await appAlert("Noch keine Vorlagen vorhanden. Erstelle eine Vorlage über ein gespeichertes Projekt.");return;}const result=await appForm({title:"Vorlagen verwalten",fields:[{name:"template",label:"Zu löschende Vorlage",type:"select",options:state.templates.map(t=>({value:t.id,label:t.name}))}],cancelText:"Abbrechen",acceptText:"Vorlage löschen"});if(result&&await appConfirm("Vorlage wirklich löschen?","Vorlage löschen","Löschen")){state.templates=state.templates.filter(t=>t.id!==result.template);save();updateHome();}};
