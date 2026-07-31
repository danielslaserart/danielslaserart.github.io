import { $, esc, num, uid } from "./utils.js";
import { state, save, normalizeProcessingProfile } from "./storage.js";
import { appAlert, appConfirm } from "./dialogs.js";

const PROCESS_LABELS={
  vectorEngraving:"Vektorgravur",imageEngraving:"Bildgravur",areaEngraving:"Flächengravur",
  lineEngraving:"Liniengravur",marking:"Markieren",cutting:"Schneiden",perforating:"Perforieren",
  printing3d:"3D-Druck",plotting:"Plotten",other:"Sonstiges"
};
const SOURCE_LABELS={diode:"Diode",ir:"IR",blue:"Blau",co2:"CO₂",printHead:"Druckkopf",knife:"Messer",pen:"Stift",other:"Sonstiges"};
const STATUS_LABELS={untested:"Ungetestet",testing:"Testprofil",proven:"Erprobt",preferred:"Bevorzugt",obsolete:"Veraltet"};
const FIELD_IDS=["speed","speedUnit","powerPercent","passes","dpi","lineInterval","dotDuration","pulseDuration","frequency","airAssist","airAssistValue","bidirectional","fillMethod","rasterMethod","scanAngle","focusDistance","focusNote","zOffset","materialThicknessMm","layers","interval","printTemperature","bedTemperature","feedRate"];
let editingId="";
let originalScope="";
let contextMaterialId="";

function familyForMaterialId(materialId){
  return state.materials.find(m=>m.id===materialId||(m.variants||[]).some(v=>v.id===materialId))||null;
}
function materialLabel(materialId){
  const family=familyForMaterialId(materialId);
  if(!family)return "Unbekanntes Material";
  if(family.id===materialId)return family.name;
  const variant=(family.variants||[]).find(v=>v.id===materialId);
  return `${family.name} – ${variant?.name||"Variante"}`;
}
function familyLabel(familyId){return state.materials.find(m=>m.id===familyId)?.name||"Unbekannte Familie";}
function machineLabel(machineId){return state.machines.find(m=>m.id===machineId)?.name||"Unbekannte Maschine"}
function machineSources(machine){
  const configured=Array.isArray(machine?.supportedSources)?machine.supportedSources.filter(Boolean):[];
  if(configured.length)return configured;
  const text=`${machine?.id||""} ${machine?.name||""}`.toLowerCase();
  if(machine?.type==="3d")return ["printHead"];
  if(text.includes("f2")&&text.includes("ir"))return ["ir"];
  if(text.includes("f2")&&(text.includes("diode")||text.includes("blau")))return ["blue"];
  if(text.includes("f2"))return ["ir","blue"];
  if(machine?.type==="laser")return ["diode"];
  return ["other"];
}
function combinationKey(profile){
  return [profile.scope,profile.scope==="material"?profile.materialId:profile.familyId,profile.machineId,profile.laserSource,profile.processType,profile.settings?.materialThicknessMm??""].join("|");
}
function technicalKey(profile){
  return [profile.machineId,profile.laserSource,profile.processType,profile.settings?.materialThicknessMm??""].join("|");
}
function isComplete(profile){
  return Boolean(profile?.id&&profile.name&&profile.familyId&&profile.machineId&&profile.processType&&(profile.scope==="family"||profile.materialId));
}
function compactSettings(profile){
  const s=profile.settings||{},parts=[];
  if(s.speed!==null&&s.speed!==undefined)parts.push(`${s.speed.toLocaleString("de-DE")} ${s.speedUnit||"mm/min"}`);
  if(s.dotDuration!==null&&s.dotDuration!==undefined)parts.push(`Punktdauer ${s.dotDuration.toLocaleString("de-DE")}`);
  if(s.powerPercent!==null&&s.powerPercent!==undefined)parts.push(`${s.powerPercent.toLocaleString("de-DE")} %`);
  if(s.dpi!==null&&s.dpi!==undefined)parts.push(`${s.dpi.toLocaleString("de-DE")} DPI`);
  if(s.passes!==null&&s.passes!==undefined)parts.push(`${s.passes} ${s.passes===1?"Durchgang":"Durchgänge"}`);
  return parts.slice(0,5).join(" · ")||"Keine technischen Werte hinterlegt";
}
function fullSettings(profile){
  const s=profile.settings||{},rows=[];
  const add=(label,value,unit="")=>{if(value!==null&&value!==undefined&&value!=="")rows.push(`<div><span>${label}</span><strong>${esc(value)}${unit}</strong></div>`)};
  add("Geschwindigkeit",s.speed,s.speed!==null?` ${s.speedUnit||"mm/min"}`:"");
  add("Leistung",s.powerPercent,s.powerPercent!==null?" %":"");add("Punktdauer",s.dotDuration);add("DPI",s.dpi);
  add("Durchgänge",s.passes);add("Linienabstand",s.lineInterval);add("Pulsdauer",s.pulseDuration);add("Frequenz",s.frequency);
  add("Luftunterstützung",s.airAssist===true?"An":s.airAssist===false?"Aus":"");add("Luft-Wert",s.airAssistValue);
  add("Bidirektional",s.bidirectional===true?"Ja":s.bidirectional===false?"Nein":"");add("Füllmethode",s.fillMethod);
  add("Rasterverfahren",s.rasterMethod);add("Scanwinkel",s.scanAngle,s.scanAngle!==null?"°":"");
  add("Materialstärke",s.materialThicknessMm,s.materialThicknessMm!==null?" mm":"");add("Fokusabstand",s.focusDistance,s.focusDistance!==null?" mm":"");
  add("Fokus-Hinweis",s.focusNote);add("Z-Offset",s.zOffset,s.zOffset!==null?" mm":"");add("Ebenen",s.layers);
  add("Intervall",s.interval);add("Drucktemperatur",s.printTemperature,s.printTemperature!==null?" °C":"");
  add("Betttemperatur",s.bedTemperature,s.bedTemperature!==null?" °C":"");add("Vorschub",s.feedRate);
  return rows.join("")||"<div><span>Technische Werte</span><strong>Keine Angaben</strong></div>";
}
function sorted(profiles){
  return [...profiles].sort((a,b)=>(b.isDefault-a.isDefault)||((a.scope==="material"?0:1)-(b.scope==="material"?0:1))||a.name.localeCompare(b.name,"de"));
}

