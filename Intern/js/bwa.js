(()=>{"use strict";
const KEY="dla_bwa_months_v1", $=id=>document.getElementById(id);
const euro=n=>Number(n||0).toLocaleString("de-DE",{style:"currency",currency:"EUR"});
const escape=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let months={};
let cloudModule=null,cloudReady=false,verifiedSync=null;
let syncInProgress=false;
function validMonths(data){return data&&typeof data==="object"&&!Array.isArray(data)?Object.fromEntries(Object.entries(data).filter(([key,v])=>/^\d{4}-\d{2}$/.test(key)&&v&&Number.isFinite(Number(v.profit)))):{}}
function persistCloud(){if(!cloudReady||!cloudModule)return;notify("Lokal gespeichert. Für geprüfte Cloud-Übertragung auf Jetzt synchronisieren klicken.")}
function initCloud(){import("./storage.js?v=7.2").then(mod=>{cloudModule=mod;verifiedSync=mod.syncBwaMonthsVerified;document.addEventListener("dla:state-loaded",syncFromCloud);document.addEventListener("dla:security-reset",()=>{cloudReady=false;months={};render();notify("Abgemeldet – Cloud-Daten nicht geladen.")});if(document.getElementById("authGate")?.classList.contains("hidden"))syncFromCloud()}).catch(e=>notify("Cloud-Anbindung konnte nicht geladen werden: "+e.message,true))}
function syncFromCloud(){if(!cloudModule)return;cloudReady=true;const remote=validMonths(cloudModule.state.bwaMonths);const local=validMonths(months);const keys=Object.keys(remote);if(keys.length){months={...remote,...local};try{localStorage.setItem(KEY,JSON.stringify(months))}catch{};render();notify("Monatsdaten aus Supabase geladen.");const missing=Object.keys(local).filter(k=>!remote[k]);if(missing.length)notify("Cloud-Daten geladen; "+missing.length+" lokale Monat(e) müssen noch synchronisiert werden.")}else if(Object.keys(local).length){months=local;render();notify("Lokale Monatsdaten vorhanden. Bitte Jetzt synchronisieren klicken.")}else{months={};render();notify("Cloud-Synchronisierung bereit.")}}

try{months=JSON.parse(localStorage.getItem(KEY)||"{}")||{}}catch{months={}}
function notify(s,error=false){$("bwaMessage").textContent=s;$("bwaMessage").style.color=error?"#ef8c8c":""}
function save(){try{localStorage.setItem(KEY,JSON.stringify(months));persistCloud();return true}catch{notify("Speichern im Browser fehlgeschlagen. Bitte Datensicherung herunterladen.",true);return false}}
function amount(s){const v=String(s).replace(/\s/g,"").replace(/\./g,"").replace(",",".");return Number(v)}
let selectedYear="all",selected="all",printYear="all",printMonth="all";
const allEntries=()=>Object.values(months).filter(x=>x&&/^\d{4}-\d{2}$/.test(x.month)).sort((a,b)=>a.month.localeCompare(b.month));
function filterControls(entries){
 const years=[...new Set(entries.map(x=>x.month.slice(0,4)))].sort().reverse();
 if(selectedYear!=="all"&&!years.includes(selectedYear))selectedYear="all";
 if(printYear!=="all"&&!years.includes(printYear))printYear="all";
 const yearOptions='<option value="all">Alle Jahre</option>'+years.map(y=>'<option value="'+y+'">'+y+'</option>').join("");
 $("bwaYearSelect").innerHTML=yearOptions;$("bwaYearSelect").value=selectedYear;
 $("bwaPrintYear").innerHTML=yearOptions;$("bwaPrintYear").value=printYear;
 const makeMonths=(year)=>entries.filter(x=>year==="all"||x.month.startsWith(year+"-"));
 const view=makeMonths(selectedYear),exportable=makeMonths(printYear);
 if(selected!=="all"&&!view.some(x=>x.month===selected))selected="all";
 if(printMonth!=="all"&&!exportable.some(x=>x.month===printMonth))printMonth="all";
 $("bwaMonthSelect").innerHTML='<option value="all">Alle Monate</option>'+view.map(x=>'<option value="'+x.month+'">'+escape(monthName(x.month))+'</option>').join("");
 $("bwaMonthSelect").value=selected;
 $("bwaPrintMonth").innerHTML='<option value="all">Alle Monate</option>'+exportable.map(x=>'<option value="'+x.month+'">'+escape(monthName(x.month))+'</option>').join("");
 $("bwaPrintMonth").value=printMonth;
}
const costNames={"1100":"Personalkosten","1120":"Raumkosten","1140":"Steuern","1150":"Versicherungen / Beiträge","1160":"Besondere Kosten","1180":"Kfz-Kosten","1200":"Werbung / Reisen","1220":"Warenabgabe","1240":"Abschreibungen","1250":"Reparaturen","1260":"Sonstige Kosten"};
const monthName=k=>new Date(k+"-01T12:00:00").toLocaleDateString("de-DE",{month:"long",year:"numeric"});
function render(){
const entries=allEntries();
filterControls(entries);
const yearEntries=entries.filter(x=>selectedYear==="all"||x.month.startsWith(selectedYear+"-"));
const chosen=selected==="all"?yearEntries:yearEntries.filter(x=>x.month===selected);
const sum=k=>chosen.reduce((n,x)=>n+Number(x[k]||0),0);
for(const [id,k] of [["bwaRevenue","revenue"],["bwaMaterial","material"],["bwaCosts","costs"],["bwaProfit","profit"]])$(id).textContent=euro(k==="costs"?Math.abs(sum(k)):sum(k));
$("bwaProfit").className=sum("profit")<0?"negative":"positive";
if(selected==="all")$("bwaBreakdown").innerHTML='<p class="bwa-hint">'+chosen.length+' Monat(e) im ausgewählten Zeitraum. Wähle einen Monat für die Kostenaufstellung.</p>';
else{const x=chosen[0];const details=Object.entries(costNames).filter(([code])=>Number(x?.amounts?.[code]||0)!==0).map(([code,name])=>'<div class="bwa-detail"><span>'+escape(name)+'</span><strong>'+euro(Math.abs(Number(x.amounts[code])))+'</strong></div>').join("");$("bwaBreakdown").innerHTML='<h4>Kostenaufstellung – '+escape(monthName(selected))+'</h4>'+(details||'<p>Keine Kostenpositionen vorhanden.</p>');}
if(!entries.length){$("bwaTable").textContent="Noch keine BWA eingelesen.";return}
let totals={revenue:0,material:0,costs:0,profit:0};
const rows=yearEntries.map(x=>{for(const k of Object.keys(totals))totals[k]+=Number(x[k]||0);return '<tr data-bwa-month="'+escape(x.month)+'" class="'+(selected===x.month?"bwa-selected":"")+'"><td>'+escape(monthName(x.month))+'</td><td>'+euro(x.revenue)+'</td><td>'+euro(Math.abs(x.material))+'</td><td>'+euro(Math.abs(x.costs))+'</td><td><strong>'+euro(x.profit)+'</strong></td><td><button type="button" class="secondary small" data-bwa-delete="'+escape(x.month)+'">Löschen</button></td></tr>'}).join("");
$("bwaTable").innerHTML='<table><thead><tr><th>Monat</th><th>Umsatz</th><th>Material</th><th>Weitere Kosten</th><th>Ergebnis</th><th></th></tr></thead><tbody>'+rows+'<tr><th>Summe</th><th>'+euro(totals.revenue)+'</th><th>'+euro(Math.abs(totals.material))+'</th><th>'+euro(Math.abs(totals.costs))+'</th><th>'+euro(totals.profit)+'</th><th></th></tr></tbody></table>';
}
$("bwaYearSelect").addEventListener("change",e=>{selectedYear=e.target.value;selected="all";render()});
$("bwaMonthSelect").addEventListener("change",e=>{selected=e.target.value;render()});
$("bwaPrintYear").addEventListener("change",e=>{printYear=e.target.value;printMonth="all";filterControls(allEntries())});
$("bwaPrintMonth").addEventListener("change",e=>{printMonth=e.target.value});
$("bwaTable").addEventListener("click",e=>{const key=e.target.closest("[data-bwa-delete]")?.dataset.bwaDelete;if(key&&confirm("BWA "+key+" wirklich entfernen?")){delete months[key];save();render()}else if(!key){const m=e.target.closest("[data-bwa-month]")?.dataset.bwaMonth;if(m){selectedYear=m.slice(0,4);selected=m;render()}}});
function download(name,text,type){const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement("a");a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000)}
$("bwaSync").addEventListener("click",async()=>{const btn=$("bwaSync");if(!cloudReady||!verifiedSync){notify("Bitte erst die Supabase-Anmeldung abschließen.",true);return}btn.disabled=true;notify("Übertrage Monatsdaten und prüfe die Cloud …");try{const merged=await verifiedSync(months);months=merged;localStorage.setItem(KEY,JSON.stringify(months));render();notify("Cloud-Synchronisierung bestätigt: "+Object.keys(merged).length+" Monat(e) in Supabase gespeichert.")}catch(e){notify("Cloud-Synchronisierung fehlgeschlagen: "+e.message,true)}finally{btn.disabled=false}});
$("bwaBackup").addEventListener("click",()=>download("Daniels_Laser_Art_Datensicherung.json",JSON.stringify({format:"dla-bwa-backup-v1",data:months},null,2),"application/json"));
$("bwaRestore").addEventListener("change",async e=>{const file=e.target.files?.[0];if(!file)return;try{const raw=JSON.parse(await file.text());const data=raw.format==="dla-bwa-backup-v1"?raw.data:raw.data||raw;if(!data||typeof data!=="object"||Array.isArray(data))throw Error("Unbekanntes Sicherungsformat");let count=0;for(const [key,value] of Object.entries(data)){if(!/^\d{4}-\d{2}$/.test(key)||!value||!Number.isFinite(Number(value.profit)))continue;months[key]={...value,month:key,revenue:Number(value.revenue||0),material:Number(value.material||0),costs:Number(value.costs||0),profit:Number(value.profit)};count++}if(!count)throw Error("Keine gültigen Monatsdaten");save();render();notify(count+" Monat(e) wiederhergestellt.")}catch(err){notify("Import fehlgeschlagen: "+err.message,true)}e.target.value=""});
let pdfjsPromise;
async function pdfjs(){if(window.pdfjsLib)return window.pdfjsLib;if(!pdfjsPromise)pdfjsPromise=new Promise((resolve,reject)=>{const script=document.createElement("script");script.src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";script.onload=()=>resolve(window.pdfjsLib);script.onerror=()=>reject(Error("PDF-Bibliothek konnte nicht geladen werden"));document.head.append(script)});const lib=await pdfjsPromise;lib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";return lib}
async function parsePdf(file){const lib=await pdfjs();const pdf=await lib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;let lines=[];
for(let page=1;page<=pdf.numPages;page++){const content=await(await pdf.getPage(page)).getTextContent();const groups=new Map();for(const item of content.items){if(!item.str?.trim())continue;const y=Math.round(item.transform[5]/3)*3;if(!groups.has(y))groups.set(y,[]);groups.get(y).push({x:item.transform[4],s:item.str})}for(const group of groups.values())lines.push(group.sort((a,b)=>a.x-b.x).map(x=>x.s).join(" ").replace(/\s+/g," ").trim())}
const text=lines.join("\n");const match=text.match(/(\d{2})\.(\d{2})\.(20\d{2})\s*[-–]\s*(\d{2})\.(\d{2})\.(20\d{2})/)||file.name.match(/(20\d{2})-(\d{2})-\d{2}\.\.(20\d{2})-(\d{2})-\d{2}/);
if(!match)throw Error("Monatszeitraum nicht erkannt");
const month=match.length===7?match[3]+"-"+match[2]:match[1]+"-"+match[2];
if(match.length===7&&(match[2]!==match[5]||match[3]!==match[6])||match.length===5&&(match[1]!==match[3]||match[2]!==match[4]))throw Error("Nur einzelne volle Monats-BWAs importieren");
const codes={};for(const line of lines){const m=line.match(/^\s*(\d{4})\s+.+?\s+(-?[\d.]+(?:,\d{1,2})?)\s*$/);if(m&&["1020","1051","1060","1240","1280","1380"].includes(m[1]))codes[m[1]]=amount(m[2])}
if(!Number.isFinite(codes["1380"])||!Number.isFinite(codes["1051"]))throw Error("BWA-Positionen 1051/1380 nicht erkannt. Bitte PDF prüfen.");
const revenue=codes["1020"]??codes["1051"],material=Math.abs(codes["1060"]||0),profit=codes["1380"],costs=Math.round((revenue-material-profit)*100)/100;
return {month,filename:file.name,revenue,material,costs,profit,amounts:codes,updated:new Date().toISOString()}
}
$("bwaPdf").addEventListener("change",async e=>{const files=[...e.target.files];for(const file of files){try{const data=await parsePdf(file);if(months[data.month]&&!confirm(data.month+" ist bereits vorhanden. Überschreiben?"))continue;months[data.month]=data;save();render();notify(file.name+": "+euro(data.profit)+" Ergebnis eingelesen.")}catch(err){notify(file.name+": "+err.message,true)}}e.target.value=""});
$("bwaPrint").addEventListener("click",()=>{
 const entries=allEntries().filter(x=>(printYear==="all"||x.month.startsWith(printYear+"-"))&&(printMonth==="all"||x.month===printMonth));
 if(!entries.length){notify("Für diesen Nachweis sind keine Monatsdaten vorhanden.",true);return}
 const total=k=>entries.reduce((n,x)=>n+Number(x[k]||0),0);
 const income=total("revenue"),result=total("profit"),expense=income-result;
 const period=printMonth!=="all"?monthName(printMonth):printYear!=="all"?"Jahr "+printYear:"Alle importierten Monate";
 const money=n=>euro(Math.abs(n));
 const resultLabel=n=>n<0?"Verlust":"Gewinn";
 const resultClass=n=>n<0?"loss":"gain";
 const details=entries.map(x=>{
   const expenses=Number(x.revenue||0)-Number(x.profit||0);
   const named=Object.entries(costNames).filter(([code])=>Number(x.amounts?.[code]||0)!==0);
   const detailRows=named.map(([code,label])=>'<tr><td>'+escape(label)+'</td><td>'+money(Number(x.amounts[code]))+'</td></tr>').join("");
   return '<section class="month"><h2>'+escape(monthName(x.month))+'</h2><table><tbody>'+
   '<tr><th>Betriebseinnahmen (Umsatz)</th><td>'+euro(x.revenue)+'</td></tr>'+
   '<tr><th>Material / Wareneinkauf</th><td>'+money(x.material)+'</td></tr>'+
   '<tr><th>Weitere Aufwendungen (rechnerisch)</th><td>'+money(x.costs)+'</td></tr>'+
   '<tr class="sum"><th>Ausgaben / Aufwendungen gesamt (rechnerisch)</th><td>'+money(expenses)+'</td></tr>'+
   '<tr class="result '+resultClass(x.profit)+'"><th>'+resultLabel(x.profit)+' laut BWA</th><td>'+money(x.profit)+'</td></tr></tbody></table>'+
   (detailRows?'<h3>In der BWA ausgewiesene Einzelpositionen</h3><table><tbody>'+detailRows+'</tbody></table>':'')+
   '<p class="hint">Die Einzelpositionen sind Teil der Gesamtausgaben und werden nicht zusätzlich abgezogen.</p></section>';
 }).join("");
 const rows=entries.map(x=>'<tr><td>'+escape(monthName(x.month))+'</td><td>'+euro(x.revenue)+'</td><td>'+money(Number(x.revenue)-Number(x.profit))+'</td><td class="'+resultClass(x.profit)+'">'+(x.profit<0?"−":"")+money(x.profit)+'</td></tr>').join("");
 const doc='<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Gewinnnachweis – '+escape(period)+'</title><style>'+
 'body{font:15px/1.5 Arial,sans-serif;color:#242424;max-width:900px;margin:30px auto;padding:0 22px}h1{font-size:24px;margin-bottom:5px}h2{font-size:19px;margin:22px 0 9px}h3{font-size:14px;margin:16px 0 6px}.subtitle{color:#555;margin:0 0 20px}.toolbar{margin-bottom:24px}button{padding:12px 16px;cursor:pointer}table{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums}th,td{padding:9px 8px;border-bottom:1px solid #ddd}th{text-align:left;font-weight:600}td:last-child,th:last-child{text-align:right}.summary{background:#f3f3f3;padding:14px 18px;border:1px solid #ddd;border-radius:8px}.summary .line{display:flex;justify-content:space-between;gap:15px;padding:6px 0}.summary .final{border-top:2px solid #777;margin-top:7px;padding-top:12px;font-size:19px;font-weight:bold}.gain{color:#176536}.loss{color:#a12020}.month{break-inside:avoid;page-break-inside:avoid;margin-top:25px;border-top:1px solid #bbb}.sum{background:#f5f5f5}.result{font-weight:bold}.hint,.note{font-size:12px;color:#555}.note{border-top:1px solid #ccc;padding-top:12px;margin-top:26px}@page{size:A4;margin:15mm}@media print{body{margin:0;max-width:none;padding:0;font-size:11pt}.toolbar{display:none}.month{break-inside:avoid}}'+
 '</style></head><body><div class="toolbar"><button onclick="window.print()">Drucken / als PDF speichern</button></div>'+
 '<h1>Daniel’s Laser Art – Gewinn- und Verlustnachweis</h1><p class="subtitle">Auswertungszeitraum: '+escape(period)+' · erstellt am '+new Date().toLocaleDateString("de-DE")+'<br>Grundlage: importierte betriebswirtschaftliche Auswertungen (BWA) aus Papierkram</p>'+
 '<div class="summary"><div class="line"><strong>Betriebseinnahmen</strong><strong>'+euro(income)+'</strong></div>'+
 '<div class="line"><strong>Ausgaben / Aufwendungen (rechnerisch)</strong><strong>'+money(expense)+'</strong></div>'+
 '<div class="line final"><span>'+resultLabel(result)+' laut BWA</span><span class="'+resultClass(result)+'">'+money(result)+'</span></div></div>'+
 (entries.length>1?'<h2>Monatsübersicht</h2><table><thead><tr><th>Monat</th><th>Einnahmen</th><th>Ausgaben / Aufwendungen</th><th>Ergebnis</th></tr></thead><tbody>'+rows+'</tbody></table>':'')+
 details+'<p class="note">Die Ausgaben / Aufwendungen sind rechnerisch aus BWA-Umsatz abzüglich BWA-Ergebnis ermittelt und können Abschreibungen sowie nicht zahlungswirksame Posten enthalten. Daher sind sie nicht zwingend identisch mit den tatsächlichen Zahlungsabflüssen oder den Betriebsausgaben einer Einnahmenüberschussrechnung. Vorläufige buchhalterische Ergebnisse, keine amtliche Einkommensbescheinigung und keine Berechnung des für ALG I anrechenbaren Nebeneinkommens. Original-BWAs als Belege aufbewahren.</p></body></html>';
 download("Daniels_Laser_Art_Nachweis_"+(printMonth!=="all"?printMonth:printYear!=="all"?printYear:"Gesamt")+".html",doc,"text/html;charset=utf-8");
});
render();
initCloud();
})();