import { state } from "./storage.js?v=6.5";
import { resolveMaterialSelection } from "./materials.js?v=6.5";

const clamp=value=>Math.max(0,Number.isFinite(Number(value))?Number(value):0);
const processType=activity=>activity==="cut"?"cutting":activity==="engrave"?"vectorEngraving":"";

function selectionInfo(form){
  const raw=form.elements.managedMaterial?.value||"";
  const selection=resolveMaterialSelection(raw);
  const family=selection?.baseMaterial||state.materials?.find(m=>m.id===selection?.materialId)||selection||null;
  const familyId=family?.id||selection?.materialId||raw.split("::")[0]||"";
  const materialId=selection?.variantId||selection?.materialId||selection?.id||raw.split("::").pop()||"";
  const variant=family?.variants?.find(v=>v.id===materialId)||null;
  return {selection,family,variant,familyId,materialId};
}

function ratePerMinute(machine,activity){
  if(!machine)return 0;
  if(activity==="cut")return clamp(machine.cutRate)||clamp(machine.minuteRate)||clamp(machine.hourlyRate)/60||clamp(machine.hourlyCost)/60||clamp(machine.costPerHour)/60||clamp(machine.machineHourlyRate)/60;
  if(activity==="engrave")return clamp(machine.engraveRate)||clamp(machine.minuteRate)||clamp(machine.hourlyRate)/60||clamp(machine.hourlyCost)/60||clamp(machine.costPerHour)/60||clamp(machine.machineHourlyRate)/60;
  return clamp(machine.minuteRate)||clamp(machine.hourlyRate)/60||clamp(machine.hourlyCost)/60||clamp(machine.costPerHour)/60||clamp(machine.machineHourlyRate)/60;
}

function refreshCost(form){
  const machine=(state.machines||[]).find(m=>m.id===form.elements.machineId?.value);
  const minutes=clamp(form.elements.machineMinutes?.value);
  const rate=ratePerMinute(machine,form.elements.activity?.value);
  if(form.elements.machineCost)form.elements.machineCost.value=(rate*minutes).toFixed(2);
}

function collectProfiles(form){
  const {selection,family,variant}=selectionInfo(form);
  const sources=[
    state.processingProfiles,
    selection?.processingProfiles,selection?.profiles,selection?.allProfiles,selection?.ownProfiles,
    selection?.inheritedProfiles,selection?.inheritedFamilyProfiles,selection?.familyProfiles,selection?.profileSnapshots,
    variant?.processingProfiles,variant?.profiles,variant?.allProfiles,variant?.ownProfiles,
    variant?.inheritedProfiles,variant?.inheritedFamilyProfiles,variant?.familyProfiles,variant?.profileSnapshots,
    family?.processingProfiles,family?.profiles,family?.allProfiles,family?.ownProfiles,
    family?.inheritedProfiles,family?.inheritedFamilyProfiles,family?.familyProfiles,family?.profileSnapshots
  ].filter(Array.isArray).flat().filter(Boolean);
  const unique=new Map();
  sources.forEach((profile,index)=>{
    const id=String(profile.id||profile.profileId||profile.familyProfileId||profile.sourceProfileId||`embedded-${index}`);
    const key=[id,profile.name||"",profile.machineId||"",profile.processType||"",profile.materialId||"",profile.familyId||""].join("|");
    if(!unique.has(key))unique.set(key,{...profile,id});
  });
  return [...unique.values()].filter(p=>p.name&&p.status!=="obsolete");
}

function profileCandidates(form){
  const activity=form.elements.activity?.value;
  const machineId=form.elements.machineId?.value||"";
  const wantedProcess=processType(activity);
  const {familyId,materialId}=selectionInfo(form);
  const all=collectProfiles(form);

  const processMatches=p=>!wantedProcess||!p.processType||p.processType===wantedProcess;
  const machineMatches=p=>!machineId||!p.machineId||p.machineId===machineId;
  const materialMatches=p=>
    (p.scope==="material"&&(p.materialId===materialId||p.materialId===familyId))||
    (p.scope==="family"&&p.familyId===familyId)||
    (!p.scope&&(!p.materialId||p.materialId===materialId||p.materialId===familyId)&&(!p.familyId||p.familyId===familyId));

  const exact=all.filter(p=>processMatches(p)&&machineMatches(p)&&materialMatches(p));
  if(exact.length)return exact;
  const machineProcess=all.filter(p=>processMatches(p)&&machineMatches(p));
  if(machineProcess.length)return machineProcess;
  const processOnly=all.filter(processMatches);
  if(processOnly.length)return processOnly;
  return all;
}

function profileLabel(profile,form){
  const {familyId,materialId}=selectionInfo(form);
  const exact=(profile.scope==="material"&&(profile.materialId===materialId||profile.materialId===familyId))||(profile.scope==="family"&&profile.familyId===familyId)||(!profile.scope&&(!profile.materialId||profile.materialId===materialId||profile.materialId===familyId));
  const machine=form.elements.machineId?.value||"";
  const machineOk=!profile.machineId||!machine||profile.machineId===machine;
  const suffix=[];
  if(!exact)suffix.push("anderes Material");
  if(!machineOk)suffix.push("andere Maschine");
  return `${profile.name}${suffix.length?` · ${suffix.join(" / ")}`:""}`;
}

function refreshProfiles(form,keep=true){
  const label=form.querySelector("[data-position-profile]");
  if(!label)return;
  const activity=form.elements.activity?.value;
  if(!["cut","engrave"].includes(activity))return;
  let select=form.elements.profileId;
  const oldInput=form.elements.profileName;
  const previous=keep?(select?.value||oldInput?.dataset.profileId||""):"";
  if(!select){
    select=document.createElement("select");
    select.name="profileId";
    oldInput?.replaceWith(select);
  }
  const profiles=profileCandidates(form);
  select.innerHTML='<option value="">Profil auswählen …</option>'+profiles.map(p=>`<option value="${p.id}">${profileLabel(p,form)}</option>`).join("");
  if(previous&&profiles.some(p=>p.id===previous))select.value=previous;
  else {
    const preferred=profiles.find(p=>p.isDefault)||profiles.find(p=>p.status==="preferred")||profiles[0];
    if(preferred)select.value=preferred.id;
  }
  const syncName=()=>{select.dataset.profileName=profiles.find(p=>p.id===select.value)?.name||"";};
  select.onchange=syncName;
  syncName();
}

function enhance(form){
  if(form.dataset.profileFix66)return;
  form.dataset.profileFix66="1";
  refreshProfiles(form);
  const machine=form.elements.machineId;
  const material=form.elements.managedMaterial;
  const activity=form.elements.activity;
  const minutes=form.elements.machineMinutes;
  machine?.addEventListener("change",()=>{refreshProfiles(form,false);refreshCost(form)});
  material?.addEventListener("change",()=>refreshProfiles(form,false));
  activity?.addEventListener("change",()=>setTimeout(()=>{refreshProfiles(form,false);refreshCost(form)},0));
  minutes?.addEventListener("input",()=>refreshCost(form));
  form.addEventListener("submit",()=>{
    const select=form.elements.profileId;
    if(!select)return;
    let hidden=form.elements.profileName;
    if(!hidden){hidden=document.createElement("input");hidden.type="hidden";hidden.name="profileName";form.append(hidden);}
    hidden.value=select.dataset.profileName||select.options[select.selectedIndex]?.text||"";
  },true);
  refreshCost(form);
}

const observer=new MutationObserver(()=>{
  const form=document.getElementById("positionEditorForm");
  if(form)enhance(form);
});
observer.observe(document.documentElement,{childList:true,subtree:true});