export function effectiveProfiles(materialId,{machineId="",laserSource="",processType=""}={}){
  if(!materialId)return [];
  const family=familyForMaterialId(materialId);if(!family)return [];
  const material=state.processingProfiles.filter(p=>isComplete(p)&&p.scope==="material"&&p.materialId===materialId);
  const inherited=state.processingProfiles.filter(p=>isComplete(p)&&p.scope==="family"&&p.familyId===family.id);
  const ownKeys=new Set(material.map(technicalKey));
  const combined=[...material,...inherited.filter(p=>!ownKeys.has(technicalKey(p)))];
  return sorted(combined.filter(p=>(!machineId||p.machineId===machineId)&&(!laserSource||p.laserSource===laserSource)&&(!processType||p.processType===processType)));
}
export function processTypeFromCalculator(){
  const explicit=$("profileProcessType")?.value;if(explicit)return explicit;
  const customer=$("customerObjectProcess")?.value;
  if(customer==="cut")return "cutting";
  if(customer==="engrave")return "vectorEngraving";
  return "";
}
export function processTypeFromMotif(){
  const process=document.querySelector('input[name="mcProcess"]:checked')?.value;
  if(process==="cut")return "cutting";
  if(process==="engrave")return $("mcProfileProcessType")?.value||"imageEngraving";
  return "";
}

