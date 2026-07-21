
const DEFAULTS = {
  settings:{
    profit:30, labor:15, printMachine:0.60, laserEngrave:0.10, laserCut:0.15,
    plotter:0.10, press:0.15, waste:5, packaging:0.50, rounding:0.10, psychological:0.01
  },
  materials:[
    {id:crypto.randomUUID(),name:'PLA+ Schwarz',area:'3D-Druck',price:20,amount:1000,unit:'g',note:'Beispiel'},
    {id:crypto.randomUUID(),name:'PLA+ Weiß',area:'3D-Druck',price:20,amount:1000,unit:'g',note:'Beispiel'},
    {id:crypto.randomUUID(),name:'PETG',area:'3D-Druck',price:24,amount:1000,unit:'g',note:'Beispiel'},
    {id:crypto.randomUUID(),name:'Sperrholz 3 mm',area:'Laser',price:4.5,amount:1800,unit:'cm²',note:'30 × 60 cm'},
    {id:crypto.randomUUID(),name:'Sperrholz 4 mm',area:'Laser',price:5.5,amount:1800,unit:'cm²',note:'30 × 60 cm'},
    {id:crypto.randomUUID(),name:'Schiefer',area:'Laser',price:3,amount:540,unit:'cm²',note:'30 × 18 cm'},
    {id:crypto.randomUUID(),name:'Vinylfolie Schwarz',area:'Vinyl',price:8,amount:3000,unit:'cm²',note:'30 cm × 1 m'},
    {id:crypto.randomUUID(),name:'Vinylfolie Weiß',area:'Vinyl',price:8,amount:3000,unit:'cm²',note:'30 cm × 1 m'},
    {id:crypto.randomUUID(),name:'Übertragungsfolie',area:'Übertragung',price:5,amount:3000,unit:'cm²',note:'30 cm × 1 m'},
    {id:crypto.randomUUID(),name:'Textilfolie Schwarz',area:'Textil',price:12,amount:3000,unit:'cm²',note:'30 cm × 1 m'},
    {id:crypto.randomUUID(),name:'Textilfolie Weiß',area:'Textil',price:12,amount:3000,unit:'cm²',note:'30 cm × 1 m'}
  ]
};
let state = JSON.parse(localStorage.getItem('dlaKalkulator') || 'null') || structuredClone(DEFAULTS);
const save=()=>localStorage.setItem('dlaKalkulator',JSON.stringify(state));
const euro=n=>(Number(n)||0).toLocaleString('de-DE',{style:'currency',currency:'EUR'});
const num=v=>Number(v)||0;
const byArea=a=>state.materials.filter(m=>m.area===a);
const unitPrice=m=>m?num(m.price)/Math.max(num(m.amount),.000001):0;
function roundUp(v,step){return Math.ceil(v/step)*step}
function finalPrice(cost,profit,waste,qty){
  const total=cost*(1+waste/100)*(1+profit/100);
  const per=total/Math.max(qty,1);
  return Math.max(0,roundUp(per,state.settings.rounding)-state.settings.psychological);
}
function showView(id){
  document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===id));
  document.getElementById('drawer').classList.remove('open');
  window.scrollTo({top:0,behavior:'smooth'});
}
document.addEventListener('click',e=>{
  const target=e.target.closest('[data-view]');
  if(target) showView(target.dataset.view);
});
document.getElementById('menuBtn').onclick=()=>document.getElementById('drawer').classList.toggle('open');

function renderMaterials(){
  const box=document.getElementById('materialList');
  box.innerHTML='';
  state.materials.sort((a,b)=>a.area.localeCompare(b.area)||a.name.localeCompare(b.name)).forEach(m=>{
    const el=document.createElement('div');
    el.className='material-card';
    el.innerHTML=`<div class="material-top"><div><b>${m.name}</b><div class="material-meta">${m.area} · ${m.price.toFixed(2)} € / ${m.amount} ${m.unit}${m.note?' · '+m.note:''}</div><span class="price-badge">${unitPrice(m).toFixed(4)} € je ${m.unit}</span></div><div class="material-actions"><button class="small-btn edit">✏️</button><button class="small-btn del">🗑️</button></div></div>`;
    el.querySelector('.edit').onclick=()=>openMaterial(m);
    el.querySelector('.del').onclick=()=>{if(confirm(`„${m.name}“ löschen?`)){state.materials=state.materials.filter(x=>x.id!==m.id);save();renderAll();}};
    box.appendChild(el);
  });
}
const dialog=document.getElementById('materialDialog');
document.getElementById('addMaterialBtn').onclick=()=>openMaterial();
function openMaterial(m=null){
  document.getElementById('materialDialogTitle').textContent=m?'Material bearbeiten':'Material hinzufügen';
  document.getElementById('materialId').value=m?.id||'';
  document.getElementById('materialName').value=m?.name||'';
  document.getElementById('materialArea').value=m?.area||'3D-Druck';
  document.getElementById('materialPrice').value=m?.price||'';
  document.getElementById('materialAmount').value=m?.amount||'';
  document.getElementById('materialUnit').value=m?.unit||'g';
  document.getElementById('materialNote').value=m?.note||'';
  dialog.showModal();
}
document.getElementById('materialForm').addEventListener('submit',e=>{
  if(e.submitter?.value==='cancel') return;
  e.preventDefault();
  const id=document.getElementById('materialId').value||crypto.randomUUID();
  const m={id,name:materialName.value.trim(),area:materialArea.value,price:num(materialPrice.value),amount:num(materialAmount.value),unit:materialUnit.value,note:materialNote.value.trim()};
  const i=state.materials.findIndex(x=>x.id===id);
  if(i>=0) state.materials[i]=m; else state.materials.push(m);
  save();dialog.close();renderAll();
});

