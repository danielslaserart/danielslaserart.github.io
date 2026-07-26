import { $, num, euro, uid, esc, compressProjectImage } from "./utils.js";
import { state, save, getRealProjects, getReferenceProjects } from "./storage.js";
import { loadCalculatorData, updateHome, createTemplateFromProject, startNewOrder } from "./ui.js";
import { resolveMaterialSelection } from "./materials.js";
import { workshopUnit } from "./calculator.js";
import { deleteLearningRecord, saveLearningRecord } from "./learning.js";
function projectStatusLabel(status){
  return ({offer:"Angebot",progress:"In Arbeit",waiting:"Wartet",done:"Fertig",billed:"Abgerechnet",open:"Angebot",payment:"Wartet"})[status]||"Angebot";
}
function projectStatusClass(status){return `status-${["offer","progress","waiting","done","billed"].includes(status)?status:"offer"}`;}
export function renderProjects(){
  const realProjects=getRealProjects();
  const term=($('projectSearch')?.value||'').trim().toLowerCase();
  const filter=$('projectStatusFilter')?.value||'all';
  const sort=$('projectSort')?.value||'updated';
  const list=realProjects.filter(p=>{
    const matchesText=!term||`${p.title} ${p.customer||''} ${p.type||''} ${p.machineName||''} ${p.notes||''} ${(p.tags||[]).join(' ')}`.toLowerCase().includes(term);
    const matchesStatus=filter==='all'||(p.status||'offer')===filter;
    return matchesText&&matchesStatus;
  }).sort((a,b)=>{
    if(Boolean(a.pinned)!==Boolean(b.pinned))return a.pinned?-1:1;
    if(sort==='name')return String(a.title||'').localeCompare(String(b.title||''),'de');
    if(sort==='customer')return String(a.customer||'').localeCompare(String(b.customer||''),'de');
    if(sort==='price')return num(b.sale)-num(a.sale);
    if(sort==='created')return new Date(b.created)-new Date(a.created);
    return new Date(b.updated||b.created)-new Date(a.updated||a.created);
  });
  const totalProfit=realProjects.reduce((sum,p)=>sum+num(p.sale)-num(p.cost),0);
  if($('projectStatCount'))$('projectStatCount').textContent=realProjects.length;
  if($('projectStatProfit'))$('projectStatProfit').textContent=euro(totalProfit);
  if($('projectStatAverage'))$('projectStatAverage').textContent=realProjects.length?euro(realProjects.reduce((sum,p)=>sum+num(p.sale),0)/realProjects.length):euro(0);
  $('projectList').innerHTML=list.length?list.map(p=>`
    <article class="card project-item" data-project-card="${p.id}">
      ${(p.images||[])[0]?`<button class="project-thumb" type="button" data-view-project="${p.id}" aria-label="Projekt ansehen"><img src="${p.images[0]}" alt=""></button>`:''}
      <div class="item-top"><div><div class="item-title">${p.pinned?"📌 ":""}${esc(p.title)}</div><div class="item-meta">${esc(p.type)}${p.machineName?' · '+esc(p.machineName):''}${p.customer?' · '+esc(p.customer):''} · ${new Date(p.created).toLocaleDateString('de-DE')}</div></div><div class="item-price">${euro(p.sale)}</div></div>
      <div class="project-status-row"><span class="project-status ${projectStatusClass(p.status)}">${projectStatusLabel(p.status)}</span></div>
      ${(p.tags||[]).length?`<div class="tag-row">${p.tags.map(t=>`<span>#${esc(t)}</span>`).join('')}</div>`:''}${p.notes?`<div class="project-notes">${esc(p.notes)}</div>`:''}
      <div class="item-actions project-actions"><button type="button" data-view-project="${p.id}" class="primary">Ansehen</button><button type="button" data-edit-project="${p.id}">Bearbeiten</button>${p.estimatorData?`<button type="button" data-reference-project="${p.id}">Als Lerndaten nutzen</button>`:""}<button type="button" data-pin-project="${p.id}">${p.pinned?"Lösen":"Anheften"}</button><button type="button" data-template-project="${p.id}">Als Vorlage</button><button type="button" data-duplicate-project="${p.id}">Duplizieren</button><button type="button" data-del-project="${p.id}" class="danger">Löschen</button></div>
    </article>`).join(''):`<div class="empty-state">Keine passenden Projekte gefunden.</div>`;
  document.querySelectorAll('[data-view-project]').forEach(b=>b.onclick=e=>{e.stopPropagation();viewProject(b.dataset.viewProject)});
  document.querySelectorAll('[data-project-card]').forEach(card=>card.onclick=e=>{if(!e.target.closest('button'))viewProject(card.dataset.projectCard)});
  document.querySelectorAll('[data-edit-project]').forEach(b=>b.onclick=e=>{e.stopPropagation();loadProject(b.dataset.editProject,false)});
  document.querySelectorAll('[data-duplicate-project]').forEach(b=>b.onclick=e=>{e.stopPropagation();loadProject(b.dataset.duplicateProject,true)});
  document.querySelectorAll('[data-pin-project]').forEach(b=>b.onclick=e=>{e.stopPropagation();const p=realProjects.find(x=>x.id===b.dataset.pinProject);if(p){p.pinned=!p.pinned;p.updated=new Date().toISOString();save();renderProjects();}});
  document.querySelectorAll('[data-template-project]').forEach(b=>b.onclick=e=>{e.stopPropagation();createTemplateFromProject(b.dataset.templateProject)});
  document.querySelectorAll('[data-reference-project]').forEach(b=>b.onclick=e=>{e.stopPropagation();const p=realProjects.find(x=>x.id===b.dataset.referenceProject);if(p?.estimatorData){saveLearningRecord({...p.estimatorData,projectId:p.id,title:p.title,estimatedPrice:p.estimatedPrice,actualPrice:p.actualPrice,reference:true});alert('Das Kundenprojekt bleibt in der Projektübersicht. Eine getrennte Lernreferenz wurde aktualisiert.');renderProjects();}});
  document.querySelectorAll('[data-del-project]').forEach(b=>b.onclick=e=>{e.stopPropagation();if(confirm('Projekt löschen?')){state.projects=state.projects.filter(p=>p.id!==b.dataset.delProject);save();renderProjects();updateHome()}});
  renderReferenceProjects();
  renderStatisticsCharts();
}
export function renderReferenceProjects(){
  const box=$('referenceProjectList');if(!box)return;
  const embedded=getReferenceProjects();
  const learning=(state.learningRecords||[]).filter(r=>!embedded.some(p=>p.id===r.projectId));
  const refs=[...learning.map(r=>({...r,source:"learning"})),...embedded.map(p=>({...p,source:"legacy"}))];
  box.innerHTML=refs.length?refs.map(r=>`<article class="card reference-item"><div><strong>${esc(r.title||r.materialName||"Referenzdatensatz")}</strong><small>${esc(r.machineName||"")} · Schätzung ${euro(r.estimatedPrice)} · Tatsächlich ${r.actualPrice==null?"noch nicht eingetragen":euro(r.actualPrice)}</small><small>${num(r.actualMinutes)>0?`Ist-Zeit ${num(r.actualMinutes).toLocaleString("de-DE")} Min.`:"Keine Ist-Zeit"} · zählt nicht zu Umsatz oder Gewinn</small></div><div class="item-actions"><button data-edit-reference="${r.source}:${r.id}">Bearbeiten</button><button class="danger" data-delete-reference="${r.source}:${r.id}">Löschen</button></div></article>`).join(""):'<div class="empty-state">Noch keine Referenzprojekte oder Lerndaten gespeichert.</div>';
  box.querySelectorAll('[data-edit-reference]').forEach(b=>b.onclick=()=>{
    const [source,id]=b.dataset.editReference.split(":");
    const r=source==="learning"?(state.learningRecords||[]).find(x=>x.id===id):getReferenceProjects().find(x=>x.id===id);if(!r)return;
    const price=prompt("Tatsächlich verwendeter Verkaufspreis (leer = unbekannt):",r.actualPrice??"");
    if(price===null)return;
    const time=prompt("Tatsächliche Gesamtzeit in Minuten (leer = unbekannt):",num(r.actualMinutes)||"");
    if(time===null)return;
    r.actualPrice=price===""?null:num(price);r.actualMinutes=time===""?0:num(time);r.profit=r.actualPrice==null?null:r.actualPrice-num(r.cost);r.updated=new Date().toISOString();
    if(source==="legacy"){const linked=(state.learningRecords||[]).find(x=>x.projectId===r.id);if(linked){linked.actualPrice=r.actualPrice;linked.actualMinutes=r.actualMinutes;linked.profit=r.profit;linked.updated=r.updated;}}
    save();renderProjects();
  });
  box.querySelectorAll('[data-delete-reference]').forEach(b=>b.onclick=()=>{if(!confirm('Referenzdatensatz wirklich löschen? Ein echtes Kundenprojekt bleibt unberührt.'))return;const [source,id]=b.dataset.deleteReference.split(":");if(source==="learning")deleteLearningRecord(id);else state.projects=state.projects.filter(p=>p.id!==id);save();renderProjects();});
}
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
function projectFieldLabel(id){
  return ({matMain:"Hauptmaterial",matTransfer:"Übertragungsfolie",usageMain:"Materialverbrauch",usageTransfer:"Verbrauch Übertragungsfolie",printMinutes:"Druckdauer",engraveMinutes:"Gravurdauer",cutMinutes:"Schnittdauer",workMinutes:"Arbeitszeit",hourlyRate:"Stundenlohn",packaging:"Verpackung",otherCosts:"Sonstige Kosten",reserve:"Fehlerreserve",profit:"Gewinnaufschlag",quantity:"Stückzahl",colors:"Farben",plotMinutes:"Plottdauer",weedMinutes:"Entgitterzeit",mountMinutes:"Montagezeit",pressMinutes:"Presszeit",prepMinutes:"Vor-/Nachbereitung",textilePrice:"Textilpreis"})[id]||id;
}
function projectFieldValue(id,value){
  if(id==="matMain"||id==="matTransfer") return resolveMaterialSelection(value)?.name||"–";
  if(id==="machineSelect") return state.machines.find(m=>m.id===value)?.name||"–";
  return value===""?"–":value;
}
export function viewProject(id){
  const p=getRealProjects().find(x=>x.id===id);
  if(!p){alert("Projekt wurde nicht gefunden.");return;}
  const dialog=$("projectViewDialog");
  const details=Object.entries(p.fields||{}).filter(([fieldId])=>!["projectName","customerName","projectNotes","machineSelect","projectStatus","projectTags"].includes(fieldId)).map(([fieldId,value])=>`<div><span>${esc(projectFieldLabel(fieldId))}</span><strong>${esc(projectFieldValue(fieldId,value))}</strong></div>`).join("");
  const cons=(p.consumables||[]).map(r=>{const m=state.materials.find(x=>x.id===r.materialId);return m?`<div><span>${esc(m.name)}</span><strong>${num(r.quantity)} ${esc(workshopUnit(m))}</strong></div>`:""}).join("");
  $("projectViewTitle").textContent=p.title||"Projekt";
  $("projectViewContent").innerHTML=`
    ${(p.images||[]).length?`<div class="project-gallery">${p.images.map((img,i)=>`<figure><img class="project-view-image" src="${img}" alt="Projektbild ${i+1}"><button type="button" data-delete-image="${i}" class="image-delete" aria-label="Bild löschen">×</button></figure>`).join("")}</div>`:`<div class="project-image-empty">Noch kein Projektbild vorhanden.</div>`}
    <div class="project-image-actions"><label class="secondary file-button">＋ Bilder hinzufügen<input id="projectImageInput" type="file" accept="image/*" multiple></label></div>
    <div class="project-view-summary">
      <div><span>Kunde</span><strong>${esc(p.customer||"–")}</strong></div><div><span>Bereich</span><strong>${esc(p.type||"–")}</strong></div>
      <div><span>Maschine</span><strong>${esc(p.machineName||"–")}</strong></div><div><span>Datum</span><strong>${new Date(p.created||p.updated).toLocaleDateString("de-DE")}</strong></div>
      <div><span>Selbstkosten</span><strong>${euro(p.cost)}</strong></div><div><span>Gewinn</span><strong>${euro(num(p.sale)-num(p.cost))}</strong></div>
      ${p.estimatedPrice!=null?`<div><span>Ursprüngliche Schätzung</span><strong>${euro(p.estimatedPrice)}</strong></div>`:""}<div><span>Tatsächlicher Preis</span><strong>${euro(p.actualPrice??p.sale)}</strong></div>
      <div class="project-view-final"><span>Verkaufspreis</span><strong>${euro(p.sale)}</strong></div>
    </div>
    ${(p.tags||[]).length?`<div class="tag-row">${p.tags.map(t=>`<span>#${esc(t)}</span>`).join("")}</div>`:""}
    ${p.notes?`<div class="project-view-notes"><b>Notizen</b><p>${esc(p.notes)}</p></div>`:""}
    ${details?`<h3>Kalkulationsdaten</h3><div class="project-view-details">${details}</div>`:""}
    ${cons?`<h3>Verbrauchsmaterial</h3><div class="project-view-details">${cons}</div>`:""}`;

  const statusSelect=$("projectViewStatusSelect");
  statusSelect.value=p.status||"offer";
  statusSelect.onchange=()=>{
    p.status=statusSelect.value;
    p.updated=new Date().toISOString();
    save();renderProjects();updateHome();
  };
  $("projectViewEditBtn").onclick=()=>{dialog.close();loadProject(id,false)};
  $("offerPdfBtn").onclick=()=>printOffer(p);
  $("closeProjectViewBtn").onclick=()=>dialog.close();
  dialog.onclick=e=>{if(e.target===dialog)dialog.close()};
  $("projectImageInput")?.addEventListener("change",async e=>{
    const files=[...(e.target.files||[])];if(!files.length)return;
    try{
      p.images=p.images||[];
      for(const file of files.slice(0,Math.max(0,6-p.images.length)))p.images.push(await compressProjectImage(file));
      p.updated=new Date().toISOString();save();renderProjects();dialog.close();viewProject(id);
    }catch(err){console.error(err);alert("Mindestens ein Bild konnte nicht verarbeitet werden.")}
  });
  dialog.querySelectorAll("[data-delete-image]").forEach(btn=>btn.onclick=()=>{
    if(confirm("Dieses Projektbild löschen?")){p.images.splice(Number(btn.dataset.deleteImage),1);p.updated=new Date().toISOString();save();renderProjects();dialog.close();viewProject(id)}
  });
  try{if(!dialog.open)dialog.showModal()}catch(err){console.error(err);dialog.setAttribute("open","")}
}