function profileCard(profile,{inherited=false,materialId="",editable=true}={}){
  return `<article class="processing-profile-card${profile.isDefault?" is-default":""}">
    <div class="processing-profile-card-head"><div><h4>${esc(profile.name)}</h4><p>${inherited?`Geerbt aus Familie ${esc(familyLabel(profile.familyId))}`:profile.scope==="family"?`Familienprofil: ${esc(familyLabel(profile.familyId))}`:`Materialprofil: ${esc(materialLabel(profile.materialId))}`}</p></div>${profile.isDefault?'<span class="profile-badge default">Standard</span>':""}</div>
    <div class="profile-tags"><span>${esc(machineLabel(profile.machineId))}</span><span>${esc(SOURCE_LABELS[profile.laserSource]||profile.laserSource||"–")}</span><span>${esc(PROCESS_LABELS[profile.processType]||profile.processType)}</span><span>${esc(STATUS_LABELS[profile.status]||profile.status)}</span>${profile.rating?`<span>${"★".repeat(profile.rating)}</span>`:""}</div>
    <p class="profile-settings-summary">${esc(compactSettings(profile))}</p>
    <details><summary>Alle Einstellungen</summary><div class="profile-detail-grid">${fullSettings(profile)}</div>${profile.notes?`<p class="profile-notes">${esc(profile.notes)}</p>`:""}</details>
    <div class="profile-actions"><button type="button" class="ghost small" data-profile-view="${profile.id}">Ansehen</button>${editable?`<button type="button" class="ghost small" data-profile-edit="${profile.id}">Bearbeiten</button><button type="button" class="ghost small" data-profile-duplicate="${profile.id}">Duplizieren</button>${!profile.isDefault?`<button type="button" class="ghost small" data-profile-default="${profile.id}">Als Standard</button>`:""}<button type="button" class="danger small" data-profile-delete="${profile.id}">Löschen</button>`:inherited?`<button type="button" class="secondary small" data-profile-adopt="${profile.id}" data-profile-material="${materialId}">Als eigenes Profil übernehmen</button>`:""}</div>
  </article>`;
}
function bindProfileActions(root=document){
  root.querySelectorAll("[data-profile-view]").forEach(b=>b.onclick=()=>viewProfile(b.dataset.profileView));
  root.querySelectorAll("[data-profile-edit]").forEach(b=>b.onclick=()=>openProfileDialog({profileId:b.dataset.profileEdit}));
  root.querySelectorAll("[data-profile-duplicate]").forEach(b=>b.onclick=()=>duplicateProfile(b.dataset.profileDuplicate));
  root.querySelectorAll("[data-profile-default]").forEach(b=>b.onclick=()=>setDefaultProfile(b.dataset.profileDefault));
  root.querySelectorAll("[data-profile-delete]").forEach(b=>b.onclick=()=>deleteProfile(b.dataset.profileDelete));
  root.querySelectorAll("[data-profile-adopt]").forEach(b=>b.onclick=()=>adoptProfile(b.dataset.profileAdopt,b.dataset.profileMaterial));
  root.querySelectorAll("[data-add-profile]").forEach(b=>b.onclick=()=>openProfileDialog({materialId:b.dataset.addProfile||""}));
}

export function renderMaterialProfileSections(root=document){
  root.querySelectorAll("[data-material-profile-section]").forEach(box=>{
    const materialId=box.dataset.materialProfileSection;
    const family=familyForMaterialId(materialId);if(!family)return;
    const isFamily=family.id===materialId&&(family.variants||[]).length>0;
    const own=state.processingProfiles.filter(p=>p.scope==="material"&&p.materialId===materialId);
    const inherited=state.processingProfiles.filter(p=>p.scope==="family"&&p.familyId===family.id);
    const ownCount=own.length,familyCount=inherited.length;
    if(isFamily){
      box.innerHTML=familyCount?`<span class="profile-availability">✓ ${familyCount} ${familyCount===1?"Familienprofil":"Familienprofile"} vorhanden</span>`:"";
    }else{
      const notices=[];
      if(ownCount)notices.push(`<span class="profile-availability">✓ ${ownCount} ${ownCount===1?"Bearbeitungsprofil":"Bearbeitungsprofile"} vorhanden</span>`);
      if(familyCount)notices.push(`<span class="profile-availability inherited">✓ ${familyCount} ${familyCount===1?"Familienprofil":"Familienprofile"} vorhanden</span>`);
      box.innerHTML=notices.join("");
    }
    box.classList.toggle("is-empty",!box.innerHTML);
  });
}

