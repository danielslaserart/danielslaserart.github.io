import { state } from "./storage.js?v=6.5";
import { resolveMaterialSelection } from "./materials.js?v=6.5";
import { effectiveProfiles } from "./processing-profiles.js?v=6.5";

const clamp=value=>Math.max(0,Number.isFinite(Number(value))?Number(value):0);
const processType=activity=>activity==="cut"?"cutting":activity==="engrave"?"vectorEngraving":"";

function selectionInfo(form){
  const raw=form.elements.managedMaterial?.value||"";
  const selection=resolveMaterialSelection(raw);
  const familyId=selection?.baseMaterial?.id||selection?.materialId||selection?.id||raw.split("::")[0]||"";
  const materialId=selection?.variantId||selection?.materialId||selection?.id||raw.split("::").pop()||"";
  return {selection,familyId,materialId};
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

function profileCandidates(form){
  const activity=form.elements.activity?.value;
  const machineId=form.elements.machineId?.value||"";
  const wantedProcess=processType(activity);
  const {familyId,materialId}=selectionInfo(form);
  const strict=effectiveProfiles(materialId,{machineId,processType:wantedProcess});
  if(strict.length)return strict;

  const all=(state.processingProfiles||[]).filter(p=>p&&p.id&&p.name&&p.status!=="obsolete");
  const machineProcess=all.filter(p=>(!machineId||p.machineId===machineId)&&(!wantedProcess||p.processType===wantedProcess));
  const related=machineProcess.filter(p=>
    (p.scope==="material"&&(p.materialId===materialId||p.materialId===familyId))||
    (p.scope==="family"&&p.familyId===familyId)
  );
  if(related.length)return related;
  return machineProcess;
}

function profileLabel(profile,form){
  const {familyId,materialId}=selectionInfo(form);
  const exact=(profile.scope==="material"&&(profile.materialId===materialId||profile.materialId===familyId))||(profile.scope==="family"&&profile.familyId===familyId);
  const suffix=exact?"":" · anderes Material";
  return `${profile.name}${suffix}`;
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