const calcDefs={
  druck:{title:'3D-Druck',area:'3D-Druck',fields:[
    ['material','Material','select'],['usage','Filamentverbrauch (g)','number',100],['duration','Druckdauer (Min.)','number',300],
    ['laborMin','Arbeitszeit (Min.)','number',10],['other','Sonstige Kosten (€)','number',0],['qty','Stückzahl','number',1]
  ],calc:v=>{
    const m=state.materials.find(x=>x.id===v.material);
    const mat=unitPrice(m)*v.usage, machine=v.duration/60*state.settings.printMachine, labor=v.laborMin/60*state.settings.labor;
    const base=mat+machine+labor+state.settings.packaging+v.other;
    return [['Materialkosten',mat],['Maschinenkosten',machine],['Arbeitskosten',labor],['Verpackung',state.settings.packaging],['Gesamtkosten',base*(1+state.settings.waste/100)],['Gewinn',base*(1+state.settings.waste/100)*state.settings.profit/100],['END',finalPrice(base,state.settings.profit,state.settings.waste,v.qty)]];
  }},
  laser:{title:'Laser',area:'Laser',fields:[
    ['material','Material','select'],['areaUsed','Verbrauchte Fläche (cm²)','number',300],['engrave','Gravurdauer (Min.)','number',20],
    ['cut','Schnittdauer (Min.)','number',10],['laborMin','Arbeitszeit (Min.)','number',10],['extras','Zubehör / Farbe / Kleber (€)','number',0],
    ['other','Sonstige Kosten (€)','number',0],['qty','Stückzahl','number',1]
  ],calc:v=>{
    const m=state.materials.find(x=>x.id===v.material), mat=unitPrice(m)*v.areaUsed, eng=v.engrave*state.settings.laserEngrave, cut=v.cut*state.settings.laserCut, labor=v.laborMin/60*state.settings.labor;
    const base=mat+eng+cut+labor+v.extras+state.settings.packaging+v.other;
    return [['Materialkosten',mat],['Gravurkosten',eng],['Schnittkosten',cut],['Arbeitskosten',labor],['Verpackung',state.settings.packaging],['Gesamtkosten',base*(1+state.settings.waste/100)],['Gewinn',base*(1+state.settings.waste/100)*state.settings.profit/100],['END',finalPrice(base,state.settings.profit,state.settings.waste,v.qty)]];
  }},
  vinyl:{title:'Vinylfolie',area:'Vinyl',secondArea:'Übertragung',fields:[
    ['material','Vinylfolie','select'],['areaUsed','Vinylfläche (cm²)','number',400],['transfer','Übertragungsfolie','select2'],['transferArea','Fläche Übertragungsfolie (cm²)','number',400],
    ['plot','Plottdauer (Min.)','number',5],['weed','Entgitterzeit (Min.)','number',15],['mount','Montagezeit (Min.)','number',10],['other','Sonstige Kosten (€)','number',0],['qty','Stückzahl','number',1]
  ],calc:v=>{
    const m=state.materials.find(x=>x.id===v.material),t=state.materials.find(x=>x.id===v.transfer);
    const mat=unitPrice(m)*v.areaUsed, trans=unitPrice(t)*v.transferArea, machine=v.plot*state.settings.plotter, labor=(v.weed+v.mount)/60*state.settings.labor;
    const base=mat+trans+machine+labor+state.settings.packaging+v.other;
    return [['Vinylkosten',mat],['Übertragungsfolie',trans],['Plotterkosten',machine],['Arbeitskosten',labor],['Verpackung',state.settings.packaging],['Gesamtkosten',base*(1+state.settings.waste/100)],['Gewinn',base*(1+state.settings.waste/100)*state.settings.profit/100],['END',finalPrice(base,state.settings.profit,state.settings.waste,v.qty)]];
  }},
  textil:{title:'Textilfolie',area:'Textil',fields:[
    ['material','Textilfolie','select'],['textile','Textilpreis pro Stück (€)','number',5],['areaUsed','Folienfläche je Farbe/Stück (cm²)','number',400],
    ['colors','Anzahl Farben','number',1],['plot','Plottdauer je Stück (Min.)','number',5],['weed','Entgitterzeit je Stück (Min.)','number',15],
    ['pressMin','Presszeit je Stück (Min.)','number',3],['prep','Vor-/Nachbereitung je Stück (Min.)','number',10],['qty','Stückzahl','number',1]
  ],calc:v=>{
    const m=state.materials.find(x=>x.id===v.material),q=Math.max(v.qty,1);
    const textile=v.textile*q, foil=unitPrice(m)*v.areaUsed*v.colors*q, plot=v.plot*state.settings.plotter*q, press=v.pressMin*state.settings.press*q, labor=(v.weed+v.prep)/60*state.settings.labor*q;
    const base=textile+foil+plot+press+labor+state.settings.packaging;
    return [['Textilien',textile],['Folienkosten',foil],['Plotterkosten',plot],['Pressenkosten',press],['Arbeitskosten',labor],['Verpackung',state.settings.packaging],['Gesamtkosten',base*(1+state.settings.waste/100)],['Gewinn',base*(1+state.settings.waste/100)*state.settings.profit/100],['END',finalPrice(base,state.settings.profit,state.settings.waste,q)]];
  }}
};
const calcState={};
function renderCalculator(id){
  const d=calcDefs[id],el=document.getElementById(id);
  calcState[id]=calcState[id]||{};
  let html=`<div class="section-head"><div><div class="eyebrow">Kalkulation</div><h2>${d.title}</h2></div></div><div class="card calc-grid">`;
  d.fields.forEach(([key,label,type,def])=>{
    if(calcState[id][key]===undefined) calcState[id][key]=type.startsWith('select')?'':def;
    if(type==='select'||type==='select2'){
      const area=type==='select2'?d.secondArea:d.area, mats=byArea(area);
      if(!calcState[id][key]&&mats[0]) calcState[id][key]=mats[0].id;
      html+=`<div class="field"><label>${label}</label><select data-key="${key}">${mats.map(m=>`<option value="${m.id}" ${calcState[id][key]===m.id?'selected':''}>${m.name}</option>`).join('')}</select></div>`;
    }else html+=`<div class="field"><label>${label}</label><input data-key="${key}" type="number" step="0.01" value="${calcState[id][key]??''}"></div>`;
  });
  html+=`</div><div class="card"><h3>Ergebnis</h3><div class="result-grid" id="${id}Results"></div></div>`;
  el.innerHTML=html;
  el.querySelectorAll('[data-key]').forEach(inp=>inp.oninput=()=>{calcState[id][inp.dataset.key]=inp.tagName==='SELECT'?inp.value:num(inp.value);updateResults(id);});
  updateResults(id);
}
function updateResults(id){
  const box=document.getElementById(id+'Results'); if(!box)return;
  const rows=calcDefs[id].calc(calcState[id]);
  box.innerHTML=rows.map(([k,v])=>k==='END'?`<div class="final-price">Verkaufspreis je Stück<br>${euro(v)}</div>`:`<div>${k}</div><div>${euro(v)}</div>`).join('');
}
const settingLabels={profit:'Gewinnaufschlag (%)',labor:'Eigener Stundenlohn (€/Std.)',printMachine:'3D-Druck Maschine (€/Std.)',laserEngrave:'Laser Gravur (€/Min.)',laserCut:'Laser Schnitt (€/Min.)',plotter:'Plotter (€/Min.)',press:'Transferpresse (€/Min.)',waste:'Fehlerreserve (%)',packaging:'Standard-Verpackung (€)',rounding:'Preisrundung (€)',psychological:'Endpreis-Abzug (€)'};
function renderSettings(){
  const el=document.getElementById('settingsForm');
  el.innerHTML=Object.entries(settingLabels).map(([k,l])=>`<div class="field"><label>${l}</label><input type="number" step="0.01" data-setting="${k}" value="${state.settings[k]}"></div>`).join('');
  el.querySelectorAll('[data-setting]').forEach(i=>i.oninput=()=>{state.settings[i.dataset.setting]=num(i.value);save();Object.keys(calcDefs).forEach(updateResults);});
}
function renderAll(){renderMaterials();renderSettings();Object.keys(calcDefs).forEach(renderCalculator);}
document.getElementById('exportBtn').onclick=()=>{
  const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='daniels-laser-art-kalkulation-sicherung.json';a.click();URL.revokeObjectURL(a.href);
};
document.getElementById('importFile').onchange=async e=>{
  try{const data=JSON.parse(await e.target.files[0].text());state=data;save();renderAll();alert('Sicherung wurde geladen.');}catch{alert('Die Datei konnte nicht gelesen werden.');}
};
document.getElementById('resetBtn').onclick=()=>{if(confirm('Wirklich alles zurücksetzen?')){state=structuredClone(DEFAULTS);save();renderAll();}};
renderAll();
if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