function profileMatchesFilters(profile){
  const q=($("profileSearch")?.value||"").trim().toLowerCase();
  const values={
    familyId:$("profileFilterFamily")?.value||"",materialId:$("profileFilterMaterial")?.value||"",
    machineId:$("profileFilterMachine")?.value||"",laserSource:$("profileFilterSource")?.value||"",
    processType:$("profileFilterProcess")?.value||"",scope:$("profileFilterScope")?.value||"",status:$("profileFilterStatus")?.value||""
  };
  if(Object.entries(values).some(([key,value])=>value&&profile[key]!==value))return false;
  if(!q)return true;
  return [profile.name,profile.notes,machineLabel(profile.machineId),familyLabel(profile.familyId),materialLabel(profile.materialId)].join(" ").toLowerCase().includes(q);
}
function option(value,label,selected=""){return `<option value="${esc(value)}"${value===selected?" selected":""}>${esc(label)}</option>`}
function familyOptions(selected=""){return `<option value="">Materialfamilie wählen</option>`+state.materials.map(m=>option(m.id,m.name,selected)).join("")}
function materialOptions(selected="",familyId=""){
  const rows=[];
  state.materials.filter(m=>!familyId||m.id===familyId).forEach(m=>{
    if((m.variants||[]).length)(m.variants||[]).forEach(v=>rows.push({id:v.id,name:`${m.name} – ${v.name}`}));
    else rows.push({id:m.id,name:m.name});
  });
  return `<option value="">Konkretes Material wählen</option>`+rows.map(m=>option(m.id,m.name,selected)).join("");
}
function machineOptions(selected=""){return `<option value="">Maschine wählen</option>`+state.machines.filter(m=>m.active!==false).map(m=>option(m.id,m.name,selected)).join("")}
function populateFilters(){
  const preserve=id=>$(id)?.value||"";
  const old={family:preserve("profileFilterFamily"),material:preserve("profileFilterMaterial"),machine:preserve("profileFilterMachine")};
  if($("profileFilterFamily"))$("profileFilterFamily").innerHTML='<option value="">Alle Familien</option>'+state.materials.map(m=>option(m.id,m.name,old.family)).join("");
  if($("profileFilterMaterial"))$("profileFilterMaterial").innerHTML='<option value="">Alle Materialien</option>'+materialOptions(old.material).replace('<option value="">Konkretes Material wählen</option>',"");
  if($("profileFilterMachine"))$("profileFilterMachine").innerHTML='<option value="">Alle Maschinen</option>'+state.machines.map(m=>option(m.id,m.name,old.machine)).join("");
}
export function renderProcessingProfileManager(){
  const list=$("processingProfileList");if(!list)return;
  populateFilters();
  const incomplete=state.processingProfiles.filter(p=>!isComplete(p)).length;
  const profiles=state.processingProfiles.filter(p=>isComplete(p)&&profileMatchesFilters(p));
  list.innerHTML=(incomplete?`<div class="profile-incomplete-warning">${incomplete} unvollständige${incomplete===1?"s Profil wurde":" Profile wurden"} sicher übersprungen.</div>`:"")+
    (profiles.length?sorted(profiles).map(p=>profileCard(p)).join(""):'<div class="empty-state">Keine passenden Bearbeitungsprofile vorhanden.</div>');
  bindProfileActions(list);
}

