(()=>{"use strict";
const KEY="dla_bwa_months_v1", $=id=>document.getElementById(id);
const euro=n=>Number(n||0).toLocaleString("de-DE",{style:"currency",currency:"EUR"});
const escape=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let months={};
try{months=JSON.parse(localStorage.getItem(KEY)||"{}")||{}}catch{months={}}
function notify(s,error=false){$("bwaMessage").textContent=s;$("bwaMessage").style.color=error?"#ef8c8c":""}
function save(){try{localStorage.setItem(KEY,JSON.stringify(months));return true}catch{notify("Speichern im Browser fehlgeschlagen. Bitte Datensicherung herunterladen.",true);return false}}
function amount(s){const v=String(s).replace(/\s/g,"").replace(/\./g,"").replace(",",".");return Number(v)}
let selected="all";
const costNames={"1100":"Personalkosten","1120":"Raumkosten","1140":"Steuern","1150":"Versicherungen / Beiträge","1160":"Besondere Kosten","1180":"Kfz-Kosten","1200":"Werbung / Reisen","1220":"Warenabgabe","1240":"Abschreibungen","1250":"Reparaturen","1260":"Sonstige Kosten"};
const monthName=k=>new Date(k+"-01T12:00:00").toLocaleDateString("de-DE",{month:"long",year:"numeric"});
function render(){
const entries=Object.values(months).filter(x=>x&&/^\d{4}-\d{2}$/.test(x.month)).sort((a,b)=>a.month.localeCompare(b.month));
if(selected!=="all"&&!entries.some(x=>x.month===selected))selected="all";
$("bwaMonthSelect").innerHTML='<option value="all">Alle Monate – Gesamtübersicht</option>'+entries.map(x=>'<option value="'+escape(x.month)+'">'+escape(monthName(x.month))+'</option>').join("");
$("bwaMonthSelect").value=selected;
const chosen=selected==="all"?entries:entries.filter(x=>x.month===selected);
const sum=k=>chosen.reduce((n,x)=>n+Number(x[k]||0),0);
for(const [id,k] of [["bwaRevenue","revenue"],["bwaMaterial","material"],["bwaCosts","costs"],["bwaProfit","profit"]])$(id).textContent=euro(k==="costs"?Math.abs(sum(k)):sum(k));
$("bwaProfit").className=sum("profit")<0?"negative":"positive";
if(selected==="all")$("bwaBreakdown").innerHTML='<p class="bwa-hint">'+entries.length+' Monat(e) importiert. Wähle einen Monat für die Kostenaufstellung.</p>';
else{const x=chosen[0];const details=Object.entries(costNames).filter(([code])=>Number(x?.amounts?.[code]||0)!==0).map(([code,name])=>'<div class="bwa-detail"><span>'+escape(name)+'</span><strong>'+euro(Math.abs(Number(x.amounts[code])))+'</strong></div>').join("");$("bwaBreakdown").innerHTML='<h4>Kostenaufstellung – '+escape(monthName(selected))+'</h4>'+(details||'<p>Keine Kostenpositionen vorhanden.</p>');}
if(!entries.length){$("bwaTable").textContent="Noch keine BWA eingelesen.";return}
let totals={revenue:0,material:0,costs:0,profit:0};
const rows=entries.map(x=>{for(const k of Object.keys(totals))totals[k]+=Number(x[k]||0);return '<tr data-bwa-month="'+escape(x.month)+'" class="'+(selected===x.month?"bwa-selected":"")+'"><td>'+escape(monthName(x.month))+'</td><td>'+euro(x.revenue)+'</td><td>'+euro(Math.abs(x.material))+'</td><td>'+euro(Math.abs(x.costs))+'</td><td><strong>'+euro(x.profit)+'</strong></td><td><button type="button" class="secondary small" data-bwa-delete="'+escape(x.month)+'">Löschen</button></td></tr>'}).join("");
$("bwaTable").innerHTML='<table><thead><tr><th>Monat</th><th>Umsatz</th><th>Material</th><th>Weitere Kosten</th><th>Ergebnis</th><th></th></tr></thead><tbody>'+rows+'<tr><th>Summe</th><th>'+euro(totals.revenue)+'</th><th>'+euro(Math.abs(totals.material))+'</th><th>'+euro(Math.abs(totals.costs))+'</th><th>'+euro(totals.profit)+'</th><th></th></tr></tbody></table>';
}
$("bwaMonthSelect").addEventListener("change",e=>{selected=e.target.value;render()});
$("bwaTable").addEventListener("click",e=>{const key=e.target.closest("[data-bwa-delete]")?.dataset.bwaDelete;if(key&&confirm("BWA "+key+" wirklich entfernen?")){delete months[key];save();render()}else if(!key){const m=e.target.closest("[data-bwa-month]")?.dataset.bwaMonth;if(m){selected=m;render()}}});
function download(name,text,type){const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement("a");a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000)}
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
$("bwaPrint").addEventListener("click",()=>{const entries=Object.values(months).sort((a,b)=>a.month.localeCompare(b.month));if(!entries.length){notify("Bitte zuerst eine BWA einlesen.",true);return}
const rows=entries.map(x=>'<tr><td>'+escape(x.month)+'</td><td>'+euro(x.revenue)+'</td><td>'+euro(Math.abs(x.material))+'</td><td>'+euro(Math.abs(x.costs))+'</td><td>'+euro(x.profit)+'</td></tr>').join("");
const totals=k=>euro(entries.reduce((s,x)=>s+Number(x[k]||0),0));
const doc='<!doctype html><html lang="de"><meta charset="utf-8"><title>Monatliche Gewinnauswertung</title><style>body{font:15px Arial,sans-serif;max-width:1050px;margin:40px auto;padding:0 20px;color:#222}table{border-collapse:collapse;width:100%}td,th{padding:12px 8px;border-bottom:1px solid #bbb;text-align:right}td:first-child,th:first-child{text-align:left}thead,tfoot{background:#eee}.note{margin-top:30px;font-size:12px;line-height:1.6}button{padding:12px;margin-bottom:20px}@media print{button{display:none}body{margin:10mm auto}}</style><button onclick="window.print()">Drucken / als PDF speichern</button><h1>Daniel\'s Laser Art – Monatliche Gewinnauswertung</h1><p>Grundlage: importierte BWAs aus Papierkram · erstellt am '+new Date().toLocaleDateString("de-DE")+'</p><table><thead><tr><th>Monat</th><th>Umsatz</th><th>Material</th><th>Weitere Kosten</th><th>Ergebnis</th></tr></thead><tbody>'+rows+'</tbody><tfoot><tr><th>Summe</th><th>'+totals("revenue")+'</th><th>'+totals("material")+'</th><th>'+totals("costs")+'</th><th>'+totals("profit")+'</th></tr></tfoot></table><p class="note">Vorläufige buchhalterische BWA-Ergebnisse. Keine amtliche Einkommensbescheinigung und keine Berechnung des für ALG I anrechenbaren Nebeneinkommens. Original-BWAs aufbewahren.</p></html>';
download("Daniels_Laser_Art_Monatsnachweis.html",doc,"text/html;charset=utf-8")});
render();
})();