function printOffer(p){
  const today=new Date();
  const date=today.toLocaleDateString("de-DE");
  const created=new Date(p.created||p.updated||Date.now());
  const offerNo=`A-${created.getFullYear()}-${String(created.getMonth()+1).padStart(2,"0")}${String(created.getDate()).padStart(2,"0")}-${String((p.id||"").replace(/\D/g,"").slice(-3)||"001").padStart(3,"0")}`;
  const service=esc(p.title||p.type||"Individuelle Anfertigung");
  const qty=Math.max(1,num(p.qty)||1);
  const unitPrice=num(p.sale)/qty;
  const address=(p.customerAddress||p.fields?.customerAddress||p.customer||"").trim();
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
    <table><thead><tr><th>Pos.</th><th>Beschreibung</th><th>Menge</th><th>Einzelpreis</th><th>Gesamt</th></tr></thead><tbody><tr><td>1.</td><td>${service}</td><td>${qty.toLocaleString("de-DE",{minimumFractionDigits:0,maximumFractionDigits:2})}</td><td>${euro(unitPrice)}</td><td>${euro(p.sale)}</td></tr></tbody></table>
    <div class="total"><span>Gesamt</span><strong>${euro(p.sale)}</strong></div>
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
  if(!popup){alert("Die Druckansicht wurde blockiert. Bitte Pop-ups für diese Seite erlauben.");return;}
  popup.document.open();popup.document.write(doc);popup.document.close();
}