function fieldVisible(name,source,process,machine){
  if(name==="passes"||name==="materialThicknessMm")return true;
  if(name==="powerPercent"||name==="focusNote")return ["ir","diode","blue","co2"].includes(source);
  if(source==="ir")return ["dotDuration","dpi","fillMethod","bidirectional","pulseDuration","frequency","scanAngle"].includes(name);
  if(source==="printHead")return ["layers","printTemperature","bedTemperature","feedRate","zOffset"].includes(name);
  if(["knife","pen"].includes(source))return ["speed","speedUnit","passes","feedRate"].includes(name);
  if(["diode","blue","co2"].includes(source)){
    if(["speed","speedUnit","airAssist","airAssistValue","scanAngle","focusDistance"].includes(name))return true;
    if(["imageEngraving","areaEngraving"].includes(process))return ["dpi","lineInterval","bidirectional","fillMethod","rasterMethod"].includes(name);
  }
  return false;
}
function updateAssignmentFields(){
  const scope=$("profileScope").value;
  $("profileFamilyField").classList.toggle("hidden",scope!=="family");
  $("profileMaterialField").classList.toggle("hidden",scope!=="material");
  $("profileFamily").required=scope==="family";$("profileMaterial").required=scope==="material";
  if(scope==="material"){
    const family=familyForMaterialId($("profileMaterial").value);
    $("profileFamilyInfo").textContent=family?`Familie: ${family.name}`:"";
  }
}
function updateSourceOptions(){
  const machine=state.machines.find(m=>m.id===$("profileMachine").value);
  const old=$("profileSource").value,sources=machineSources(machine);
  $("profileSource").innerHTML='<option value="">Quelle / Werkzeug wählen</option>'+sources.map(s=>option(s,SOURCE_LABELS[s]||s,old)).join("");
  if(!sources.includes(old))$("profileSource").value=sources.length===1?sources[0]:"";
  updateTechnicalFields();
}
function updateTechnicalFields(){
  const source=$("profileSource").value,process=$("profileProcess").value,machine=state.machines.find(m=>m.id===$("profileMachine").value);
  FIELD_IDS.forEach(name=>{
    const field=document.querySelector(`[data-profile-setting="${name}"]`);
    if(!field)return;
    const visible=fieldVisible(name,source,process,machine);
    field.classList.toggle("hidden",!visible);
    field.querySelectorAll("input,select,textarea").forEach(control=>{control.disabled=!visible;if(!visible){if(control.type==="checkbox")control.checked=false;else control.value=""}});
  });
}
function setFormValue(id,value){const el=$(id);if(!el)return;if(el.type==="checkbox")el.checked=value===true;else el.value=value??""}
function fillProfileForm(profile=null,materialId=""){
  const family=familyForMaterialId(materialId);
  const contextIsFamily=family?.id===materialId&&(family?.variants||[]).length>0;
  editingId=profile?.id||"";originalScope=profile?.scope||"";contextMaterialId=materialId||profile?.materialId||"";
  $("profileDialogTitle").textContent=profile?"Bearbeitungsprofil bearbeiten":"Bearbeitungsprofil hinzufügen";
  setFormValue("profileName",profile?.name||"");setFormValue("profileScope",profile?.scope||(materialId&&!contextIsFamily?"material":"family"));
  $("profileFamily").innerHTML=familyOptions(profile?.familyId||family?.id||"");
  $("profileMaterial").innerHTML=materialOptions(profile?.materialId||materialId||"",profile?.familyId||family?.id||"");
  setFormValue("profileFamily",profile?.familyId||family?.id||"");setFormValue("profileMaterial",profile?.materialId||materialId||"");
  $("profileMachine").innerHTML=machineOptions(profile?.machineId||"");setFormValue("profileMachine",profile?.machineId||"");
  setFormValue("profileProcess",profile?.processType||"");setFormValue("profileStatus",profile?.status||"untested");
  setFormValue("profileRating",profile?.rating??"");setFormValue("profileDefault",profile?.isDefault||false);setFormValue("profileNotes",profile?.notes||"");
  FIELD_IDS.forEach(name=>setFormValue(`profileSetting-${name}`,profile?.settings?.[name]??(name==="passes"?1:"")));
  updateAssignmentFields();updateSourceOptions();setFormValue("profileSource",profile?.laserSource||$("profileSource").value);updateTechnicalFields();
}
export function openProfileDialog({profileId="",materialId=""}={}){
  const profile=state.processingProfiles.find(p=>p.id===profileId)||null;
  fillProfileForm(profile,materialId);$("processingProfileDialog").showModal();
}
function collectSetting(name){
  const el=$(`profileSetting-${name}`);if(!el||el.disabled)return null;
  if(name==="airAssist")return el.value===""?null:el.value==="true";
  if(el.type==="checkbox")return el.checked;
  if(el.type==="number")return el.value===""?null:num(el.value);
  return el.value||"";
}
function validateProfile(profile){
  if(!profile.name)return "Bitte einen Profilnamen eingeben.";
  if(profile.scope==="family"&&!profile.familyId)return "Bitte eine Materialfamilie auswählen.";
  if(profile.scope==="material"&&!profile.materialId)return "Bitte ein konkretes Material auswählen.";
  if(!profile.machineId)return "Bitte eine Maschine auswählen.";
  if(!profile.laserSource)return "Bitte eine Laserquelle oder ein Werkzeug auswählen.";
  if(!profile.processType)return "Bitte eine Bearbeitungsart auswählen.";
  const s=profile.settings;
  if(s.powerPercent!==null&&(s.powerPercent<0||s.powerPercent>100))return "Die Leistung muss zwischen 0 und 100 % liegen.";
  if(s.speed!==null&&s.speed<0)return "Die Geschwindigkeit darf nicht negativ sein.";
  if(s.dotDuration!==null&&s.dotDuration<0)return "Die Punktdauer darf nicht negativ sein.";
  if(s.dpi!==null&&s.dpi<=0)return "DPI muss größer als 0 sein.";
  if(s.lineInterval!==null&&s.lineInterval<=0)return "Der Linienabstand muss größer als 0 sein.";
  if(s.materialThicknessMm!==null&&s.materialThicknessMm<0)return "Die Materialstärke darf nicht negativ sein.";
  if(s.frequency!==null&&s.frequency<0)return "Die Frequenz darf nicht negativ sein.";
  if(s.scanAngle!==null&&(s.scanAngle<-360||s.scanAngle>360))return "Der Winkel muss zwischen -360° und 360° liegen.";
  if(s.passes!==null&&s.passes<1)return "Durchgänge müssen mindestens 1 sein.";
  return "";
}
function enforceDefault(profile){
  if(!profile.isDefault)return;
  const key=combinationKey(profile);
  state.processingProfiles.forEach(p=>{if(p.id!==profile.id&&combinationKey(p)===key)p.isDefault=false});
}
async function saveProfileFromForm(event){
  event.preventDefault();
  const materialId=$("profileScope").value==="material"?$("profileMaterial").value:"";
  const family=familyForMaterialId(materialId);
  const existing=state.processingProfiles.find(p=>p.id===editingId);
  const now=new Date().toISOString();
  const raw={
    id:editingId||uid(),scope:$("profileScope").value,familyId:$("profileScope").value==="material"?family?.id||"":$("profileFamily").value,
    materialId:$("profileScope").value==="material"?materialId:null,name:$("profileName").value.trim(),machineId:$("profileMachine").value,
    laserSource:$("profileSource").value,processType:$("profileProcess").value,
    settings:Object.fromEntries(FIELD_IDS.map(name=>[name,collectSetting(name)])),
    isDefault:$("profileDefault").checked,status:$("profileStatus").value,rating:$("profileRating").value,notes:$("profileNotes").value.trim(),
    createdAt:existing?.createdAt||now,updatedAt:now
  };
  const profile=normalizeProcessingProfile(raw),error=validateProfile(profile);
  if(error){await appAlert(error);return}
  if(existing&&originalScope&&originalScope!==profile.scope&&!await appConfirm("Die Gültigkeit dieses Profils wird geändert. Fortfahren?","Gültigkeit ändern","Fortfahren"))return;
  const index=state.processingProfiles.findIndex(p=>p.id===profile.id);
  if(index>=0)state.processingProfiles[index]=profile;else state.processingProfiles.unshift(profile);
  enforceDefault(profile);save();$("processingProfileDialog").close();renderEverywhere();
}
async function deleteProfile(id){
  if(!await appConfirm("Bearbeitungsprofil wirklich löschen?","Profil löschen","Löschen"))return;
  state.processingProfiles=state.processingProfiles.filter(p=>p.id!==id);save();renderEverywhere();
}
function duplicateProfile(id){
  const source=state.processingProfiles.find(p=>p.id===id);if(!source)return;
  const now=new Date().toISOString(),copy=normalizeProcessingProfile({...structuredClone(source),id:uid(),name:`${source.name} – Kopie`,isDefault:false,createdAt:now,updatedAt:now});
  state.processingProfiles.unshift(copy);save();renderEverywhere();openProfileDialog({profileId:copy.id});
}
function adoptProfile(id,materialId){
  const source=state.processingProfiles.find(p=>p.id===id);if(!source)return;
  const now=new Date().toISOString(),copy=normalizeProcessingProfile({...structuredClone(source),id:uid(),scope:"material",materialId,familyId:source.familyId,name:`${source.name} – eigenes Profil`,isDefault:false,createdAt:now,updatedAt:now});
  state.processingProfiles.unshift(copy);save();renderEverywhere();openProfileDialog({profileId:copy.id});
}
function setDefaultProfile(id){
  const profile=state.processingProfiles.find(p=>p.id===id);if(!profile)return;
  profile.isDefault=true;profile.updatedAt=new Date().toISOString();enforceDefault(profile);save();renderEverywhere();
}
async function viewProfile(id){
  const p=state.processingProfiles.find(x=>x.id===id);if(!p)return;
  await appAlert(`${p.name}\n\n${p.scope==="family"?`Familie: ${familyLabel(p.familyId)}`:`Material: ${materialLabel(p.materialId)}`}\n${machineLabel(p.machineId)} · ${SOURCE_LABELS[p.laserSource]||p.laserSource} · ${PROCESS_LABELS[p.processType]||p.processType}\n\n${compactSettings(p)}${p.notes?`\n\nNotizen:\n${p.notes}`:""}`, "Bearbeitungsprofil");
}
function renderEverywhere(){
  renderProcessingProfileManager();renderMaterialProfileSections();renderCalculatorProfiles();renderMotifProfiles();
}

function recommendationMarkup(profiles,materialId){
  if(!materialId)return '<p class="profile-empty-hint">Material, Maschine und Bearbeitungsart auswählen, um passende Einstellungen anzuzeigen.</p>';
  if(!profiles.length)return '<p class="profile-empty-hint">Keine passenden Bearbeitungsprofile vorhanden.</p>';
  return `<div class="profile-recommendation-list">${profiles.map(p=>`<div class="profile-recommendation${p.isDefault?" is-default":""}"><div><b>${esc(p.name)}</b><small>${p.scope==="material"?"Eigenes Profil für dieses Material":`Geerbt aus Materialfamilie ${esc(familyLabel(p.familyId))}`}</small></div><span>${esc(compactSettings(p))}</span></div>`).join("")}</div>`;
}
export function renderCalculatorProfiles(){
  const box=$("calculatorProcessingProfiles");if(!box)return;
  const materialId=$("matMain")?.value||"",machineId=$("machineSelect")?.value||"",processType=processTypeFromCalculator(),laserSource=$("calculatorProfileSource")?.value||"";
  box.innerHTML=recommendationMarkup(effectiveProfiles(materialId,{machineId,laserSource,processType}),materialId);
}
export function renderMotifProfiles(){
  const box=$("motifProcessingProfiles");if(!box)return;
  const materialId=$("mcMaterial")?.value||"",machineId=$("mcMachine")?.value||"",processType=processTypeFromMotif(),laserSource=$("mcProfileSource")?.value||"";
  box.innerHTML=recommendationMarkup(effectiveProfiles(materialId,{machineId,laserSource,processType}),materialId);
}

export function initializeProcessingProfiles(){
  if(!$("processingProfileDialog"))return;
  $("newProcessingProfileBtn")?.addEventListener("click",()=>openProfileDialog());
  $("processingProfileForm").addEventListener("submit",saveProfileFromForm);
  $("profileScope").addEventListener("change",updateAssignmentFields);
  $("profileMaterial").addEventListener("change",updateAssignmentFields);
  $("profileFamily").addEventListener("change",()=>{$("profileMaterial").innerHTML=materialOptions("",$("profileFamily").value)});
  $("profileMachine").addEventListener("change",updateSourceOptions);
  $("profileSource").addEventListener("change",updateTechnicalFields);
  $("profileProcess").addEventListener("change",updateTechnicalFields);
  $("processingProfileDialog").querySelectorAll("[data-close-profile-dialog]").forEach(button=>button.addEventListener("click",()=>$("processingProfileDialog").close()));
  ["profileSearch","profileFilterFamily","profileFilterMaterial","profileFilterMachine","profileFilterSource","profileFilterProcess","profileFilterScope","profileFilterStatus"].forEach(id=>{
    $(id)?.addEventListener(id==="profileSearch"?"input":"change",renderProcessingProfileManager);
  });
  renderProcessingProfileManager();
}