function loadProject(id,duplicate=false){
  const p=getRealProjects().find(x=>x.id===id);if(!p)return;
  loadCalculatorData(p,{duplicate,editingProjectId:duplicate?null:p.id});
}
$("clearProjectsBtn").onclick=()=>{const real=getRealProjects();if(real.length&&confirm("Wirklich alle echten Kundenprojekte löschen? Referenz- und Lerndaten bleiben erhalten.")){const ids=new Set(real.map(p=>p.id));state.projects=state.projects.filter(p=>!ids.has(p.id));save();renderProjects()}};
$("projectSearch").oninput=renderProjects;
if($("projectStatusFilter"))$("projectStatusFilter").onchange=renderProjects;
if($("projectSort"))$("projectSort").onchange=renderProjects;
if($("newOrderBtn"))$("newOrderBtn").onclick=()=>startNewOrder("3d");
if($("projectNewBtn"))$("projectNewBtn").onclick=()=>startNewOrder("3d");
if($("manageTemplatesBtn"))$("manageTemplatesBtn").onclick=()=>{if(!(state.templates||[]).length){alert("Noch keine Vorlagen vorhanden. Erstelle eine Vorlage über ein gespeichertes Projekt.");return;} const names=state.templates.map((t,i)=>`${i+1}. ${t.name}`).join("\n");const n=prompt(`Vorlagen verwalten\n\n${names}\n\nNummer zum Löschen eingeben:`);const idx=Number(n)-1;if(Number.isInteger(idx)&&idx>=0&&idx<state.templates.length&&confirm(`Vorlage „${state.templates[idx].name}“ löschen?`)){state.templates.splice(idx,1);save();updateHome();}};
